-- Acceptation des CGV par le commerçant, à l'activation de son compte
-- (/definir-mot-de-passe). Sert de preuve : quelle version, et quand.
-- À exécuter une fois dans l'éditeur SQL de Supabase, AVANT de déployer le code.

begin;

alter table merchants add column if not exists cgv_accepted_at timestamptz;
alter table merchants add column if not exists cgv_version text;

commit;

-- Recharge le cache de schéma de PostgREST : les colonnes sont visibles de
-- l'API sans attendre.
notify pgrst, 'reload schema';
