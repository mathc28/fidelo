import { NextRequest, NextResponse } from "next/server";
import { exigerCommercantAJour } from "@/lib/cgvServeur";
import { db } from "@/lib/supabaseAdmin";
import { geocodeAddress } from "@/lib/geocode";
import { touchMerchantPasses } from "@/lib/passAssets";
import { pushMerchantPasses } from "@/lib/apns";

/** Met à jour le nom, la couleur et l'adresse (géocodée) de la carte du merchant connecté. */
export async function POST(req: NextRequest) {
  const garde = await exigerCommercantAJour(req);
  if ("reponse" in garde) return garde.reponse;
  const { merchant } = garde;

  const { name, themeId, address } = await req.json();
  const updates: Record<string, unknown> = {};

  if (typeof name === "string" && name.trim()) {
    updates.name = name.trim();
  }

  if (typeof themeId === "string" && themeId) {
    updates.theme_id = themeId;
  }

  if (typeof address === "string") {
    const trimmed = address.trim();
    updates.address = trimmed || null;
    const geo = trimmed ? await geocodeAddress(trimmed) : null;
    updates.lat = geo?.lat ?? null;
    updates.lng = geo?.lng ?? null;
  }

  const { data, error } = await db
    .from("merchants")
    .update(updates)
    .eq("id", merchant.id)
    .select()
    .single();

  if (error) {
    if (error.code === "23503") return new NextResponse("Thème invalide", { status: 400 });
    console.error(`[Profil] mise à jour du commerce ${merchant.slug} échouée :`, error.message);
    return new NextResponse("La carte n'a pas pu être enregistrée. Réessayez dans un instant.", {
      status: 500,
    });
  }

  // Nom, couleurs et adresse sont tous rendus sur le pass : mêmes raisons
  // qu'à l'upload de logo, il faut marquer les pass clients comme modifiés.
  await touchMerchantPasses(merchant.id);
  await pushMerchantPasses(merchant.id).catch(() => {});

  return NextResponse.json({ ok: true, merchant: data, geocoded: data.lat != null });
}
