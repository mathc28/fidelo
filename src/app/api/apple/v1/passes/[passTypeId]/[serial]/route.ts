import { NextRequest, NextResponse } from "next/server";
import { db, getMerchantById } from "@/lib/supabaseAdmin";
import { buildApplePass } from "@/lib/applePass";
import { getActiveRewards } from "@/lib/loyalty";

export async function GET(
  req: NextRequest,
  { params }: { params: { passTypeId: string; serial: string } }
) {
  const token = req.headers.get("authorization")?.replace("ApplePass ", "");

  const { data: customer } = await db
    .from("customers")
    .select("*")
    .eq("serial_number", params.serial)
    .single();
  if (!customer || customer.auth_token !== token) {
    return new NextResponse(null, { status: 401 });
  }

  const merchant = await getMerchantById(customer.merchant_id);
  if (!merchant) return new NextResponse(null, { status: 404 });

  const rewards = await getActiveRewards(merchant.id);
  const buffer = await buildApplePass(customer, merchant, rewards);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.apple.pkpass",
      "Last-Modified": new Date(customer.updated_at).toUTCString(),
    },
  });
}
