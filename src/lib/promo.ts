/**
 * Règle anti-spam des promos, partagée par l'API (qui l'applique) et les
 * écrans (qui l'annoncent) : si les deux divergent, le commerçant lit une
 * promesse que le serveur refuse.
 *
 * La fenêtre est glissante — 7 jours avant l'instant de l'envoi — et non
 * une semaine calendaire : le compteur ne « repart » pas le lundi.
 */
export const MAX_PROMOS = 3;
export const PROMO_WINDOW_MS = 7 * 24 * 3600 * 1000;

/**
 * Date à laquelle un nouvel envoi redevient possible, ou null s'il l'est
 * déjà. `sentAt` : dates d'envoi des promos de la fenêtre, dans n'importe
 * quel ordre.
 */
export function prochainEnvoiPossible(sentAt: string[], now = Date.now()): Date | null {
  const recents = sentAt
    .map((d) => new Date(d).getTime())
    .filter((t) => now - t < PROMO_WINDOW_MS)
    .sort((a, b) => b - a);
  if (recents.length < MAX_PROMOS) return null;
  // Le quota se libère quand la plus ancienne des MAX_PROMOS dernières sort
  // de la fenêtre.
  return new Date(recents[MAX_PROMOS - 1] + PROMO_WINDOW_MS);
}
