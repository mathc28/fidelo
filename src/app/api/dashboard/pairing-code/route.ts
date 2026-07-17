import { NextRequest, NextResponse } from "next/server";
import { requireMerchant } from "@/lib/dashboardAuth";
import { createPairingCode } from "@/lib/deviceAuth";

/** Génère un code d'appairage pour un nouvel appareil de caisse. */
export async function POST(req: NextRequest) {
  const merchant = await requireMerchant(req);
  if (!merchant) return new NextResponse("Non autorisé", { status: 401 });

  const code = await createPairingCode(merchant.id);
  return NextResponse.json({ code, expiresInMinutes: 10 });
}
