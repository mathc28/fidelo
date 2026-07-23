import { PKPass } from "passkit-generator";
import { config } from "./config";
import { Customer, Merchant, Reward, getCardTheme } from "./supabaseAdmin";
import { getPassImages } from "./passAssets";

/**
 * Génère le .pkpass d'un client, entièrement paramétré par son merchant :
 * couleurs, nom, géoloc, vocabulaire (passages vs points), progression
 * vers la prochaine récompense.
 */
export async function buildApplePass(
  customer: Customer,
  merchant: Merchant,
  rewards: Reward[]
): Promise<Buffer> {
  const images = await getPassImages(merchant);
  const theme = await getCardTheme(merchant.theme_id);
  const isVisits = merchant.program_type === "visits";

  const nextReward = rewards
    .filter((r) => r.active)
    .sort((a, b) => a.cost_points - b.cost_points)
    .find((r) => r.cost_points > customer.points);
  const reachedReward = rewards
    .filter((r) => r.active && r.cost_points <= customer.points)
    .sort((a, b) => b.cost_points - a.cost_points)[0];

  const pass = new PKPass(
    images,
    {
      wwdr: config.apple.wwdrCert(),
      signerCert: config.apple.signerCert(),
      signerKey: config.apple.signerKey(),
      signerKeyPassphrase: config.apple.signerKeyPassphrase,
    },
    {
      formatVersion: 1,
      passTypeIdentifier: config.apple.passTypeId,
      teamIdentifier: config.apple.teamId,
      serialNumber: customer.serial_number,
      organizationName: merchant.name,
      description: `Carte de fidélité ${merchant.name}`,

      webServiceURL: `${config.baseUrl}/api/apple`,
      authenticationToken: customer.auth_token,

      ...(merchant.lat != null && merchant.lng != null
        ? {
            locations: [
              {
                latitude: merchant.lat,
                longitude: merchant.lng,
                relevantText: `${merchant.name} est juste à côté — votre carte est prête !`,
              },
            ],
            maxDistance: 300,
          }
        : {}),

      backgroundColor: hexToRgb(theme.bg_color),
      foregroundColor: hexToRgb(theme.text_color),
      labelColor: hexToRgb(theme.label_color),
    }
  );

  pass.type = "storeCard";

  pass.primaryFields.push({
    key: "balance",
    label: isVisits ? "PASSAGES" : "POINTS",
    value:
      isVisits && nextReward ? `${customer.points} / ${nextReward.cost_points}` : customer.points,
    changeMessage: isVisits ? "Passage enregistré ! %@" : "Vous avez maintenant %@ points !",
  });

  pass.secondaryFields.push({
    key: "member",
    label: "MEMBRE",
    value: customer.first_name,
  });

  pass.auxiliaryFields.push({
    key: "reward",
    label: "RÉCOMPENSE",
    value: reachedReward
      ? `🎁 ${reachedReward.label} — disponible !`
      : nextReward
        ? `Plus que ${nextReward.cost_points - customer.points} ${isVisits ? "passage(s)" : "point(s)"} avant : ${nextReward.label}`
        : "Programme en cours",
    changeMessage: "%@",
  });

  pass.backFields.push(
    { key: "email", label: "Compte", value: customer.email },
    {
      key: "info",
      label: "Programme fidélité",
      value: isVisits
        ? `1 visite = 1 passage. Présentez ce QR code en caisse chez ${merchant.name}.`
        : `1 € dépensé = 1 point. Présentez ce QR code en caisse chez ${merchant.name}.`,
    },
    {
      key: "account",
      label: "Mon espace",
      value: `${config.baseUrl}/m/${merchant.slug}/compte`,
    }
  );

  pass.setBarcodes({
    format: "PKBarcodeFormatQR",
    message: customer.serial_number,
    messageEncoding: "iso-8859-1",
    altText: customer.serial_number.slice(0, 8).toUpperCase(),
  });

  return pass.getAsBuffer();
}

function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  const n = parseInt(
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h,
    16
  );
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
}
