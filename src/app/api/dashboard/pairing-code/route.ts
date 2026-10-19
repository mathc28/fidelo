import { NextRequest, NextResponse } from "next/server";
import { exigerCommercantAJour } from "@/lib/cgvServeur";
import { createPairingCode } from "@/lib/deviceAuth";

/** Génère un code d'appairage pour un nouvel appareil de caisse. */
export async function POST(req: NextRequest) {
  const garde = await exigerCommercantAJour(req);
  if ("reponse" in garde) return garde.reponse;
  const { merchant } = garde;

  const code = await createPairingCode(merchant.id);
  return NextResponse.json({ code, expiresInMinutes: 10 });
}
