import { NextRequest, NextResponse } from "next/server";
import { messageCarteIntrouvable, requireDevice } from "@/lib/deviceAuth";
import { db, merchantActive } from "@/lib/supabaseAdmin";
import { applyTransaction } from "@/lib/loyalty";
import { validerMontant } from "@/lib/validation";

/**
 * Crédit : mode visits → +1 (pas de montant), mode points → floor(montant).
 */
export async function POST(req: NextRequest) {
  const auth = await requireDevice(req);
  if (!auth) return new NextResponse("Appareil non appairé", { status: 401 });
  if (!merchantActive(auth.merchant)) {
    return new NextResponse("Abonnement inactif", { status: 402 });
  }

  const { serial, amountEuros } = await req.json();

  const { data: customer } = await db
    .from("customers")
    .select("*")
    .eq("serial_number", serial)
    .eq("merchant_id", auth.merchant.id)
    .single();
  if (!customer) {
    return new NextResponse(await messageCarteIntrouvable(serial), { status: 404 });
  }

  const isVisits = auth.merchant.program_type === "visits";
  let delta = 1;
  if (!isVisits) {
    const montant = validerMontant(amountEuros);
    if (!montant.ok) return new NextResponse(montant.erreur, { status: 400 });
    delta = Math.floor(montant.valeur);
    if (delta <= 0) return new NextResponse("Montant invalide", { status: 400 });
  }

  const result = await applyTransaction({
    merchant: auth.merchant,
    customer,
    deviceId: auth.deviceId,
    type: "earn",
    delta,
    amountEuros: isVisits ? undefined : Number(amountEuros),
  });

  if (!result.ok) return new NextResponse(result.error, { status: 409 });
  return NextResponse.json({ points: result.customer.points });
}
