import { timingSafeEqual } from "crypto";
import { NextRequest } from "next/server";
import { config } from "./config";
import { db, type Customer } from "./supabaseAdmin";

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

/** Le web service ne répond que pour notre Pass Type ID. */
export function bonPassType(passTypeId: string): boolean {
  return passTypeId === config.apple.passTypeId;
}

function egaux(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/**
 * Vérifie l'en-tête `Authorization: ApplePass <authenticationToken>` contre le
 * jeton propre à la carte (customers.auth_token, embarqué dans le .pkpass).
 * Renvoie le client si le jeton correspond, null sinon.
 */
export async function authentifier(req: NextRequest, serial: string): Promise<Customer | null> {
  const entete = req.headers.get("authorization") ?? "";
  if (!entete.startsWith("ApplePass ")) return null;
  const jeton = entete.slice("ApplePass ".length);

  const { data } = await db
    .from("customers")
    .select("*")
    .eq("serial_number", serial)
    .maybeSingle<Customer>();
  return data && egaux(data.auth_token, jeton) ? data : null;
}
