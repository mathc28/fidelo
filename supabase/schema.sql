-- ============================================================
-- SaaS Fidélité — Schéma multi-tenant (Supabase / Postgres)
-- ============================================================
-- Principe : merchants est la racine du tenant. Toute table porte
-- merchant_id (directement ou via sa parente) et le RLS cloisonne.
-- Les API routes Next.js utilisent la service_role key (bypass RLS) ;
-- le dashboard commerçant interroge avec le JWT Supabase Auth du
-- gérant, et ne voit que SES données grâce aux policies ci-dessous.
-- ============================================================

-- ------------------------------------------------------------
-- 1. MERCHANTS — racine du tenant + toute la config du programme
-- ------------------------------------------------------------
create table merchants (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),  -- compte Supabase Auth du gérant
  slug text unique not null,                          -- /m/[slug] — validé à l'onboarding
  name text not null,
  logo_url text,                                      -- Supabase Storage
  bg_color text not null default '#1c1c1e',           -- fond du pass
  label_color text not null default '#ffd65a',        -- accents du pass
  address text,
  lat double precision,                               -- géocodés à l'onboarding →
  lng double precision,                               --   champ locations du pass

  -- Programme de fidélité
  program_type text not null default 'visits'
    check (program_type in ('visits', 'points')),
  max_scans_per_day integer not null default 1,       -- garde-fou mode visits

  -- Wallet
  google_class_id text,                               -- loyaltyClass créée à l'onboarding

  -- Billing
  stripe_customer_id text,
  subscription_status text not null default 'trialing'
    check (subscription_status in ('trialing', 'active', 'past_due', 'canceled')),

  created_at timestamptz not null default now()
);

create unique index idx_merchants_owner on merchants(owner_id);
create index idx_merchants_slug on merchants(slug);

-- Slugs réservés (collision avec les routes de la plateforme)
alter table merchants add constraint slug_not_reserved
  check (slug not in ('admin','api','scan','app','www','m','compte','inscription'));

-- ------------------------------------------------------------
-- 2. CUSTOMERS — les cartes. Un client final = 1 ligne PAR commerce
-- ------------------------------------------------------------
create table customers (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants(id) on delete cascade,
  serial_number text unique not null,        -- globalement unique : c'est la clé du pass
  auth_token text not null,                  -- web service Apple
  first_name text not null,
  email text not null,
  phone text,
  points integer not null default 0,         -- solde caché (source de vérité : transactions)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),  -- alimente passesUpdatedSince (Apple)

  unique (merchant_id, email)                -- même email possible chez plusieurs commerces
);

create index idx_customers_merchant on customers(merchant_id);
create index idx_customers_updated on customers(merchant_id, updated_at);

-- ------------------------------------------------------------
-- 3. APPLE_REGISTRATIONS — devices iOS enregistrés pour les push
-- ------------------------------------------------------------
create table apple_registrations (
  id uuid primary key default gen_random_uuid(),
  serial_number text not null references customers(serial_number) on delete cascade,
  device_library_id text not null,
  push_token text not null,
  created_at timestamptz not null default now(),

  unique (device_library_id, serial_number)
);

create index idx_apple_reg_serial on apple_registrations(serial_number);

-- ------------------------------------------------------------
-- 4. DEVICES — téléphones/tablettes de caisse appairés
-- ------------------------------------------------------------
create table devices (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants(id) on delete cascade,
  label text not null default 'Caisse',      -- "Caisse 1", "Tablette bar"…
  token_hash text not null,                  -- sha256 du token scopé, jamais en clair
  last_seen_at timestamptz,
  revoked_at timestamptz,                    -- révocation à distance
  created_at timestamptz not null default now()
);

create index idx_devices_merchant on devices(merchant_id);

-- ------------------------------------------------------------
-- 5. REWARDS — paliers de récompense (plusieurs possibles)
-- ------------------------------------------------------------
create table rewards (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants(id) on delete cascade,
  label text not null,                       -- "-10 % sur votre achat"
  cost_points integer not null check (cost_points > 0),  -- 10 passages ou 100 points
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_rewards_merchant on rewards(merchant_id) where active;

-- ------------------------------------------------------------
-- 6. TRANSACTIONS — le journal. Source de vérité et d'audit.
-- ------------------------------------------------------------
create table transactions (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  device_id uuid references devices(id),     -- null si action depuis le dashboard
  reward_id uuid references rewards(id),     -- renseigné si type = 'redeem'
  type text not null check (type in ('earn', 'redeem', 'adjust')),
  delta integer not null,                    -- +1 passage, +12 pts, -100 pts…
  amount_euros numeric(10,2),                -- montant du ticket (mode points)
  created_at timestamptz not null default now()
);

create index idx_tx_customer on transactions(customer_id, created_at desc);
create index idx_tx_merchant_day on transactions(merchant_id, created_at desc);

-- ------------------------------------------------------------
-- 7. PROMOS — historique des push marketing
-- ------------------------------------------------------------
create table promos (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants(id) on delete cascade,
  title text,
  message text not null,
  apple_devices_notified integer not null default 0,
  sent_at timestamptz not null default now()
);

create index idx_promos_merchant on promos(merchant_id, sent_at desc);

-- ============================================================
-- FONCTIONS & TRIGGERS
-- ============================================================

-- Le solde customers.points est un cache dérivé du journal.
-- Chaque insertion dans transactions le met à jour atomiquement,
-- et bump updated_at (ce qui déclenchera le refresh du pass Apple).
create or replace function apply_transaction()
returns trigger language plpgsql as $$
begin
  update customers
  set points = points + new.delta,
      updated_at = now()
  where id = new.customer_id;

  -- Interdire un solde négatif (double-débit d'une récompense)
  if (select points from customers where id = new.customer_id) < 0 then
    raise exception 'Solde insuffisant';
  end if;

  return new;
end $$;

create trigger trg_apply_transaction
  after insert on transactions
  for each row execute function apply_transaction();

-- Garde-fou "1 passage par jour" (mode visits), appliqué en base
-- pour être infalsifiable quel que soit le client qui appelle l'API.
create or replace function check_daily_scan()
returns trigger language plpgsql as $$
declare
  scans_today integer;
  max_scans integer;
  ptype text;
begin
  if new.type <> 'earn' then return new; end if;

  select program_type, max_scans_per_day into ptype, max_scans
  from merchants where id = new.merchant_id;

  if ptype = 'visits' then
    select count(*) into scans_today
    from transactions
    where customer_id = new.customer_id
      and type = 'earn'
      and created_at >= date_trunc('day', now());

    if scans_today >= max_scans then
      raise exception 'Limite de passages atteinte pour aujourd''hui';
    end if;
  end if;

  return new;
end $$;

create trigger trg_check_daily_scan
  before insert on transactions
  for each row execute function check_daily_scan();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
-- Le dashboard commerçant interroge Supabase avec le JWT du gérant :
-- chaque policy vérifie que la ligne appartient à SON merchant.
-- Les API routes Next.js (service_role) bypassent le RLS — c'est
-- voulu : ce sont elles qui servent les clients finaux et la caisse.

alter table merchants enable row level security;
alter table customers enable row level security;
alter table apple_registrations enable row level security;
alter table devices enable row level security;
alter table rewards enable row level security;
alter table transactions enable row level security;
alter table promos enable row level security;

-- Helper : le merchant du gérant connecté
create or replace function my_merchant_id()
returns uuid language sql stable as $$
  select id from merchants where owner_id = auth.uid()
$$;

create policy merchant_own on merchants
  for all using (owner_id = auth.uid());

create policy customers_own on customers
  for select using (merchant_id = my_merchant_id());

create policy devices_own on devices
  for all using (merchant_id = my_merchant_id());

create policy rewards_own on rewards
  for all using (merchant_id = my_merchant_id());

create policy transactions_own on transactions
  for select using (merchant_id = my_merchant_id());

create policy promos_own on promos
  for select using (merchant_id = my_merchant_id());

-- Note : customers/transactions/promos en SELECT seulement côté
-- dashboard — les écritures (crédit, récompense, push) passent
-- toujours par les API routes, qui portent la logique métier
-- (triggers wallet, APNs, Google). apple_registrations n'a aucune
-- policy : uniquement manipulée par le web service Apple (service_role).

-- ------------------------------------------------------------
-- 8. PAIRING_CODES — appairage des appareils de caisse
-- ------------------------------------------------------------
create table pairing_codes (
  code text primary key,                     -- 6 chiffres
  merchant_id uuid not null references merchants(id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz
);

alter table pairing_codes enable row level security;
create policy pairing_own on pairing_codes
  for all using (merchant_id = my_merchant_id());

-- ------------------------------------------------------------
-- 9. RATE_LIMIT_HITS — anti brute-force sur les endpoints publics
--    (ex: code d'appairage caisse, inscription client). Voir lib/rateLimit.ts.
-- ------------------------------------------------------------
create table rate_limit_hits (
  id bigint generated always as identity primary key,
  bucket text not null,        -- ex: 'scan-pair', 'signup:<merchant_id>'
  ip text not null,
  created_at timestamptz not null default now()
);

create index idx_rate_limit_bucket_ip on rate_limit_hits(bucket, ip, created_at);

-- Jamais interrogée qu'en service_role (comme apple_registrations).
alter table rate_limit_hits enable row level security;
