-- Les commerçants ne lisent plus que leurs propres données depuis le
-- navigateur ; toute écriture passe par les routes /api/dashboard/*, qui
-- vérifient l'acceptation des CGV (et utilisent le service_role).
--
-- Avant : des policies « for all » permettaient à un gérant connecté de
-- modifier directement, avec sa clé publique, sa ligne merchants (y compris
-- subscription_status, cgv_version, resiliated_at), ses récompenses, ses
-- caisses et ses codes d'appairage — en contournant tout contrôle serveur.
--
-- À exécuter une fois dans l'éditeur SQL de Supabase, APRÈS avoir déployé le
-- code qui passe par /api/dashboard/recompense et /api/dashboard/caisses/[id]
-- (sinon l'enregistrement de la récompense et le retrait d'une caisse
-- échoueraient dans l'ancienne version du dashboard).

begin;

drop policy if exists merchant_own on merchants;
create policy merchant_own on merchants
  for select using (owner_id = auth.uid());

drop policy if exists rewards_own on rewards;
create policy rewards_own on rewards
  for select using (merchant_id = my_merchant_id());

drop policy if exists devices_own on devices;
create policy devices_own on devices
  for select using (merchant_id = my_merchant_id());

drop policy if exists pairing_own on pairing_codes;
create policy pairing_own on pairing_codes
  for select using (merchant_id = my_merchant_id());

commit;

notify pgrst, 'reload schema';
