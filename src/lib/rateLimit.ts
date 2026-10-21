import { NextRequest } from "next/server";
import { db } from "./supabaseAdmin";

/** IP du client, en tenant compte d'un éventuel proxy devant l'app. */
export function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd ? fwd.split(",")[0].trim() : (req.headers.get("x-real-ip") ?? "unknown");
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
