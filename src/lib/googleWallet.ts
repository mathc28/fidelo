import { GoogleAuth } from "google-auth-library";
import jwt from "jsonwebtoken";
import { config } from "./config";
import { db, Customer, Merchant, Reward, getCardTheme } from "./supabaseAdmin";

const API = "https://walletobjects.googleapis.com/walletobjects/v1";

const auth = new GoogleAuth({
  credentials: { client_email: config.google.saEmail, private_key: config.google.saKey() },
  scopes: ["https://www.googleapis.com/auth/wallet_object.issuer"],
});

/**
 * `tolerate` liste les statuts d'erreur rendus à l'appelant au lieu d'être
 * levés : 409 par défaut (ressource déjà créée, cas normal sur nos POST
 * idempotents), à surcharger quand le statut fait partie de la logique.
 */
async function request(
  method: "GET" | "POST" | "PATCH",
  url: string,
  body?: unknown,
  tolerate: number[] = [409]
) {
  const client = await auth.getClient();
  return client.request({ method, url, data: body }).catch((e) => {
    if (tolerate.includes(e?.response?.status)) return e.response;
    throw e;
  });
}

function slugToClassSuffix(slug: string): string {
  return slug.replace(/[^a-zA-Z0-9_-]/g, "_");
}

/**
 * Id de classe dérivé du slug, jamais lu depuis la base : merchants.google_class_id
 * n'est qu'une trace de ce qui a été poussé, pas la source de vérité (buildSaveUrl
 * recalcule déjà l'id de la même façon).
 */
function merchantClassId(merchant: Merchant): string {
  return `${config.google.issuerId}.${slugToClassSuffix(merchant.slug)}`;
}

/**
 * Crée la loyaltyClass du merchant si nécessaire, puis la resynchronise à
 * chaque appel : logo, couleurs et libellés du commerce sont repoussés vers
 * Google, sinon un changement fait depuis le dashboard ne serait jamais
 * visible sur les cartes déjà installées.
 */
export async function ensureMerchantClass(merchant: Merchant): Promise<string> {
  const theme = await getCardTheme(merchant.theme_id);
  const classId = merchantClassId(merchant);

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
    // Recto de la carte. Sans override, Google n'y affiche que le solde ; on
    // ajoute donc une seconde ligne prénom + récompense. Les fieldPath sont
    // résolus par objet au rendu, d'où les références en `object.*` sur une
    // ressource de classe. Trois lignes maximum.
    classTemplateInfo: {
      cardTemplateOverride: {
        cardRowTemplateInfos: [
          // Le compteur reste seul sur sa ligne : pleine largeur = info principale.
          {
            oneItem: {
              item: { firstValue: { fields: [{ fieldPath: "object.loyaltyPoints.balance" }] } },
            },
          },
          {
            twoItems: {
              startItem: { firstValue: { fields: [{ fieldPath: "object.accountName" }] } },
              // Absent tant que le commerce n'a aucune récompense active : Google
              // rend alors la moitié droite vide plutôt que d'échouer.
              endItem: {
                firstValue: { fields: [{ fieldPath: "object.textModulesData['reward']" }] },
              },
            },
          },
        ],
      },
    },
    ...(merchant.lat != null && merchant.lng != null
      ? { locations: [{ latitude: merchant.lat, longitude: merchant.lng }] }
      : {}),
  };

  // On tente toujours le PATCH, sans regarder merchant.google_class_id : la
  // classe peut très bien exister chez Google alors que la colonne est vide
  // (vidée à la main, base restaurée…). Partir sur un POST dans ce cas donne un
  // 409 et la mise à jour est perdue — c'est exactement ce qui figeait
  // programName et le logo sur leurs anciennes valeurs.
  //
  // reviewStatus DOIT accompagner le PATCH : sur une classe déjà approuvée,
  // Google rejette toute mise à jour qui l'omet (Invalid review status
  // « APPROVED ». Use « UNDER_REVIEW » instead, 400) — il exige qu'on resoumette
  // explicitement la classe à revue. En pratique il conserve le statut approved,
  // les cartes déjà installées ne repassent donc pas en attente.
  const patched = await request(
    "PATCH",
    `${API}/loyaltyClass/${classId}`,
    { ...classFields, reviewStatus: "UNDER_REVIEW" },
    [404]
  );

  // 404 = la classe est réellement absente chez Google, c'est le seul cas où on crée.
  if (patched.status === 404) {
    await request("POST", `${API}/loyaltyClass`, {
      id: classId,
      ...classFields,
      reviewStatus: "UNDER_REVIEW",
    });
  }

  if (merchant.google_class_id !== classId) {
    await db.from("merchants").update({ google_class_id: classId }).eq("id", merchant.id);
  }
  return classId;
}

/** Ordinal français au masculin (passage) : 1 → "1er", n → "ne". */
export function frenchOrdinal(n: number): string {
  return n === 1 ? "1er" : `${n}e`;
}

/**
 * Résumé statique du programme, affiché sur la carte : seuil + libellé de la
 * récompense du commerce. null s'il n'en a aucune.
 *
 * Le seuil s'énonce différemment selon le mode : un passage se compte
 * ("au 10e passage"), des points s'accumulent ("à 100 points").
 */
export function rewardSummary(reward: Reward | null, isVisits: boolean): string | null {
  if (!reward) return null;

  const threshold = isVisits
    ? `au ${frenchOrdinal(reward.cost_points)} passage`
    : `à ${reward.cost_points} points`;
  return `${reward.label} ${threshold}`;
}

function objectId(serial: string): string {
  return `${config.google.issuerId}.${serial.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

export async function ensureLoyaltyObject(
  customer: Customer,
  merchant: Merchant,
  reward: Reward | null = null
): Promise<string> {
  const classId = await ensureMerchantClass(merchant);
  const id = objectId(customer.serial_number);
  const isVisits = merchant.program_type === "visits";
  const summary = rewardSummary(reward, isVisits);

  const objectFields = {
    classId,
    state: "ACTIVE",
    accountId: customer.email,
    accountName: customer.first_name,
    loyaltyPoints: {
      label: isVisits ? "Passages" : "Points",
      balance: { int: customer.points },
    },
    // Le prénom vient d'accountName seul : un textModule « Membre » ferait
    // doublon avec le « Nom de membre » natif dans la vue détails.
    textModulesData: summary ? [{ id: "reward", header: "Récompense", body: summary }] : [],
    barcode: {
      type: "QR_CODE",
      value: customer.serial_number,
      alternateText: customer.serial_number.slice(0, 8).toUpperCase(),
    },
  };

  // Même logique que pour la classe : PATCH d'abord, création seulement sur 404.
  // Un POST sur un objet existant renvoie 409 et ne met rien à jour — les cartes
  // déjà installées garderaient indéfiniment leurs anciens textModules.
  const patched = await request("PATCH", `${API}/loyaltyObject/${id}`, objectFields, [404]);

  if (patched.status === 404) {
    await request("POST", `${API}/loyaltyObject`, { id, ...objectFields });
  }
  return id;
}

export function buildSaveUrl(customer: Customer, merchant: Merchant): string {
  const classId = merchantClassId(merchant);
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
