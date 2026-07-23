import { NextRequest, NextResponse } from "next/server";
import { requireMerchant } from "@/lib/dashboardAuth";
import { db, merchantActive } from "@/lib/supabaseAdmin";
import { pushMerchantPasses } from "@/lib/apns";
import { broadcastMerchantPromo } from "@/lib/googleWallet";

const MAX_PROMOS_PER_WEEK = 3;

/** Giga promo du merchant connecté : push Apple + Google, avec anti-spam. */
export async function POST(req: NextRequest) {
  const merchant = await requireMerchant(req);
  if (!merchant) return new NextResponse("Non autorisé", { status: 401 });
  if (!merchantActive(merchant)) return new NextResponse("Abonnement inactif", { status: 402 });

  const { title, message } = await req.json();
  if (!message) return new NextResponse("Message requis", { status: 400 });

  // Anti-spam : protège la valeur du canal pour tout le monde
  const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const { count } = await db
    .from("promos")
    .select("*", { count: "exact", head: true })
    .eq("merchant_id", merchant.id)
    .gte("sent_at", weekAgo);

  if ((count ?? 0) >= MAX_PROMOS_PER_WEEK) {
    return new NextResponse(`Limite de ${MAX_PROMOS_PER_WEEK} promos par semaine atteinte`, {
      status: 429,
    });
  }

  // Le message devient le champ "récompense/promo" des passes Apple :
  // bump updated_at de tous les clients du merchant, puis push
  await db
    .from("customers")
    .update({ updated_at: new Date().toISOString() })
    .eq("merchant_id", merchant.id);

  const [appleCount] = await Promise.all([
    pushMerchantPasses(merchant.id),
    broadcastMerchantPromo(merchant, title || merchant.name, message).catch(() => {}),
  ]);

  await db.from("promos").insert({
    merchant_id: merchant.id,
    title: title || null,
    message,
    apple_devices_notified: appleCount,
  });

  return NextResponse.json({ ok: true, apple_devices_notified: appleCount });
}
