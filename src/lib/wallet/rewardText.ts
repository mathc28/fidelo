/**
 * Formulation de la récompense affichée sur la carte.
 *
 * Vit ici, et pas dans applePass.ts, pour être la source unique partagée par le
 * générateur de pass (serveur) et l'aperçu du dashboard (client) : c'est la
 * divergence entre les deux qui faisait dire « le pass ne ressemble pas à
 * l'aperçu ». Le module ne dépend de rien — surtout pas de supabaseAdmin, qui
 * construit un client service-role au chargement et n'a rien à faire dans un
 * composant client.
 */

/** Le minimum dont dépend le texte : ni Row.Reward ni le type de supabaseAdmin. */
export type RecompenseAffichable = { label: string; cost_points: number };

/**
 * Le compteur affiché en grand sur la carte, quand un objectif existe.
 *
 * Au passage, « sur » remplace « / » : la barre oblique est le seul glyphe de
 * la chaîne à porter de l'encre sur toute sa hauteur et à finir en pointe
 * nette sur la ligne de base, là où les chiffres s'incurvent. Collée au
 * libellé du primaryField — dont l'espacement n'est pas réglable sur un
 * storeCard — elle se lit comme un chevauchement. `s`, `u` et `r` n'ont aucun
 * jambage descendant, le problème disparaît.
 *
 * Aux points, la barre oblique est conservée : les seuils y sont à trois
 * chiffres, et « 124 sur 250 » est 50 % plus large que « 124 / 250 », ce
 * qu'iOS paierait en réduisant le corps du compteur.
 */
export function texteCompteur(points: number, seuil: number, isVisits: boolean): string {
  return isVisits ? `${points} sur ${seuil}` : `${points} / ${seuil}`;
}

/**
 * Texte court de la récompense, calibré pour un champ de demi-largeur.
 *
 * L'unité (« passages », « points ») est omise : elle est déjà portée par le
 * libellé du compteur juste au-dessus, et c'est elle qui faisait déborder la
 * ligne. Reste l'élision de « 1 » en « qu'un » — pas de « (s) » dans un texte
 * que le client lit sur sa carte.
 *
 * Le deux-points isole le libellé saisi par le commerçant, dont on ne maîtrise
 * ni la casse ni le déterminant : « avant : Un café offert » se lit,
 * « avant Un café offert » non.
 */
export function texteRecompense(
  reachedReward: RecompenseAffichable | undefined | null,
  nextReward: RecompenseAffichable | undefined | null,
  points: number
): string {
  if (reachedReward) return `🎁 ${reachedReward.label}`;
  if (!nextReward) return "Programme en cours";

  const restant = nextReward.cost_points - points;
  return `Plus ${restant === 1 ? "qu'un" : `que ${restant}`} avant : ${nextReward.label}`;
}

/**
 * Découpe une récompense unique en « atteinte » / « à atteindre » selon le
 * solde. Même règle des deux côtés : soit le seuil est franchi et elle est à
 * retirer, soit elle reste l'objectif affiché.
 */
export function separerRecompense<T extends RecompenseAffichable>(
  reward: T | null | undefined,
  points: number
): { reachedReward: T | undefined; nextReward: T | undefined } {
  const reachedReward = reward && points >= reward.cost_points ? reward : undefined;
  return { reachedReward, nextReward: reachedReward ? undefined : (reward ?? undefined) };
}
