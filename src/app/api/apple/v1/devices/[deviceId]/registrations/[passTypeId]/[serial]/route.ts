import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabaseAdmin";
import { authentifier, bonPassType, court, log } from "@/lib/appleWebService";

type Params = { params: Promise<{ deviceId: string; passTypeId: string; serial: string }> };

/**
 * Un iPhone enregistre une carte : il vient de l'ajouter à Wallet (ou de la
 * réactiver) et donne le jeton APNs sur lequel le prévenir des mises à jour.
 * 201 = nouvel enregistrement, 200 = déjà connu (jeton rafraîchi).
 */
export async function POST(req: NextRequest, props: Params) {
  const params = await props.params;
  const quoi = `appareil ${court(params.deviceId)} · carte ${court(params.serial)}`;

  if (!(await bonPassType(params.passTypeId))) {
    log(`enregistrement refusé, Pass Type ID inconnu (${params.passTypeId}) — ${quoi} → 404`);
    return new NextResponse(null, { status: 404 });
  }
  if (!(await authentifier(req, params.serial, params.passTypeId))) {
    log(`enregistrement refusé, authenticationToken invalide — ${quoi} → 401`);
    return new NextResponse(null, { status: 401 });
  }

  const corps = (await req.json().catch(() => null)) as { pushToken?: string } | null;
  if (!corps?.pushToken) {
    log(`enregistrement refusé, pushToken absent — ${quoi} → 400`);
    return new NextResponse(null, { status: 400 });
  }

  const { data: existant } = await db
    .from("apple_registrations")
    .select("id")
    .eq("device_library_id", params.deviceId)
    .eq("serial_number", params.serial)
    .maybeSingle();

  const { error } = await db.from("apple_registrations").upsert(
    {
      device_library_id: params.deviceId,
      serial_number: params.serial,
      push_token: corps.pushToken,
    },
    { onConflict: "device_library_id,serial_number" }
  );

  if (error) {
    log(`enregistrement en échec — ${quoi} → 500 (${error.message})`);
    return new NextResponse(null, { status: 500 });
  }
  const status = existant ? 200 : 201;
  log(`iPhone enregistré — ${quoi} → ${status} (${existant ? "déjà connu" : "nouveau"})`);
  return new NextResponse(null, { status });
}

/** L'iPhone ne veut plus de mises à jour : la carte a été supprimée de Wallet. */
export async function DELETE(req: NextRequest, props: Params) {
  const params = await props.params;
  const quoi = `appareil ${court(params.deviceId)} · carte ${court(params.serial)}`;

  if (!(await bonPassType(params.passTypeId))) {
    log(`désenregistrement refusé, Pass Type ID inconnu (${params.passTypeId}) — ${quoi} → 404`);
    return new NextResponse(null, { status: 404 });
  }
  if (!(await authentifier(req, params.serial, params.passTypeId))) {
    log(`désenregistrement refusé, authenticationToken invalide — ${quoi} → 401`);
    return new NextResponse(null, { status: 401 });
  }

  await db
    .from("apple_registrations")
    .delete()
    .eq("device_library_id", params.deviceId)
    .eq("serial_number", params.serial);
  log(`carte retirée de l'iPhone — ${quoi} → 200`);
  return new NextResponse(null, { status: 200 });
}
