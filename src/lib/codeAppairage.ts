/*
 * Code d'appairage d'une caisse : 8 caractères, sans les caractères qu'on
 * confond à la lecture (0/O, 1/I/L). 31 symboles ^ 8 ≈ 850 milliards de
 * combinaisons : impossible à deviner, même sans limitation de débit.
 *
 * Module sans dépendance serveur : partagé par l'API, la page de caisse
 * (saisie) et le dashboard (affichage).
 */

export const ALPHABET_CODE = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const LONGUEUR_CODE = 8;

/**
 * Tire un code au hasard. `aleatoire(n)` renvoie un entier dans [0, n) :
 * crypto.randomInt côté serveur (jamais Math.random).
 */
export function genererCode(aleatoire: (n: number) => number): string {
  let code = "";
  for (let i = 0; i < LONGUEUR_CODE; i++) code += ALPHABET_CODE[aleatoire(ALPHABET_CODE.length)];
  return code;
}

/** Saisie → code stocké : majuscules, sans tiret ni espace ni caractère hors alphabet. */
export function normaliserCode(saisie: string): string {
  return saisie
    .toUpperCase()
    .split("")
    .filter((c) => ALPHABET_CODE.includes(c))
    .join("")
    .slice(0, LONGUEUR_CODE);
}

/** Code stocké → affichage en deux blocs de 4 : « ABCD-2345 ». */
export function formaterCode(code: string): string {
  return code.length > 4 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
}
