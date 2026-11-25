-- Le premier thème porte encore l'ancien nom du produit : « Marine Fidelo »
-- devient « Marine Fiduo », comme dans supabase/schema.sql et la landing.
--
-- Sans dépendance au code : à exécuter avant ou après le déploiement. Le
-- filtre sur l'ancien label rend la requête rejouable sans effet, et ne
-- touche pas un label qui aurait été changé entre-temps.

update card_themes
set label = 'Marine Fiduo'
where id = 'marine'
  and label = 'Marine Fidelo';
