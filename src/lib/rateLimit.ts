import { NextRequest } from "next/server";
import { db } from "./supabaseAdmin";

/** Clé commune aux requêtes sans IP identifiable : limitées ensemble, jamais exemptées. */
export const IP_INCONNUE = "inconnu";

/**
 * IP du client, pour la limitation de débit.
 *
 * 1. x-real-ip : posé par Vercel avec l'IP réelle de la connexion. Un client
 *    ne peut pas le forger : Vercel l'écrase. C'est la source de confiance.
 * 2. À défaut, la première valeur de x-forwarded-for. Fiable sur Vercel, qui
 *    réécrit entièrement cet en-tête. Derrière un proxy classique, ce serait
 *    l'inverse : chaque proxy AJOUTE l'IP vue en fin de chaîne, et c'est le
 *    début qui peut venir du client — d'où x-real-ip en priorité.
 * 3. Rien d'exploitable : le bucket commun « inconnu », lui aussi limité.
 */
export function clientIp(req: NextRequest): string {
  const reelle = req.headers.get("x-real-ip")?.trim();
  if (reelle) return reelle;
  const premiere = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return premiere || IP_INCONNUE;
}

export type OptionsLimite = {
  max: number;
  windowSeconds: number;
  /**
   * Que faire si la limitation est indisponible (fonction SQL absente, base
   * injoignable) ?
   * - "bloquer" : refuser — pour les routes qu'on ne doit jamais laisser
   *   ouvertes au brute force (appairage de caisse, recherches) ;
   * - "laisser" : accepter — pour celles dont l'indisponibilité gênerait
   *   des clients légitimes (téléchargement des cartes, journaux Apple).
   */
  siErreur: "bloquer" | "laisser";
  /** false : vérifie sans compter ce passage (consultation d'un compteur). */
  enregistrer?: boolean;
};

/**
 * Anti brute-force, appuyé sur la fonction SQL atomique rate_limit_hit
 * (migration 20261021_rate_limit.sql). Renvoie true si la limite est
 * atteinte pour ce (bucket, identifiant). L'identifiant est en général l'IP,
 * mais peut être un email ou « global ».
 */
export async function isRateLimited(
  bucket: string,
  identifiant: string,
  { max, windowSeconds, siErreur, enregistrer = true }: OptionsLimite
): Promise<boolean> {
  try {
    const { data, error } = await db.rpc("rate_limit_hit", {
      p_bucket: bucket,
      p_ip: identifiant,
      p_max: max,
      p_fenetre_secondes: windowSeconds,
      p_enregistrer: enregistrer,
    });
    if (error) throw new Error(error.message);
    return data === true;
  } catch (e) {
    console.error(
      `[Rate limit] ${bucket} indisponible (${siErreur === "bloquer" ? "requête bloquée" : "requête laissée passer"}) :`,
      (e as Error).message
    );
    return siErreur === "bloquer";
  }
}
