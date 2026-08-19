import { GoogleAuth } from "google-auth-library";
import jwt from "jsonwebtoken";
import { config } from "./config";
import { db, Customer, Merchant, Reward, getCardTheme } from "./supabaseAdmin";

const API = "https://walletobjects.googleapis.com/walletobjects/v1";

const auth = new GoogleAuth({
  credentials: { client_email: config.google.saEmail, private_key: config.google.saKey() },
  scopes: ["https://www.googleapis.com/auth/wallet_object.issuer"],
});

async function request(method: "GET" | "POST" | "PATCH", url: string, body?: unknown) {
  const client = await auth.getClient();
  return client.request({ method, url, data: body }).catch((e) => {
    if (e?.response?.status === 409) return e.response;
    throw e;
  });
}

function slugToClassSuffix(slug: string): string {
  return slug.replace(/[^a-zA-Z0-9_-]/g, "_");
}

/**
 * Crée la loyaltyClass du merchant si nécessaire, puis la resynchronise à
 * chaque appel : logo, couleurs et libellés du commerce sont repoussés vers
 * Google, sinon un changement fait depuis le dashboard ne serait jamais
 * visible sur les cartes déjà installées.
 */
export async function ensureMerchantClass(merchant: Merchant): Promise<string> {
  const theme = await getCardTheme(merchant.theme_id);
  const classId =
    merchant.google_class_id ?? `${config.google.issuerId}.${slugToClassSuffix(merchant.slug)}`;

  // programLogo veut un carré 660x660 plein bleed avec marge (Google masque
  // en cercle) — distinct de merchant.logo_url, qui reste le petit avatar
  // recadré utilisé dans notre propre UI. Voir lib/wallet/logo-pipeline.ts.
  const googleLogoUrl = merchant.logo_url
    ? db.storage.from("pass-assets").getPublicUrl(`${merchant.id}/google-logo.png`).data.publicUrl
    : `${config.baseUrl}/logo-default.png`;

  // Le nom du commerce vit dans issuerName : programName reste générique pour
  // que la carte s'annonce comme une carte de fidélité chez tous les clients.
  const classFields = {
    issuerName: merchant.name,
    programName: "Carte de fidélité",
    programLogo: {
      sourceUri: { uri: googleLogoUrl },
      contentDescription: { defaultValue: { language: "fr-FR", value: `Logo ${merchant.name}` } },
    },
    hexBackgroundColor: theme.bg_color,
    ...(merchant.lat != null && merchant.lng != null
      ? { locations: [{ latitude: merchant.lat, longitude: merchant.lng }] }
      : {}),
  };

  if (merchant.google_class_id) {
    // reviewStatus est volontairement absent du PATCH : le renvoyer à
    // UNDER_REVIEW ferait repasser en revue une classe déjà approuvée.
    await request("PATCH", `${API}/loyaltyClass/${classId}`, classFields);
    return classId;
  }

  await request("POST", `${API}/loyaltyClass`, {
    id: classId,
    ...classFields,
    reviewStatus: "UNDER_REVIEW",
  });

  await db.from("merchants").update({ google_class_id: classId }).eq("id", merchant.id);
  return classId;
}

/** Ordinal français au masculin (passage) : 1 → "1er", n → "ne". */
export function frenchOrdinal(n: number): string {
  return n === 1 ? "1er" : `${n}e`;
}

/**
 * Résumé statique du programme, affiché sur la carte : seuil + libellé de la
 * première récompense active. null si le commerce n'en a aucune.
 *
 * Le seuil s'énonce différemment selon le mode : un passage se compte
 * ("au 10e passage"), des points s'accumulent ("à 100 points").
 */
export function rewardSummary(rewards: Reward[], isVisits: boolean): string | null {
  const first = rewards.filter((r) => r.active).sort((a, b) => a.cost_points - b.cost_points)[0];
  if (!first) return null;

  const threshold = isVisits
    ? `au ${frenchOrdinal(first.cost_points)} passage`
    : `à ${first.cost_points} points`;
  return `${first.label} ${threshold}`;
}

function objectId(serial: string): string {
  return `${config.google.issuerId}.${serial.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

export async function ensureLoyaltyObject(
  customer: Customer,
  merchant: Merchant,
  rewards: Reward[] = []
): Promise<string> {
  const classId = await ensureMerchantClass(merchant);
  const id = objectId(customer.serial_number);
  const isVisits = merchant.program_type === "visits";
  const reward = rewardSummary(rewards, isVisits);

  await request("POST", `${API}/loyaltyObject`, {
    id,
    classId,
    state: "ACTIVE",
    accountId: customer.email,
    accountName: customer.first_name,
    loyaltyPoints: {
      label: isVisits ? "Passages" : "Points",
      balance: { int: customer.points },
    },
    textModulesData: [
      { id: "member", header: "Membre", body: customer.first_name },
      ...(reward ? [{ id: "reward", header: "Récompense", body: reward }] : []),
    ],
    barcode: {
      type: "QR_CODE",
      value: customer.serial_number,
      alternateText: customer.serial_number.slice(0, 8).toUpperCase(),
    },
  });
  return id;
}

export function buildSaveUrl(customer: Customer, merchant: Merchant): string {
  const classId = `${config.google.issuerId}.${slugToClassSuffix(merchant.slug)}`;
  const claims = {
    iss: config.google.saEmail,
    aud: "google",
    typ: "savetowallet",
    origins: [config.baseUrl],
    payload: { loyaltyObjects: [{ id: objectId(customer.serial_number), classId }] },
  };
  return `https://pay.google.com/gp/v/save/${jwt.sign(claims, config.google.saKey(), { algorithm: "RS256" })}`;
}

export async function updateGooglePoints(customer: Customer, merchant: Merchant): Promise<void> {
  await request("PATCH", `${API}/loyaltyObject/${objectId(customer.serial_number)}`, {
    loyaltyPoints: {
      label: merchant.program_type === "visits" ? "Passages" : "Points",
      balance: { int: customer.points },
    },
  });
}

/** Message sur la classe du merchant = notification à TOUS ses clients Android. */
export async function broadcastMerchantPromo(
  merchant: Merchant,
  title: string,
  body: string
): Promise<void> {
  const classId = await ensureMerchantClass(merchant);
  await request("POST", `${API}/loyaltyClass/${classId}/addMessage`, {
    message: { header: title, body, messageType: "TEXT_AND_NOTIFY" },
  });
}
