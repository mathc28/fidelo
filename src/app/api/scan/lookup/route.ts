import { NextRequest, NextResponse } from "next/server";
import { messageCarteIntrouvable, requireDevice } from "@/lib/deviceAuth";
import { db } from "@/lib/supabaseAdmin";
import { getMerchantReward } from "@/lib/loyalty";
import { isRateLimited } from "@/lib/rateLimit";

/**
 * POST { serial } — après scan du QR
 * POST { search } — recherche par nom/email (client sans téléphone)
 * Toujours scopé au merchant de l'appareil appairé.
 */
export async function POST(req: NextRequest) {
  const auth = await requireDevice(req);
  if (!auth) return new NextResponse("Appareil non appairé", { status: 401 });

  // 120 recherches par caisse et par 10 min : largement assez pour un
  // comptoir, trop peu pour aspirer le fichier clients.
  if (
    await isRateLimited(`scan-lookup:${auth.merchant.id}`, auth.deviceId, {
      max: 120,
      windowSeconds: 600,
      siErreur: "bloquer",
    })
  ) {
    return new NextResponse("Trop de recherches, patientez quelques minutes", { status: 429 });
  }

  const { serial, search } = await req.json();

  if (search) {
    // Le texte est inséré dans un filtre PostgREST : on retire ce qui en
    // changerait la structure (virgules, parenthèses, jokers) et on borne.
    const q = String(search)
      .replace(/[,()%_*\\]/g, " ")
      .trim()
      .slice(0, 60);
    if (q.length < 2) {
      return NextResponse.json({ results: [], programType: auth.merchant.program_type });
    }
    const { data } = await db
      .from("customers")
      .select("serial_number, first_name, email, points")
      .eq("merchant_id", auth.merchant.id)
      .or(`first_name.ilike.%${q}%,email.ilike.%${q}%`)
      .limit(5);
    return NextResponse.json({ results: data ?? [], programType: auth.merchant.program_type });
  }

  const { data: customer } = await db
    .from("customers")
    .select("*")
    .eq("serial_number", serial)
    .eq("merchant_id", auth.merchant.id) // un QR d'un autre commerce = introuvable
    .single();

  if (!customer) {
    return new NextResponse(await messageCarteIntrouvable(serial), { status: 404 });
  }

  const reward = await getMerchantReward(auth.merchant.id);
  const { count: scansToday } = await db
    .from("transactions")
    .select("*", { count: "exact", head: true })
    .eq("customer_id", customer.id)
    .eq("type", "earn")
    .gte("created_at", new Date().toISOString().slice(0, 10));

  return NextResponse.json({
    customer: {
      serial: customer.serial_number,
      firstName: customer.first_name,
      points: customer.points,
      memberSince: customer.created_at,
    },
    programType: auth.merchant.program_type,
    alreadyScannedToday:
      auth.merchant.program_type === "visits" &&
      (scansToday ?? 0) >= auth.merchant.max_scans_per_day,
    reward: reward ? { label: reward.label, cost_points: reward.cost_points } : null,
    // Seuil atteint : la caisse propose « Offrir la récompense », qui remet à zéro.
    rewardAvailable: reward != null && customer.points >= reward.cost_points,
  });
}
