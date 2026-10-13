import { timingSafeEqual } from "crypto";
import { NextRequest } from "next/server";
import { db, type Customer } from "./supabaseAdmin";
import { identifiantConnu, identifiantEffectif } from "./passCerts";

/*
 * Outils communs au web service Apple Wallet (/api/apple/v1/…), l'API que
 * l'iPhone appelle de lui-même pour enregistrer une carte et la tenir à jour.
 * Les logs portent le préfixe [Apple WS] pour les filtrer dans Vercel.
 */

export function log(message: string): void {
  console.log(`[Apple WS] ${message}`);
}

/** Les 8 premiers caractères suffisent à reconnaître un appareil ou une carte. */
export function court(id: string): string {
  return id.slice(0, 8);
}

/**
 * Le web service ne répond que pour nos Pass Type IDs : l'identifiant partagé
 * du .env et ceux des commerces (merchant_pass_certs). Tout autre est rejeté.
 */
export async function bonPassType(passTypeId: string): Promise<boolean> {
  return identifiantConnu(passTypeId);
}

function egaux(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/**
 * Vérifie l'en-tête `Authorization: ApplePass <authenticationToken>` contre le
 * jeton propre à la carte (customers.auth_token, embarqué dans le .pkpass), et
 * que la carte relève bien du Pass Type ID de l'URL. Renvoie le client si les
 * deux correspondent, null sinon.
 */
export async function authentifier(
  req: NextRequest,
  serial: string,
  passTypeId: string
): Promise<Customer | null> {
  const entete = req.headers.get("authorization") ?? "";
  if (!entete.startsWith("ApplePass ")) return null;
  const jeton = entete.slice("ApplePass ".length);

  const { data } = await db
    .from("customers")
    .select("*")
    .eq("serial_number", serial)
    .maybeSingle<Customer>();
  if (!data || !egaux(data.auth_token, jeton)) return null;
  return identifiantEffectif(data.pass_type_identifier) === passTypeId ? data : null;
}
