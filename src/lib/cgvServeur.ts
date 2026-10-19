import { NextRequest, NextResponse } from "next/server";
import type { Merchant } from "./supabaseAdmin";
import { requireMerchantEtCompte } from "./dashboardAuth";
import { isPlatformAdminEmail } from "./platformAdmin";
import { ERREUR_CGV, doitAccepterCgv } from "./cgv";

export { ERREUR_CGV };

/**
 * Garde unique des routes /api/dashboard/* qui modifient des données :
 * gérant connecté ET CGV en vigueur acceptées (sauf admin plateforme).
 *
 *   const garde = await exigerCommercantAJour(req);
 *   if ("reponse" in garde) return garde.reponse;
 *   const { merchant } = garde;
 *
 * Seule /api/dashboard/cgv s'en passe : c'est elle qui enregistre l'acceptation.
 */
export async function exigerCommercantAJour(
  req: NextRequest
): Promise<{ merchant: Merchant } | { reponse: NextResponse }> {
  const auth = await requireMerchantEtCompte(req);
  if (!auth) return { reponse: new NextResponse("Non autorisé", { status: 401 }) };

  if (doitAccepterCgv(auth.merchant.cgv_version, isPlatformAdminEmail(auth.email))) {
    return { reponse: NextResponse.json({ error: ERREUR_CGV }, { status: 403 }) };
  }
  return { merchant: auth.merchant };
}
