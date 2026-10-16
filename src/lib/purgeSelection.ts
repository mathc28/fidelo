/*
 * Règles de sélection des purges RGPD, sans base ni effet de bord :
 * testables telles quelles. Les durées sont celles annoncées dans la
 * politique de confidentialité.
 *
 * - Carte de fidélité : supprimée 3 ans après sa dernière utilisation (sa
 *   dernière transaction, ou sa création si elle n'a jamais servi).
 * - Commerce résilié : supprimé 3 mois après sa résiliation.
 */

/** Une carte inutilisée depuis avant cette date est purgée. */
export function limiteInactivite(maintenant: Date): Date {
  const d = new Date(maintenant);
  d.setUTCFullYear(d.getUTCFullYear() - 3);
  return d;
}

/** Un commerce résilié avant cette date est purgé. */
export function limiteResiliation(maintenant: Date): Date {
  const d = new Date(maintenant);
  d.setUTCMonth(d.getUTCMonth() - 3);
  return d;
}

/**
 * Cartes à purger parmi des candidates. Une carte n'est purgée que si elle a
 * été créée avant la limite ET qu'aucune transaction ne la concerne depuis :
 * une carte qui a servi récemment est toujours conservée, quel que soit son
 * âge.
 *
 * `utiliseesDepuisLimite` : identifiants des cartes ayant au moins une
 * transaction à partir de la limite.
 */
export function cartesAPurger(
  candidates: { id: string; created_at: string }[],
  utiliseesDepuisLimite: Set<string>,
  limite: Date
): string[] {
  return candidates
    .filter((c) => new Date(c.created_at) < limite && !utiliseesDepuisLimite.has(c.id))
    .map((c) => c.id);
}

/** Commerces à purger : résiliés (resiliated_at renseigné) avant la limite. */
export function commercesAPurger(
  commerces: { id: string; resiliated_at: string | null }[],
  limite: Date
): string[] {
  return commerces
    .filter((m) => m.resiliated_at !== null && new Date(m.resiliated_at) < limite)
    .map((m) => m.id);
}
