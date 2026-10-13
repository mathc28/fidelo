import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabaseAdmin";
import { bonPassType, court, log } from "@/lib/appleWebService";
import { identifiantEffectif } from "@/lib/passCerts";

/**
 * Après un push, l'iPhone demande quelles cartes ont changé depuis sa
 * dernière synchro. Pas d'authenticationToken ici : Apple n'en envoie pas sur
 * cet appel, qui ne renvoie que des numéros de série.
 *
 * Le marqueur `lastUpdated` est un horodatage en millisecondes, et non la date
 * ISO de Postgres : celle-ci contient un « + » (fuseau +00:00) que l'iPhone
 * renvoie tel quel dans l'URL, où il se lit comme une espace — la date devenait
 * illisible et plus aucune carte n'était signalée comme modifiée.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { deviceId: string; passTypeId: string } }
) {
  const appareil = `appareil ${court(params.deviceId)}`;
  if (!(await bonPassType(params.passTypeId))) {
    log(`liste refusée, Pass Type ID inconnu (${params.passTypeId}) — ${appareil} → 404`);
    return new NextResponse(null, { status: 404 });
  }

  const tag = req.nextUrl.searchParams.get("passesUpdatedSince");
  const depuis = tag && /^\d+$/.test(tag) ? new Date(Number(tag)) : null;

  const { data: regs } = await db
    .from("apple_registrations")
    .select("serial_number")
    .eq("device_library_id", params.deviceId);

  if (!regs?.length) {
    log(`liste : ${appareil} n'a aucune carte enregistrée → 204`);
    return new NextResponse(null, { status: 204 });
  }

  let query = db
    .from("customers")
    .select("serial_number, updated_at, pass_type_identifier")
    .in(
      "serial_number",
      regs.map((r) => r.serial_number)
    );
  if (depuis) query = query.gte("updated_at", depuis.toISOString());

  const { data: lignes, error } = await query;
  // Un même iPhone peut porter des cartes de plusieurs Pass Type IDs ; Apple
  // demande la liste identifiant par identifiant : on ne renvoie que les siennes.
  const modifiees = (lignes ?? []).filter(
    (c) => identifiantEffectif(c.pass_type_identifier) === params.passTypeId
  );
  if (error) {
    log(`liste en échec — ${appareil} → 500 (${error.message})`);
    return new NextResponse(null, { status: 500 });
  }
  if (!modifiees.length) {
    log(
      `liste : rien de nouveau pour ${appareil} depuis ${depuis?.toISOString() ?? "toujours"} → 204`
    );
    return new NextResponse(null, { status: 204 });
  }

  // +1 ms : la milliseconde de la dernière mise à jour est déjà servie, la
  // prochaine synchro repart juste après (updated_at est en microsecondes).
  const plusRecente = Math.max(...modifiees.map((m) => Date.parse(m.updated_at)));
  const lastUpdated = String(plusRecente + 1);

  log(
    `liste : ${modifiees.length} carte(s) modifiée(s) pour ${appareil} — ${modifiees
      .map((m) => court(m.serial_number))
      .join(", ")} → 200`
  );
  return NextResponse.json({
    serialNumbers: modifiees.map((m) => m.serial_number),
    lastUpdated,
  });
}
