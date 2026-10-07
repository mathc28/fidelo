import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/platformAdmin";
import { db } from "@/lib/supabaseAdmin";
import { rafraichirCartesCommerce } from "@/lib/apns";

// Un commerce après l'autre : avec beaucoup de commerces, ce plafond (60 s
// sur l'offre gratuite de Vercel) deviendra la limite.
export const maxDuration = 60;

/**
 * POST — « Mettre à jour toutes les cartes » de tous les commerces, sans
 * notification. Back-office plateforme seulement.
 */
export async function POST(req: NextRequest) {
  if (!(await requirePlatformAdmin(req))) {
    return new NextResponse("Non autorisé", { status: 401 });
  }

  const { data: merchants, error } = await db.from("merchants").select("id, slug");
  if (error) return new NextResponse("Liste des commerces illisible", { status: 500 });

  let appareils = 0;
  let acceptes = 0;
  for (const m of merchants ?? []) {
    const r = await rafraichirCartesCommerce(m.id);
    appareils += r.appareils;
    acceptes += r.acceptes;
  }

  console.log(
    `[Admin] cartes de ${merchants?.length ?? 0} commerce(s) remises à niveau : ${acceptes}/${appareils} envoi(s) accepté(s) par Apple`
  );
  return NextResponse.json({ commerces: merchants?.length ?? 0, appareils, acceptes });
}
