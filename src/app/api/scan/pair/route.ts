import { NextRequest, NextResponse } from "next/server";
import { redeemPairingCode } from "@/lib/deviceAuth";
import { clientIp, isRateLimited } from "@/lib/rateLimit";

/** Seuil d'alerte : codes faux sur toute la plateforme, toutes IP confondues. */
const SEUIL_ALERTE = { max: 100, windowSeconds: 15 * 60, siErreur: "laisser" } as const;

/**
 * Échange un code d'appairage contre un token d'appareil.
 *
 * - Par IP : 10 tentatives / 10 min, bloquant si la limitation est
 *   indisponible.
 * - Sur toute la plateforme : au-delà de 100 codes faux en 15 min, un log
 *   d'alerte « [Sécurité] pic d'échecs d'appairage », sans rien bloquer —
 *   un blocage global permettrait à n'importe qui de couper l'appairage de
 *   tous les commerces. Avec 8 caractères (≈ 850 milliards de codes), un
 *   pic d'échecs ne peut de toute façon pas aboutir.
 */
export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  if (await isRateLimited("scan-pair", ip, { max: 10, windowSeconds: 600, siErreur: "bloquer" })) {
    return new NextResponse("Trop de tentatives, réessayez dans quelques minutes", { status: 429 });
  }

  const corps = (await req.json().catch(() => null)) as { code?: unknown; label?: unknown } | null;
  if (typeof corps?.code !== "string" || !corps.code) {
    return new NextResponse("Code requis", { status: 400 });
  }

  const result = await redeemPairingCode(corps.code, corps.label);
  if (!result) {
    if (await isRateLimited("scan-pair-echecs", "global", SEUIL_ALERTE)) {
      console.warn(
        `[Sécurité] pic d'échecs d'appairage : plus de ${SEUIL_ALERTE.max} codes faux en 15 min (dernier depuis ${ip})`
      );
    }
    return new NextResponse("Code invalide ou expiré", { status: 401 });
  }

  return NextResponse.json(result);
}
