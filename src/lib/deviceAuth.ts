import { createHash, randomBytes, randomInt } from "crypto";
import { NextRequest } from "next/server";
import { db, Merchant, getMerchantById } from "./supabaseAdmin";
import { LONGUEUR_CODE, genererCode, normaliserCode } from "./codeAppairage";

function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

const DUREE_CODE_MS = 10 * 60 * 1000;
const TIRAGES_MAX = 5;

/**
 * Génère un code d'appairage (8 caractères, voir codeAppairage.ts), valable
 * 10 minutes. Le code est la clé primaire de pairing_codes : en cas de
 * collision avec un code existant (erreur 23505), on retire au sort au lieu
 * de renvoyer un code qui appartiendrait à un autre commerce.
 */
export async function createPairingCode(merchantId: string): Promise<string> {
  // Ménage : les codes expirés (utilisés ou non) ne servent plus à rien.
  await db.from("pairing_codes").delete().lt("expires_at", new Date().toISOString());

  for (let tirage = 1; tirage <= TIRAGES_MAX; tirage++) {
    const code = genererCode(randomInt);
    const { error } = await db.from("pairing_codes").insert({
      code,
      merchant_id: merchantId,
      expires_at: new Date(Date.now() + DUREE_CODE_MS).toISOString(),
    });
    if (!error) return code;
    if (error.code !== "23505")
      throw new Error(`Code d'appairage non enregistré : ${error.message}`);
  }
  throw new Error("Code d'appairage : collisions répétées, réessayez");
}

/**
 * Échange un code d'appairage contre un token d'appareil (stocké hashé).
 * Atomique : un seul UPDATE … WHERE used_at IS NULL AND expires_at > now()
 * RETURNING consomme le code. Deux caisses qui saisissent le même code en
 * même temps ne peuvent pas l'utiliser toutes les deux.
 */
export async function redeemPairingCode(
  saisie: string,
  libelle: string
): Promise<{ token: string; merchantName: string } | null> {
  const code = normaliserCode(saisie);
  if (code.length !== LONGUEUR_CODE) return null;

  const maintenant = new Date().toISOString();
  const { data: pc } = await db
    .from("pairing_codes")
    .update({ used_at: maintenant })
    .eq("code", code)
    .is("used_at", null)
    .gt("expires_at", maintenant)
    .select("merchant_id, merchants(name)")
    .maybeSingle();

  if (!pc) return null;

  const token = randomBytes(32).toString("hex");
  const { error } = await db.from("devices").insert({
    merchant_id: pc.merchant_id,
    // Libellé déjà validé par la route (validerLibelleCaisse) ; repli par sécurité.
    label: libelle.slice(0, 50) || "Caisse",
    token_hash: sha256(token),
  });
  if (error) throw new Error(`Caisse non enregistrée : ${error.message}`);

  const merchants = (pc as { merchants?: { name?: string } | { name?: string }[] }).merchants;
  const merchantName = (Array.isArray(merchants) ? merchants[0]?.name : merchants?.name) ?? "";
  return { token, merchantName };
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

/**
 * Message quand un QR scanné en caisse ne correspond à aucun client du
 * commerce de la caisse. On distingue la carte d'un autre commerce Fiduo
 * (erreur fréquente : le client présente la mauvaise carte de son Wallet) d'un
 * QR qui n'est pas une carte du tout — sans jamais nommer l'autre commerce.
 */
export async function messageCarteIntrouvable(serial: unknown): Promise<string> {
  if (typeof serial !== "string" || !serial) return "Carte inconnue";
  const { count } = await db
    .from("customers")
    .select("id", { count: "exact", head: true })
    .eq("serial_number", serial);
  return count ? "Cette carte appartient à un autre commerce" : "Carte inconnue";
}
