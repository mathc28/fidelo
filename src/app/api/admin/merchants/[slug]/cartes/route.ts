import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/platformAdmin";
import { getMerchantBySlug } from "@/lib/supabaseAdmin";
import { rafraichirCartesCommerce } from "@/lib/apns";

export const maxDuration = 60;

/**
 * POST — « Mettre à jour toutes les cartes » d'un commerce : chaque iPhone
 * retélécharge sa carte, sans notification. Back-office plateforme seulement.
 */
export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  if (!(await requirePlatformAdmin(req))) {
    return new NextResponse("Non autorisé", { status: 401 });
  }

  const merchant = await getMerchantBySlug(params.slug);
  if (!merchant) return new NextResponse("Commerce introuvable", { status: 404 });

  const resultat = await rafraichirCartesCommerce(merchant.id);
  console.log(
    `[Admin] cartes de ${merchant.slug} remises à niveau : ${resultat.acceptes}/${resultat.appareils} envoi(s) accepté(s) par Apple`
  );
  return NextResponse.json(resultat);
}
