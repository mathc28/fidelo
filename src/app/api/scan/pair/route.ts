import { NextRequest, NextResponse } from "next/server";
import { redeemPairingCode } from "@/lib/deviceAuth";
import { clientIp, isRateLimited } from "@/lib/rateLimit";

/** Échange le code à 6 chiffres contre un token d'appareil. */
export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  if (await isRateLimited("scan-pair", ip, { max: 10, windowSeconds: 600 })) {
    return new NextResponse("Trop de tentatives, réessayez dans quelques minutes", { status: 429 });
  }

  const { code, label } = await req.json();
  if (!code) return new NextResponse("Code requis", { status: 400 });

  const result = await redeemPairingCode(String(code).trim(), label);
  if (!result) return new NextResponse("Code invalide ou expiré", { status: 401 });

  return NextResponse.json(result);
}
