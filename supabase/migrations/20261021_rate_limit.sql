-- Limitation de débit : table des passages et fonction atomique.
-- À exécuter une fois dans l'éditeur SQL de Supabase, AVANT de déployer le
-- code : les routes sensibles (appairage de caisse, recherches) BLOQUENT si
-- la fonction est absente.

begin;

-- 1. Un passage = une ligne (clé : bucket + identifiant, IP ou email).
create table if not exists rate_limit_hits (
  id bigint generated always as identity primary key,
  bucket text not null,          -- ex. 'scan-pair', 'lookup:<merchant_id>'
  ip text not null,              -- IP, email ou 'global' selon le bucket
  created_at timestamptz not null default now()
);

create index if not exists idx_rate_limit_bucket_ip on rate_limit_hits (bucket, ip, created_at);
create index if not exists idx_rate_limit_created on rate_limit_hits (created_at);

-- RLS activée, AUCUNE policy : seul le service_role y accède.
alter table rate_limit_hits enable row level security;

-- 2. rate_limit_hit : true si la limite est atteinte, false sinon.
--    Atomique : un verrou transactionnel par (bucket, identifiant) sérialise
--    les appels simultanés, qui ne peuvent donc pas dépasser la limite en
--    se croisant entre « compter » et « enregistrer ».
--    p_enregistrer = false : vérifie sans compter ce passage (utile pour
--    consulter un compteur d'échecs avant de tenter).
create or replace function rate_limit_hit(
  p_bucket text,
  p_ip text,
  p_max integer,
  p_fenetre_secondes integer,
  p_enregistrer boolean default true
)
returns boolean
language plpgsql
set search_path = public
as $$
declare
  n integer;
begin
  perform pg_advisory_xact_lock(hashtext(p_bucket || '|' || p_ip));

  delete from rate_limit_hits
  where bucket = p_bucket and ip = p_ip
    and created_at < now() - make_interval(secs => p_fenetre_secondes);

  select count(*) into n
  from rate_limit_hits
  where bucket = p_bucket and ip = p_ip;

  if n >= p_max then
    return true;
  end if;

  if p_enregistrer then
    insert into rate_limit_hits (bucket, ip) values (p_bucket, p_ip);
  end if;

  -- Ménage occasionnel des compteurs oubliés (autres buckets, IP de passage).
  if random() < 0.01 then
    delete from rate_limit_hits where created_at < now() - interval '1 day';
  end if;

  return false;
end $$;

revoke all on function rate_limit_hit(text, text, integer, integer, boolean) from public;
revoke all on function rate_limit_hit(text, text, integer, integer, boolean) from anon, authenticated;
grant execute on function rate_limit_hit(text, text, integer, integer, boolean) to service_role;

commit;

notify pgrst, 'reload schema';
