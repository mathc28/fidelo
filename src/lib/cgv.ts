import { CGV_VERSION } from "./site";

/**
 * Code d'erreur renvoyé (403) par les routes du dashboard tant que les CGV
 * en vigueur ne sont pas acceptées.
 */
export const ERREUR_CGV = "cgv_non_acceptees";

/**
 * Le gérant doit-il (ré)accepter les CGV avant d'accéder au dashboard ?
 * Oui s'il n'a jamais accepté, ou s'il a accepté une autre version que la
 * version en vigueur. Les admins plateforme n'y sont jamais soumis.
 */
export function doitAccepterCgv(
  versionAcceptee: string | null,
  estAdminPlateforme: boolean,
  versionEnVigueur: string = CGV_VERSION
): boolean {
  if (estAdminPlateforme) return false;
  return versionAcceptee !== versionEnVigueur;
}
