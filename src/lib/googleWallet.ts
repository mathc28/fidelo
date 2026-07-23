import { GoogleAuth } from "google-auth-library";
import jwt from "jsonwebtoken";
import { config } from "./config";
import { db, Customer, Merchant, getCardTheme } from "./supabaseAdmin";

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
 * Crée la loyaltyClass du merchant si nécessaire et persiste son id.
 * Appelée paresseusement au premier pass Google du commerce.
 */
export async function ensureMerchantClass(merchant: Merchant): Promise<string> {
  if (merchant.google_class_id) return merchant.google_class_id;

  const theme = await getCardTheme(merchant.theme_id);
  const classId = `${config.google.issuerId}.${slugToClassSuffix(merchant.slug)}`;

  await request("POST", `${API}/loyaltyClass`, {
    id: classId,
    issuerName: merchant.name,
    programName: `Fidelo ${merchant.name}`,
    programLogo: {
      sourceUri: { uri: merchant.logo_url ?? `${config.baseUrl}/logo-default.png` },
      contentDescription: { defaultValue: { language: "fr-FR", value: `Logo ${merchant.name}` } },
    },
    reviewStatus: "UNDER_REVIEW",
    hexBackgroundColor: theme.bg_color,
    ...(merchant.lat != null && merchant.lng != null
      ? { locations: [{ latitude: merchant.lat, longitude: merchant.lng }] }
      : {}),
  });

  await db.from("merchants").update({ google_class_id: classId }).eq("id", merchant.id);
  return classId;
}

function objectId(serial: string): string {
  return `${config.google.issuerId}.${serial.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

export async function ensureLoyaltyObject(customer: Customer, merchant: Merchant): Promise<string> {
  const classId = await ensureMerchantClass(merchant);
  const id = objectId(customer.serial_number);
  const isVisits = merchant.program_type === "visits";

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
