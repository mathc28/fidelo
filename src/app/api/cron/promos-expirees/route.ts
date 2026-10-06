import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabaseAdmin";
import { pushMerchantPasses } from "@/lib/apns";
import { promoActive } from "@/lib/promo";

/**
 * Tâche planifiée (vercel.json), juste après minuit heure de Paris : retire
 * des cartes Apple le message des promos arrivées en fin d'affichage.
 *
 * Une carte Apple ne se met à jour que si on la pousse. À l'expiration, la
 * carte générée n'a plus de champ « Message » (applePass.ts), mais les iPhone
 * gardent l'ancienne version tant qu'on ne les prévient pas : c'est ce que
 * fait cette tâche. Côté Google, rien à faire : le displayInterval du message
 * suffit.
 *
 * Seule la dernière promo d'un commerce est affichée : si elle a été
 * remplacée par une plus récente encore active, le message a déjà changé sur
 * les cartes, on marque la promo traitée sans rien pousser.
 */
export async function GET(req: NextRequest) {
  // Vercel envoie `Authorization: Bearer <CRON_SECRET>` à ses tâches planifiées.
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("Non autorisé", { status: 401 });
  }

  const maintenant = new Date().toISOString();
  const { data: expirees, error } = await db
    .from("promos")
    .select("id, merchant_id")
    .lte("expires_at", maintenant)
    .is("retired_at", null);
  if (error) {
    console.error("[Promos expirées] lecture en échec :", error.message);
    return new NextResponse(null, { status: 500 });
  }
  if (!expirees?.length) {
    console.log("[Promos expirées] rien à retirer");
    return NextResponse.json({ commerces: 0 });
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
  return NextResponse.json({ commerces: pousses, promos: expirees.length });
}
