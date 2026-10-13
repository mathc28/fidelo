-- Suppression définitive d'un commerce et de toutes ses données en base.
-- Appelée par le back-office plateforme (/api/admin/merchants/[slug]/suppression)
-- avec le client service_role. Les fichiers Storage et le compte Auth du
-- gérant sont supprimés ensuite par l'API, une fois cette fonction réussie.
--
-- Un appel de fonction est une seule transaction : si une étape échoue, rien
-- n'est supprimé. Jamais de commerce à moitié effacé.

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
begin
  -- Verrou sur le commerce : deux suppressions simultanées ne se marchent pas
  -- dessus, et aucun ajout ne se glisse pendant l'opération.
  perform 1 from merchants where id = p_merchant_id for update;
  if not found then
    raise exception 'Commerce introuvable : %', p_merchant_id using errcode = 'P0002';
  end if;

  -- Ordre imposé par les clés étrangères : transactions avant caisses et
  -- récompenses (device_id, reward_id sans cascade), clients avant commerce.
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

  -- Compteurs anti-abus liés au commerce (inscription, consultation de carte).
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
    'customers', n_clients
  );
end $$;

-- Indispensable : Supabase expose les fonctions du schéma public via son API
-- et les rend exécutables par défaut. Sans ces lignes, n'importe quel
-- commerçant connecté pourrait supprimer n'importe quel commerce.
revoke all on function supprimer_commerce(uuid) from public;
revoke all on function supprimer_commerce(uuid) from anon, authenticated;
grant execute on function supprimer_commerce(uuid) to service_role;
