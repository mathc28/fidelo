import { CGV_VERSION } from "./site";

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
