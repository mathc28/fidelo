import { NextRequest, NextResponse } from "next/server";
import { requireMerchant } from "@/lib/dashboardAuth";
import { db } from "@/lib/supabaseAdmin";
import { geocodeAddress } from "@/lib/geocode";

/** Met à jour le nom, la couleur et l'adresse (géocodée) de la carte du merchant connecté. */
export async function POST(req: NextRequest) {
  const merchant = await requireMerchant(req);
  if (!merchant) return new NextResponse("Non autorisé", { status: 401 });

  const { name, bgColor, address } = await req.json();
  const updates: Record<string, unknown> = {};

  if (typeof name === "string" && name.trim()) {
    updates.name = name.trim();
  }

  if (typeof bgColor === "string" && bgColor) {
    updates.bg_color = bgColor;
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

  if (error) return new NextResponse(error.message, { status: 500 });

  return NextResponse.json({ ok: true, merchant: data, geocoded: data.lat != null });
}
