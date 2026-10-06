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

/*
 * Durée d'affichage d'une promo sur la carte.
 *
 * Le commerçant choisit un nombre de jours ; le message reste visible
 * jusqu'à la fin du dernier jour, minuit heure de Paris. « 3 jours » envoyé un
 * mercredi à 10 h = visible jusqu'au samedi inclus, quelle que soit l'heure
 * d'envoi. C'est ce qui permet d'annoncer une date entière (« Visible
 * jusqu'au samedi 11 octobre ») et de la tenir : la tâche de nettoyage tourne
 * juste après minuit, heure de Paris.
 */
export const DUREES_PROMO = [1, 3, 7] as const;
export type DureePromo = (typeof DUREES_PROMO)[number];
export const DUREE_PROMO_DEFAUT: DureePromo = 3;

const FUSEAU = "Europe/Paris";

export function dureeValide(x: unknown): x is DureePromo {
  return DUREES_PROMO.includes(x as DureePromo);
}

/** Année, mois (1-12) et jour d'un instant, lus à Paris. */
function dateAParis(t: number): { a: number; m: number; j: number } {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSEAU,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(t));
  const v = (type: string) => Number(p.find((x) => x.type === type)!.value);
  return { a: v("year"), m: v("month"), j: v("day") };
}

/** L'instant de minuit, heure de Paris, au début du jour donné. */
function minuitAParis(a: number, m: number, j: number): Date {
  const guess = Date.UTC(a, m - 1, j);
  // Décalage de Paris à cet instant (1 h l'hiver, 2 h l'été). Minuit n'est
  // jamais dans le créneau du changement d'heure, qui a lieu entre 2 h et 3 h.
  const p = new Intl.DateTimeFormat("en-GB", {
    timeZone: FUSEAU,
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(guess));
  const decalage = Number(p.find((x) => x.type === "hour")!.value);
  return new Date(guess - decalage * 3600 * 1000);
}

/**
 * Fin d'affichage d'une promo envoyée à `now` pour `duree` jours : minuit
 * (Paris) à la fin du jour J + duree.
 */
export function finAffichage(duree: DureePromo, now = Date.now()): Date {
  const { a, m, j } = dateAParis(now);
  return minuitAParis(a, m, j + duree + 1);
}

/** « samedi 11 octobre » : le dernier jour où le message est visible. */
export function dernierJourVisible(expiresAt: Date | string): string {
  const fin = new Date(expiresAt).getTime() - 1;
  return new Date(fin).toLocaleDateString("fr-FR", {
    timeZone: FUSEAU,
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function promoActive(expiresAt: string | null | undefined, now = Date.now()): boolean {
  return !!expiresAt && new Date(expiresAt).getTime() > now;
}
