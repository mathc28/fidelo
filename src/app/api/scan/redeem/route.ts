import { NextRequest, NextResponse } from "next/server";
import { messageCarteIntrouvable, requireDevice } from "@/lib/deviceAuth";
import { db, merchantActive } from "@/lib/supabaseAdmin";
import { applyTransaction, getMerchantReward } from "@/lib/loyalty";

/**
 * « Récompense utilisée » en caisse : remet le compteur du client à zéro.
 *
 * La remise à zéro n'écrase jamais customers.points — elle passe par une
 * transaction 'redeem' de delta = -solde, que le trigger apply_transaction
 * répercute sur le cache. L'historique reste ainsi reconstituable, et la
 * ligne porte reward_id pour savoir ce qui a été offert.
 */
export async function POST(req: NextRequest) {
  const auth = await requireDevice(req);
  if (!auth) return new NextResponse("Appareil non appairé", { status: 401 });
  if (!merchantActive(auth.merchant)) {
    return new NextResponse("Abonnement inactif", { status: 402 });
  }

  const { serial } = await req.json();

  const [{ data: customer }, reward] = await Promise.all([
    db
      .from("customers")
      .select("*")
      .eq("serial_number", serial)
      .eq("merchant_id", auth.merchant.id)
      .single(),
    getMerchantReward(auth.merchant.id),
  ]);

  if (!customer) {
    return new NextResponse(await messageCarteIntrouvable(serial), { status: 404 });
  }
  if (!reward) return new NextResponse("Aucune récompense configurée", { status: 404 });

  // Le seuil est revérifié ici : la caisse peut afficher un état périmé si le
  // commerçant vient de le relever depuis le dashboard.
  if (customer.points < reward.cost_points) {
    return new NextResponse(`Seuil non atteint (${customer.points}/${reward.cost_points})`, {
      status: 409,
    });
  }

  const result = await applyTransaction({
    merchant: auth.merchant,
    customer,
    deviceId: auth.deviceId,
    type: "redeem",
    delta: -customer.points,
    rewardId: reward.id,
  });

  if (!result.ok) return new NextResponse(result.error, { status: 409 });
  return NextResponse.json({ points: result.customer.points, reward: reward.label });
}
