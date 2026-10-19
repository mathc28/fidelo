import { ERREUR_CGV } from "./cgv";

/** Événement qui demande au layout du dashboard d'afficher l'acceptation des CGV. */
export const EVENEMENT_CGV = "fiduo:cgv-requise";

/**
 * À appeler sur la réponse d'une route du dashboard : si le serveur l'a
 * refusée faute d'acceptation des CGV en vigueur, prévient le layout (qui
 * affiche « Nos conditions ont évolué ») et renvoie true — l'appelant
 * s'arrête alors sans message d'erreur.
 */
export async function cgvRequise(res: Response): Promise<boolean> {
  if (res.status !== 403) return false;
  try {
    const corps = (await res.clone().json()) as { error?: string };
    if (corps?.error !== ERREUR_CGV) return false;
  } catch {
    return false;
  }
  window.dispatchEvent(new Event(EVENEMENT_CGV));
  return true;
}
