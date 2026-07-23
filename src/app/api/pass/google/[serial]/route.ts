import { NextRequest, NextResponse } from "next/server";
import { db, getMerchantById } from "@/lib/supabaseAdmin";
import { ensureLoyaltyObject, buildSaveUrl } from "@/lib/googleWallet";

export async function GET(_req: NextRequest, { params }: { params: { serial: string } }) {
  const { data: customer } = await db
    .from("customers")
    .select("*")
    .eq("serial_number", params.serial)
    .single();
  if (!customer) return new NextResponse("Carte introuvable", { status: 404 });

  const merchant = await getMerchantById(customer.merchant_id);
  if (!merchant) return new NextResponse("Commerce introuvable", { status: 404 });

  await ensureLoyaltyObject(customer, merchant);
  return NextResponse.redirect(buildSaveUrl(customer, merchant));
}
