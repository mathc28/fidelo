-- Les gérants ne lisent plus que les colonnes utiles de leurs clients.
--
-- La policy RLS customers_own limite déjà les LIGNES (un gérant ne voit que
-- ses clients) ; ce droit par colonne limite les COLONNES : auth_token (le
-- jeton du web service Apple) et serial_number (qui donne accès au .pkpass,
-- donc au même jeton) ne sont plus lisibles depuis le navigateur. Le serveur
-- (service_role) garde l'accès complet.
--
-- À exécuter APRÈS avoir déployé le code de la branche chore/deps-headers :
-- l'ancien dashboard compte ses clients avec select("*"), qui serait alors
-- refusé (« permission denied for column »).

begin;

revoke select on customers from anon, authenticated;
-- Le navigateur n'écrit jamais dans customers (inscription, scans et purges
-- passent par le serveur) : on retire aussi ces droits, en plus de la RLS
-- qui les bloque déjà faute de policy.
revoke insert, update, delete on customers from anon, authenticated;

grant select (id, merchant_id, first_name, email, points, created_at, updated_at)
  on customers to authenticated;

commit;

notify pgrst, 'reload schema';
