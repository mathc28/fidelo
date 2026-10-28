import { NextRequest, NextResponse } from "next/server";
import { db, getMerchantById } from "@/lib/supabaseAdmin";
import { buildApplePass } from "@/lib/applePass";
import { getMerchantReward } from "@/lib/loyalty";
import { clientIp, isRateLimited } from "@/lib/rateLimit";

export async function GET(req: NextRequest, props: { params: Promise<{ serial: string }> }) {
  const params = await props.params;
  // Téléchargement de carte : 60 par IP et par 10 min. Le wifi d'une
  // boutique peut regrouper beaucoup de clients légitimes derrière une IP,
  // et une indisponibilité de la limite ne doit pas bloquer les cartes.
  if (
    await isRateLimited("pass-apple", clientIp(req), {
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
  const buffer = await buildApplePass(customer, merchant, reward);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.apple.pkpass",
      "Content-Disposition": `attachment; filename="fidelite.pkpass"`,
    },
  });
}
