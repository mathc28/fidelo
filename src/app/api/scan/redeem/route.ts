import { NextRequest, NextResponse } from "next/server";
import { requireDevice } from "@/lib/deviceAuth";
import { db, merchantActive } from "@/lib/supabaseAdmin";
import { applyTransaction } from "@/lib/loyalty";

/** Utilisation d'une récompense : vérifie le palier, débite, trace. */
export async function POST(req: NextRequest) {
  const auth = await requireDevice(req);
  if (!auth) return new NextResponse("Appareil non appairé", { status: 401 });
  if (!merchantActive(auth.merchant)) {
    return new NextResponse("Abonnement inactif", { status: 402 });
  }

  const { serial, rewardId } = await req.json();

  const [{ data: customer }, { data: reward }] = await Promise.all([
    db
      .from("customers")
      .select("*")
      .eq("serial_number", serial)
      .eq("merchant_id", auth.merchant.id)
      .single(),
    db
      .from("rewards")
      .select("*")
      .eq("id", rewardId)
      .eq("merchant_id", auth.merchant.id)
      .eq("active", true)
      .single(),
  ]);

  if (!customer) return new NextResponse("Carte inconnue", { status: 404 });
  if (!reward) return new NextResponse("Récompense introuvable", { status: 404 });

  const result = await applyTransaction({
    merchant: auth.merchant,
    customer,
    deviceId: auth.deviceId,
    type: "redeem",
    delta: -reward.cost_points,
    rewardId: reward.id,
  });

  if (!result.ok) return new NextResponse(result.error, { status: 409 });
  return NextResponse.json({ points: result.customer.points, reward: reward.label });
}
