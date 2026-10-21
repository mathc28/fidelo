import { NextRequest, NextResponse } from "next/server";
import { redeemPairingCode } from "@/lib/deviceAuth";
import { clientIp, isRateLimited } from "@/lib/rateLimit";

/** Échecs tolérés sur la plateforme entière, toutes IP confondues. */
const ECHECS_GLOBAUX = { max: 100, windowSeconds: 15 * 60, siErreur: "bloquer" } as const;

/**
 * Échange un code d'appairage contre un token d'appareil.
 *
 * Deux limites, qui bloquent toutes deux si la limitation est indisponible :
 * - par IP : 10 tentatives / 10 min ;
 * - globale : au-delà de 100 codes faux en 15 min sur toute la plateforme
 *   (attaque répartie sur de nombreuses IP), l'appairage est suspendu pour
 *   tout le monde jusqu'à la fin de la fenêtre.
 */
export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  if (
    (await isRateLimited("scan-pair", ip, { max: 10, windowSeconds: 600, siErreur: "bloquer" })) ||
    (await isRateLimited("scan-pair-echecs", "global", { ...ECHECS_GLOBAUX, enregistrer: false }))
  ) {
    return new NextResponse("Trop de tentatives, réessayez dans quelques minutes", { status: 429 });
  }

  const corps = (await req.json().catch(() => null)) as { code?: unknown; label?: unknown } | null;
  if (typeof corps?.code !== "string" || !corps.code) {
    return new NextResponse("Code requis", { status: 400 });
  }

  const result = await redeemPairingCode(corps.code, corps.label);
  if (!result) {
    await isRateLimited("scan-pair-echecs", "global", ECHECS_GLOBAUX);
    return new NextResponse("Code invalide ou expiré", { status: 401 });
  }

  return NextResponse.json(result);
}
