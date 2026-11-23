/**
 * Logo entier du commerce, pour l'afficher sans le rogner.
 *
 * merchants.logo_url pointe vers web-icon.png, une vignette carrée 128×128
 * recadrée (fit: cover) : un logo horizontal y perd ses bords. L'upload
 * produit aussi les logos du pass Apple, dont logo@3x.png (480×150 au plus,
 * jamais recadré) — exactement ce qu'affiche la vraie carte. Même dossier,
 * même version (?v=) : on en déduit l'URL, sans colonne ni migration.
 *
 * Tout autre format d'URL (aperçu local blob:, URL inattendue) est rendu tel
 * quel.
 */
export function urlLogoEntier(logoUrl: string | null | undefined): string | null {
  if (!logoUrl) return null;
  return logoUrl.replace(/\/web-icon\.png(?=\?|$)/, "/logo@3x.png");
}
