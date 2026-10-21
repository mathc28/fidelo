import { NextRequest, NextResponse } from "next/server";
import { log } from "@/lib/appleWebService";
import { clientIp, isRateLimited } from "@/lib/rateLimit";

/** Taille maximale acceptée pour un envoi de journal (16 Ko). */
const TAILLE_MAX = 16 * 1024;

/**
 * L'iPhone signale ici ses propres erreurs avec le web service (certificat,
 * réponse illisible, URL injoignable…). Premier endroit à regarder quand une
 * carte ne se met pas à jour. Public par nature (Apple n'y envoie pas de
 * jeton) : limité en débit et en taille.
 */
export async function POST(req: NextRequest) {
  if (
    await isRateLimited("apple-log", clientIp(req), {
      max: 30,
      windowSeconds: 600,
      siErreur: "laisser",
    })
  ) {
    return new NextResponse(null, { status: 429 });
  }

  const longueur = Number(req.headers.get("content-length") ?? 0);
  if (longueur > TAILLE_MAX) return new NextResponse(null, { status: 413 });
  const brut = await req.text();
  if (brut.length > TAILLE_MAX) return new NextResponse(null, { status: 413 });

  let body: { logs?: unknown } | null = null;
  try {
    body = JSON.parse(brut);
  } catch {}
  const lignes = Array.isArray(body?.logs) ? body.logs : null;
  if (!lignes) {
    log(`journal de l'iPhone (format inattendu, ${brut.length} octets)`);
    return new NextResponse(null, { status: 200 });
  }
  // Au plus 20 lignes de 500 caractères : de quoi diagnostiquer, pas de quoi
  // remplir les journaux Vercel.
  for (const ligne of lignes.slice(0, 20))
    log(`journal de l'iPhone : ${String(ligne).slice(0, 500)}`);
  return new NextResponse(null, { status: 200 });
}
