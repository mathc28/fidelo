import { NextRequest, NextResponse } from "next/server";
import { db, getMerchantById } from "@/lib/supabaseAdmin";
import { buildApplePass } from "@/lib/applePass";
import { getActiveRewards } from "@/lib/loyalty";

export async function GET(_req: NextRequest, { params }: { params: { serial: string } }) {
  const { data: customer } = await db
    .from("customers")
    .select("*")
    .eq("serial_number", params.serial)
    .single();
  if (!customer) return new NextResponse("Carte introuvable", { status: 404 });

  const merchant = await getMerchantById(customer.merchant_id);
  if (!merchant) return new NextResponse("Commerce introuvable", { status: 404 });

  const rewards = await getActiveRewards(merchant.id);
  const buffer = await buildApplePass(customer, merchant, rewards);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.apple.pkpass",
      "Content-Disposition": `attachment; filename="fidelite.pkpass"`,
    },
  });
}
