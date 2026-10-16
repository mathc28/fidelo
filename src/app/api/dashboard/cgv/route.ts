import { NextRequest, NextResponse } from "next/server";
import { requireMerchant } from "@/lib/dashboardAuth";
import { db } from "@/lib/supabaseAdmin";
import { CGV_VERSION } from "@/lib/site";

/**
 * POST — le gérant connecté accepte les CGV (et l'accord de sous-traitance
 * qu'elles contiennent). La version et la date viennent du serveur, jamais
 * du navigateur : c'est ce qui en fait une preuve.
 */
export async function POST(req: NextRequest) {
  const merchant = await requireMerchant(req);
  if (!merchant) return new NextResponse("Non autorisé", { status: 401 });

  const acceptedAt = new Date().toISOString();
  const { error } = await db
    .from("merchants")
    .update({ cgv_accepted_at: acceptedAt, cgv_version: CGV_VERSION })
    .eq("id", merchant.id);
  if (error) {
    console.error(`[CGV] acceptation non enregistrée — commerce ${merchant.slug} :`, error.message);
    return new NextResponse("L'acceptation des CGV n'a pas pu être enregistrée", { status: 500 });
  }

  console.log(`[CGV] version ${CGV_VERSION} acceptée — commerce ${merchant.slug}`);
  return NextResponse.json({ cgv_version: CGV_VERSION, cgv_accepted_at: acceptedAt });
}
