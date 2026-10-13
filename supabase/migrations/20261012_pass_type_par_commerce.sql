-- Un Pass Type ID Apple par commerce, pour que ses cartes ne s'empilent plus
-- avec celles des autres commerces dans Apple Wallet.
-- À exécuter une fois dans l'éditeur SQL de Supabase, AVANT de déployer le code.

begin;

-- 1. Certificat Apple de chaque commerce. Une ligne au plus par commerce.
--    La clé privée est chiffrée par l'application (AES-256-GCM, clé
--    PASS_CERTS_ENCRYPTION_KEY) : la base ne la voit jamais en clair.
create table if not exists merchant_pass_certs (
  merchant_id uuid primary key references merchants(id) on delete cascade,
  pass_type_identifier text not null unique,   -- pass.app.fiduo.<8 hex>
  asc_pass_type_id text not null,              -- id App Store Connect du Pass Type ID
  asc_certificate_id text not null,            -- id App Store Connect du certificat en cours
  cert_pem text not null,
  key_pem_chiffre text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- RLS activée et AUCUNE policy : seul le service_role (qui contourne la RLS)
-- lit ou écrit cette table. Ni les commerçants ni le public n'y ont accès.
alter table merchant_pass_certs enable row level security;

-- 2. Pass Type ID de chaque carte client, figé à sa création.
--    NULL = l'identifiant historique partagé (APPLE_PASS_TYPE_ID du .env).
--    Une carte déjà installée ne peut pas changer de Pass Type ID : les cartes
--    existantes restent donc sur l'identifiant partagé, seules les nouvelles
--    cartes d'un commerce équipé prennent son identifiant propre.
alter table customers add column if not exists pass_type_identifier text;

-- 3. supprimer_commerce : supprime aussi le certificat du commerce.
--    (La cascade le ferait, mais on le compte et on le rend explicite.)
create or replace function supprimer_commerce(p_merchant_id uuid)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  n_apple integer;
  n_transactions integer;
  n_promos integer;
  n_recompenses integer;
  n_caisses integer;
  n_codes integer;
  n_clients integer;
  n_certs integer;
begin
  perform 1 from merchants where id = p_merchant_id for update;
  if not found then
    raise exception 'Commerce introuvable : %', p_merchant_id using errcode = 'P0002';
  end if;

  delete from apple_registrations
  where serial_number in (select serial_number from customers where merchant_id = p_merchant_id);
  get diagnostics n_apple = row_count;

  delete from transactions where merchant_id = p_merchant_id;
  get diagnostics n_transactions = row_count;

  delete from promos where merchant_id = p_merchant_id;
  get diagnostics n_promos = row_count;

  delete from rewards where merchant_id = p_merchant_id;
  get diagnostics n_recompenses = row_count;

  delete from devices where merchant_id = p_merchant_id;
  get diagnostics n_caisses = row_count;

  delete from pairing_codes where merchant_id = p_merchant_id;
  get diagnostics n_codes = row_count;

  delete from customers where merchant_id = p_merchant_id;
  get diagnostics n_clients = row_count;

  delete from merchant_pass_certs where merchant_id = p_merchant_id;
  get diagnostics n_certs = row_count;

  if to_regclass('public.rate_limit_hits') is not null then
    execute 'delete from rate_limit_hits where bucket like $1' using '%:' || p_merchant_id::text;
  end if;

  delete from merchants where id = p_merchant_id;

  return jsonb_build_object(
    'apple_registrations', n_apple,
    'transactions', n_transactions,
    'promos', n_promos,
    'rewards', n_recompenses,
    'devices', n_caisses,
    'pairing_codes', n_codes,
    'customers', n_clients,
    'pass_certs', n_certs
  );
end $$;

-- « create or replace » conserve les droits existants ; on les réaffirme
-- quand même, au cas où la fonction aurait été recréée autrement.
revoke all on function supprimer_commerce(uuid) from public;
revoke all on function supprimer_commerce(uuid) from anon, authenticated;
grant execute on function supprimer_commerce(uuid) to service_role;

commit;

-- Recharge le cache de schéma de PostgREST : la nouvelle table et la
-- nouvelle colonne sont visibles de l'API sans attendre.
notify pgrst, 'reload schema';
