import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabaseAdmin";
import { pushMerchantPasses } from "@/lib/apns";
import { promoActive } from "@/lib/promo";
import { renouvelerCertificatsProches } from "@/lib/passTypeProvisioning";

export const maxDuration = 60;

/**
 * Tâche planifiée quotidienne (vercel.json), juste après minuit heure de
 * Paris. Deux travaux indépendants : l'échec de l'un n'empêche pas l'autre.
 *
 * 1. Promos expirées — retire des cartes Apple le message des promos
 *    arrivées en fin d'affichage. Une carte Apple ne se met à jour que si on
 *    la pousse : à l'expiration, la carte générée n'a plus de champ
 *    « Message » (applePass.ts), mais les iPhone gardent l'ancienne version
 *    tant qu'on ne les prévient pas. Côté Google, le displayInterval du
 *    message suffit. Seule la dernière promo d'un commerce est affichée : si
 *    elle a été remplacée par une plus récente encore active, on marque la
 *    promo traitée sans rien pousser.
 *
 * 2. Certificats Apple des commerces — renouvelle ceux qui expirent dans
 *    moins de 30 jours (passTypeProvisioning.ts).
 */
export async function GET(req: NextRequest) {
  // Vercel envoie `Authorization: Bearer <CRON_SECRET>` à ses tâches planifiées.
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("Non autorisé", { status: 401 });
  }

  let promos: { commerces: number; promos: number } | { erreur: string };
  try {
    promos = await retirerPromosExpirees();
  } catch (e) {
    console.error("[Promos expirées] en échec :", (e as Error).message);
    promos = { erreur: (e as Error).message };
  }

  let certificats: Awaited<ReturnType<typeof renouvelerCertificatsProches>> | { erreur: string };
  try {
    certificats = await renouvelerCertificatsProches(30);
  } catch (e) {
    console.error("[Pass Type ID] vérification des certificats en échec :", (e as Error).message);
    certificats = { erreur: (e as Error).message };
  }

  const enEchec = "erreur" in promos || "erreur" in certificats;
  return NextResponse.json({ promos, certificats }, { status: enEchec ? 500 : 200 });
}

async function retirerPromosExpirees(): Promise<{ commerces: number; promos: number }> {
  const maintenant = new Date().toISOString();
  const { data: expirees, error } = await db
    .from("promos")
    .select("id, merchant_id")
    .lte("expires_at", maintenant)
    .is("retired_at", null);
  if (error) throw new Error(`lecture en échec : ${error.message}`);
  if (!expirees?.length) {
    console.log("[Promos expirées] rien à retirer");
    return { commerces: 0, promos: 0 };
  }

  const commerces = [...new Set(expirees.map((p) => p.merchant_id))];
  let pousses = 0;

  for (const merchantId of commerces) {
    // Le message affiché est celui de la dernière promo : est-elle expirée ?
    const { data: derniere } = await db
      .from("promos")
      .select("expires_at")
      .eq("merchant_id", merchantId)
      .order("sent_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (derniere && !promoActive(derniere.expires_at)) {
      await db
        .from("customers")
        .update({ updated_at: new Date().toISOString() })
        .eq("merchant_id", merchantId);
      const acceptes = await pushMerchantPasses(merchantId);
      pousses++;
      console.log(
        `[Promos expirées] commerce ${merchantId.slice(0, 8)} : message retiré, ${acceptes} iPhone prévenu(s)`
      );
    }
  }

  await db
    .from("promos")
    .update({ retired_at: maintenant })
    .in(
      "id",
      expirees.map((p) => p.id)
    );

  console.log(
    `[Promos expirées] ${expirees.length} promo(s) traitée(s), ${pousses} commerce(s) mis à jour`
  );
  return { commerces: pousses, promos: expirees.length };
}
