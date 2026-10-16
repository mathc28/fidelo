-- Date de résiliation d'un commerce. La purge RGPD quotidienne supprime
-- définitivement les commerces résiliés depuis plus de 3 mois.
-- NULL = commerce non résilié (cas de tous les commerces à ce jour) : rien
-- n'est supprimé tant que la colonne n'est pas renseignée.
-- À exécuter une fois dans l'éditeur SQL de Supabase, AVANT de déployer le code.

begin;

alter table merchants add column if not exists resiliated_at timestamptz;

commit;

notify pgrst, 'reload schema';
