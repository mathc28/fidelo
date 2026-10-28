import { NextRequest, NextResponse } from "next/server";
import { getMerchantById } from "@/lib/supabaseAdmin";
import { buildApplePass } from "@/lib/applePass";
import { getMerchantReward } from "@/lib/loyalty";
import { authentifier, bonPassType, court, log } from "@/lib/appleWebService";

/** L'iPhone télécharge la version à jour d'une carte qu'on lui a signalée. */
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ passTypeId: string; serial: string }> }
) {
  const params = await props.params;
  const carte = `carte ${court(params.serial)}`;

  if (!(await bonPassType(params.passTypeId))) {
    log(`téléchargement refusé, Pass Type ID inconnu (${params.passTypeId}) — ${carte} → 404`);
    return new NextResponse(null, { status: 404 });
  }

  const customer = await authentifier(req, params.serial, params.passTypeId);
  if (!customer) {
    log(`téléchargement refusé, authenticationToken invalide — ${carte} → 401`);
    return new NextResponse(null, { status: 401 });
  }

  const merchant = await getMerchantById(customer.merchant_id);
  if (!merchant) {
    log(`téléchargement impossible, commerce introuvable — ${carte} → 404`);
    return new NextResponse(null, { status: 404 });
  }

  // Pas de 304 sur If-Modified-Since : Last-Modified est à la seconde près,
  // et un passage enregistré dans la même seconde serait alors ignoré.
  const modifie = new Date(customer.updated_at);
  const reward = await getMerchantReward(merchant.id);
  const buffer = await buildApplePass(customer, merchant, reward);

  log(`téléchargement : ${carte} envoyée à jour → 200`);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.apple.pkpass",
      "Last-Modified": modifie.toUTCString(),
    },
  });
}
