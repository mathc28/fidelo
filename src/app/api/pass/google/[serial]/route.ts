import { NextRequest, NextResponse } from "next/server";
import { db, getMerchantById } from "@/lib/supabaseAdmin";
import { ensureLoyaltyObject, buildSaveUrl } from "@/lib/googleWallet";
import { getMerchantReward } from "@/lib/loyalty";
import { clientIp, isRateLimited } from "@/lib/rateLimit";

export async function GET(req: NextRequest, props: { params: Promise<{ serial: string }> }) {
  const params = await props.params;
  // Téléchargement de carte : 60 par IP et par 10 min. Le wifi d'une
  // boutique peut regrouper beaucoup de clients légitimes derrière une IP,
  // et une indisponibilité de la limite ne doit pas bloquer les cartes.
  if (
    await isRateLimited("pass-google", clientIp(req), {
      max: 60,
      windowSeconds: 600,
      siErreur: "laisser",
    })
  ) {
    return new NextResponse("Trop de demandes, réessayez dans quelques minutes", { status: 429 });
  }

  const { data: customer } = await db
    .from("customers")
    .select("*")
    .eq("serial_number", params.serial)
    .single();
  if (!customer) return new NextResponse("Carte introuvable", { status: 404 });

  const merchant = await getMerchantById(customer.merchant_id);
  if (!merchant) return new NextResponse("Commerce introuvable", { status: 404 });

  const reward = await getMerchantReward(merchant.id);
  await ensureLoyaltyObject(customer, merchant, reward);
  return NextResponse.redirect(buildSaveUrl(customer, merchant));
}
