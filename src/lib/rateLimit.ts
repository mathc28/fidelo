import { NextRequest } from "next/server";
import { db } from "./supabaseAdmin";

/** IP du client, en tenant compte d'un éventuel proxy devant l'app. */
export function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd ? fwd.split(",")[0].trim() : req.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Anti brute-force générique, appuyé sur la table rate_limit_hits (pas de
 * nouveau service — cohérent avec le reste de l'infra, déjà sur Supabase).
 * Renvoie true si la limite est dépassée pour ce (bucket, ip).
 */
export async function isRateLimited(
  bucket: string,
  ip: string,
  { max, windowSeconds }: { max: number; windowSeconds: number }
): Promise<boolean> {
  const since = new Date(Date.now() - windowSeconds * 1000).toISOString();

  // Auto-nettoyage : purge les entrées hors fenêtre à chaque appel,
  // la table ne grossit jamais au-delà du trafic récent.
  await db.from("rate_limit_hits").delete().lt("created_at", since);

  const { count } = await db
    .from("rate_limit_hits")
    .select("*", { count: "exact", head: true })
    .eq("bucket", bucket)
    .eq("ip", ip)
    .gte("created_at", since);

  if ((count ?? 0) >= max) return true;

  await db.from("rate_limit_hits").insert({ bucket, ip });
  return false;
}
