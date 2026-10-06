-- Durée d'affichage des promos sur la carte (1, 3 ou 7 jours).
-- À exécuter une fois dans l'éditeur SQL de Supabase, AVANT de déployer le
-- code qui écrit expires_at.

begin;

-- 1. Fin d'affichage du message sur la carte.
alter table promos add column expires_at timestamptz;

-- 2. Promos déjà envoyées : 3 jours après l'envoi, la durée par défaut.
--    Celles qui dépassent déjà cette date seront retirées des cartes au
--    prochain passage de la tâche de nuit.
update promos set expires_at = sent_at + interval '3 days' where expires_at is null;

alter table promos alter column expires_at set not null;

-- 3. Trace du retrait : posée par /api/cron/promos-expirees une fois les
--    iPhone prévenus, pour ne traiter chaque promo qu'une fois.
alter table promos add column retired_at timestamptz;

create index idx_promos_a_retirer on promos(expires_at) where retired_at is null;

commit;
