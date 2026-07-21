import { NextRequest, NextResponse } from "next/server";
import { db, getMerchantBySlug } from "@/lib/supabaseAdmin";
import { getActiveRewards } from "@/lib/loyalty";
import { clientIp, isRateLimited } from "@/lib/rateLimit";

/** Espace client public : lookup par email, scopé au commerce. */
export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const merchant = await getMerchantBySlug(params.slug);
  if (!merchant) return new NextResponse("Commerce introuvable", { status: 404 });

  const ip = clientIp(req);
  if (await isRateLimited(`lookup:${merchant.id}`, ip, { max: 10, windowSeconds: 3600 })) {
    return new NextResponse("Trop de tentatives, réessayez plus tard", { status: 429 });
  }

  const { email } = await req.json();
  if (!email) return new NextResponse("Email requis", { status: 400 });

  const { data: customer } = await db
    .from("customers")
    .select("serial_number, first_name, points, created_at")
    .eq("merchant_id", merchant.id)
    .eq("email", String(email).toLowerCase().trim())
    .single();

  if (!customer) return new NextResponse("Aucune carte pour cet email", { status: 404 });

  const rewards = await getActiveRewards(merchant.id);
  const next = rewards.find((r) => r.cost_points > customer.points) ?? null;

  return NextResponse.json({
    firstName: customer.first_name,
    points: customer.points,
    memberSince: customer.created_at,
    nextReward: next ? { label: next.label, cost: next.cost_points } : null,
    appleUrl: `/api/pass/apple/${customer.serial_number}`,
    googleUrl: `/api/pass/google/${customer.serial_number}`,
  });
}
