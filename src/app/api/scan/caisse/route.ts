import { NextRequest, NextResponse } from "next/server";
import { requireDevice } from "@/lib/deviceAuth";
import { db } from "@/lib/supabaseAdmin";

/*
 * La caisse elle-même, identifiée par son jeton d'appairage
 * (`Authorization: Device <token>`). Le commerce vient toujours du jeton,
 * jamais de l'URL : /scan est la même adresse pour tous les commerces.
 */

/** À quel commerce cette caisse est-elle appairée ? */
export async function GET(req: NextRequest) {
  const auth = await requireDevice(req);
  if (!auth) return new NextResponse("Appareil non appairé", { status: 401 });
  return NextResponse.json({ merchantName: auth.merchant.name });
}

/** « Déconnecter cette caisse » : le jeton est révoqué, il ne servira plus. */
export async function DELETE(req: NextRequest) {
  const auth = await requireDevice(req);
  if (!auth) return new NextResponse("Appareil non appairé", { status: 401 });

  const { error } = await db
    .from("devices")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", auth.deviceId);
  if (error) return new NextResponse("La caisse n'a pas pu être déconnectée", { status: 500 });

  return new NextResponse(null, { status: 204 });
}
