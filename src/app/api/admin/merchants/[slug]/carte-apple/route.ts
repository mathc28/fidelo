import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/platformAdmin";
import { db, getMerchantBySlug } from "@/lib/supabaseAdmin";
import { provisionnerPassTypeId } from "@/lib/passTypeProvisioning";

export const maxDuration = 60;

/*
 * Carte Apple indépendante d'un commerce (son propre Pass Type ID).
 * Back-office plateforme seulement.
 *
 * GET  : état — Pass Type ID, expiration du certificat, répartition des cartes.
 * POST : création (idempotente : sans effet si le commerce en a déjà un).
 */

async function etat(merchantId: string) {
  const [{ data: cert }, { count: dediees }, { count: partagees }] = await Promise.all([
    db
      .from("merchant_pass_certs")
      .select("pass_type_identifier, expires_at")
      .eq("merchant_id", merchantId)
      .maybeSingle(),
    db
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("merchant_id", merchantId)
      .not("pass_type_identifier", "is", null),
    db
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("merchant_id", merchantId)
      .is("pass_type_identifier", null),
  ]);
  return {
    certificat: cert ? { identifier: cert.pass_type_identifier, expiresAt: cert.expires_at } : null,
    cartes: { dediees: dediees ?? 0, partagees: partagees ?? 0 },
  };
}

export async function GET(req: NextRequest, props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  if (!(await requirePlatformAdmin(req))) {
    return new NextResponse("Non autorisé", { status: 401 });
  }
  const merchant = await getMerchantBySlug(params.slug);
  if (!merchant) return new NextResponse("Commerce introuvable", { status: 404 });
  return NextResponse.json(await etat(merchant.id));
}

export async function POST(req: NextRequest, props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  if (!(await requirePlatformAdmin(req))) {
    return new NextResponse("Non autorisé", { status: 401 });
  }
  const merchant = await getMerchantBySlug(params.slug);
  if (!merchant) return new NextResponse("Commerce introuvable", { status: 404 });

  try {
    const r = await provisionnerPassTypeId(merchant.id);
    console.log(
      `[Admin] carte Apple indépendante de ${merchant.slug} : ${r.statut} (${r.identifier})`
    );
  } catch (e) {
    const erreur = (e as Error).message;
    console.error(`[Admin] carte Apple indépendante de ${merchant.slug} en échec :`, erreur);
    return new NextResponse(erreur, { status: 502 });
  }
  return NextResponse.json(await etat(merchant.id));
}
