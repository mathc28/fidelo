import { NextRequest, NextResponse } from "next/server";
import { requireMerchant, requireMerchantEtCompte } from "@/lib/dashboardAuth";
import { isPlatformAdminEmail } from "@/lib/platformAdmin";
import { doitAccepterCgv } from "@/lib/cgv";
import { db } from "@/lib/supabaseAdmin";
import { CGV_VERSION } from "@/lib/site";

/**
 * GET — le gérant connecté doit-il accepter les CGV en vigueur avant
 * d'accéder à son dashboard ? (Jamais pour un admin plateforme.)
 */
export async function GET(req: NextRequest) {
  const auth = await requireMerchantEtCompte(req);
  if (!auth) return new NextResponse("Non autorisé", { status: 401 });
  return NextResponse.json({
    doitAccepter: doitAccepterCgv(auth.merchant.cgv_version, isPlatformAdminEmail(auth.email)),
    versionEnVigueur: CGV_VERSION,
    versionAcceptee: auth.merchant.cgv_version,
  });
}

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
