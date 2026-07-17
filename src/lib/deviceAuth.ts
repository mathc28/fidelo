import { createHash, randomBytes, randomInt } from "crypto";
import { NextRequest } from "next/server";
import { db, Merchant, getMerchantById } from "./supabaseAdmin";

function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

/** Génère un code d'appairage à 6 chiffres, valable 10 minutes. */
export async function createPairingCode(merchantId: string): Promise<string> {
  const code = randomInt(100000, 999999).toString();
  await db.from("pairing_codes").insert({
    code,
    merchant_id: merchantId,
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });
  return code;
}

/** Échange un code d'appairage contre un token d'appareil (stocké hashé). */
export async function redeemPairingCode(
  code: string,
  label: string
): Promise<{ token: string; merchantName: string } | null> {
  const { data: pc } = await db
    .from("pairing_codes")
    .select("*, merchants(name)")
    .eq("code", code)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (!pc) return null;

  const token = randomBytes(32).toString("hex");
  await db.from("devices").insert({
    merchant_id: pc.merchant_id,
    label: label || "Caisse",
    token_hash: sha256(token),
  });
  await db.from("pairing_codes").update({ used_at: new Date().toISOString() }).eq("code", code);

  return { token, merchantName: (pc as any).merchants?.name ?? "" };
}

/**
 * Authentifie une requête du scanner : header "Authorization: Device <token>".
 * Renvoie le merchant si l'appareil est appairé et non révoqué.
 */
export async function requireDevice(
  req: NextRequest
): Promise<{ merchant: Merchant; deviceId: string } | null> {
  const token = req.headers.get("authorization")?.replace("Device ", "");
  if (!token) return null;

  const { data: device } = await db
    .from("devices")
    .select("id, merchant_id")
    .eq("token_hash", sha256(token))
    .is("revoked_at", null)
    .single();

  if (!device) return null;

  const merchant = await getMerchantById(device.merchant_id);
  if (!merchant) return null;

  db.from("devices").update({ last_seen_at: new Date().toISOString() }).eq("id", device.id).then();

  return { merchant, deviceId: device.id };
}
