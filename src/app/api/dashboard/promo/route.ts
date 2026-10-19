import { NextRequest, NextResponse } from "next/server";
import { exigerCommercantAJour } from "@/lib/cgvServeur";
import { db, merchantActive } from "@/lib/supabaseAdmin";
import { pushMerchantPasses } from "@/lib/apns";
import { broadcastMerchantPromo } from "@/lib/googleWallet";
import {
  DUREE_PROMO_DEFAUT,
  MAX_PROMOS,
  PROMO_WINDOW_MS,
  dureeValide,
  finAffichage,
} from "@/lib/promo";

/** Giga promo du merchant connecté : push Apple + Google, avec anti-spam. */
export async function POST(req: NextRequest) {
  const garde = await exigerCommercantAJour(req);
  if ("reponse" in garde) return garde.reponse;
  const { merchant } = garde;
  if (!merchantActive(merchant)) return new NextResponse("Abonnement inactif", { status: 402 });

  const { title, message, dureeJours } = await req.json();
  if (!message) return new NextResponse("Message requis", { status: 400 });
  // Durée d'affichage sur la carte : 3 jours si le client n'en dit rien.
  const duree = dureeJours ?? DUREE_PROMO_DEFAUT;
  if (!dureeValide(duree)) {
    return new NextResponse("Durée d'affichage invalide : 1, 3 ou 7 jours", { status: 400 });
  }
  const expiresAt = finAffichage(duree);

  // Anti-spam : protège la valeur du canal pour tout le monde
  const weekAgo = new Date(Date.now() - PROMO_WINDOW_MS).toISOString();
  const { count } = await db
    .from("promos")
    .select("*", { count: "exact", head: true })
    .eq("merchant_id", merchant.id)
    .gte("sent_at", weekAgo);

  if ((count ?? 0) >= MAX_PROMOS) {
    return new NextResponse(`Limite atteinte : ${MAX_PROMOS} promos sur 7 jours glissants`, {
      status: 429,
    });
  }

  // 1. La promo est enregistrée AVANT tout push : la carte Apple lit le
  //    dernier message en base au moment où l'iPhone la retélécharge, ce qui
  //    peut arriver dans la seconde qui suit le push.
  const { data: promo, error } = await db
    .from("promos")
    .insert({
      merchant_id: merchant.id,
      title: title || null,
      message,
      expires_at: expiresAt.toISOString(),
    })
    .select("id")
    .single();
  if (error || !promo) {
    console.error(`[Promo] enregistrement en échec — commerce ${merchant.slug} :`, error?.message);
    return new NextResponse("La promo n'a pas pu être enregistrée", { status: 500 });
  }

  // 2. Toutes les cartes du commerce sont marquées modifiées, pour que les
  //    iPhone les signalent dans passesUpdatedSince.
  await db
    .from("customers")
    .update({ updated_at: new Date().toISOString() })
    .eq("merchant_id", merchant.id);

  // 3. Puis seulement les push : APNs pour les iPhone, addMessage pour Google.
  const [appleCount] = await Promise.all([
    pushMerchantPasses(merchant.id),
    broadcastMerchantPromo(merchant, title || merchant.name, message, expiresAt)
      .then(() =>
        console.log(`[Google Wallet] promo envoyée (TEXT_AND_NOTIFY) — commerce ${merchant.slug}`)
      )
      .catch((e) =>
        console.error(
          `[Google Wallet] promo en échec — commerce ${merchant.slug} :`,
          e?.response?.status ?? "",
          JSON.stringify(e?.response?.data ?? e?.message)
        )
      ),
  ]);

  await db.from("promos").update({ apple_devices_notified: appleCount }).eq("id", promo.id);

  return NextResponse.json({
    ok: true,
    apple_devices_notified: appleCount,
    expires_at: expiresAt.toISOString(),
  });
}
