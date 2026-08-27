import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/platformAdmin";
import { db, getMerchantBySlug } from "@/lib/supabaseAdmin";

/** GET — vue en lecture seule d'un commerçant pour le back-office plateforme. */
export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  if (!(await requirePlatformAdmin(req))) {
    return new NextResponse("Non autorisé", { status: 401 });
  }

  const merchant = await getMerchantBySlug(params.slug);
  if (!merchant) return new NextResponse("Commerce introuvable", { status: 404 });

  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

  const [
    { data: customers },
    { data: reward },
    { data: devices },
    { count: totalCards },
    { count: cardsThisMonth },
    { data: earnRows },
    { count: promosThisMonth },
    { count: promosThisWeek },
  ] = await Promise.all([
    db
      .from("customers")
      .select("id,first_name,email,points,updated_at")
      .eq("merchant_id", merchant.id)
      .order("updated_at", { ascending: false })
      .limit(20),
    db.from("rewards").select("*").eq("merchant_id", merchant.id).eq("active", true).maybeSingle(),
    db
      .from("devices")
      .select("id,label,created_at")
      .eq("merchant_id", merchant.id)
      .is("revoked_at", null)
      .order("created_at"),
    db.from("customers").select("*", { count: "exact", head: true }).eq("merchant_id", merchant.id),
    db
      .from("customers")
      .select("*", { count: "exact", head: true })
      .eq("merchant_id", merchant.id)
      .gte("created_at", startOfMonth),
    db
      .from("transactions")
      .select("delta")
      .eq("merchant_id", merchant.id)
      .eq("type", "earn")
      .gte("created_at", startOfMonth),
    db
      .from("promos")
      .select("*", { count: "exact", head: true })
      .eq("merchant_id", merchant.id)
      .gte("sent_at", startOfMonth),
    db
      .from("promos")
      .select("*", { count: "exact", head: true })
      .eq("merchant_id", merchant.id)
      .gte("sent_at", weekAgo),
  ]);

  const txThisMonth =
    merchant.program_type === "points"
      ? (earnRows ?? []).reduce((sum, row) => sum + row.delta, 0)
      : (earnRows ?? []).length;

  return NextResponse.json({
    merchant,
    customers: customers ?? [],
    reward,
    devices: devices ?? [],
    stats: {
      totalCards: totalCards ?? 0,
      cardsThisMonth: cardsThisMonth ?? 0,
      txThisMonth,
      promosThisMonth: promosThisMonth ?? 0,
      promosThisWeek: promosThisWeek ?? 0,
    },
  });
}
