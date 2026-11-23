import { PKPass } from "passkit-generator";
import { config } from "./config";
import { Customer, Merchant, Reward, db, getCardTheme } from "./supabaseAdmin";
import { getPassImages } from "./passAssets";
import { champsCarte } from "./wallet/champsCarte";
import { promoActive } from "./promo";
import { identiteCarte } from "./passCerts";

/**
 * Génère le .pkpass d'un client, entièrement paramétré par son merchant :
 * couleurs, nom, géoloc, vocabulaire (passages vs points), progression
 * vers la prochaine récompense.
 */
export async function buildApplePass(
  customer: Customer,
  merchant: Merchant,
  reward: Reward | null
): Promise<Buffer> {
  const [images, theme, promo, identite] = await Promise.all([
    getPassImages(merchant),
    getCardTheme(merchant.theme_id),
    dernierePromo(merchant.id),
    // Pass Type ID figé sur la carte à sa création : partagé ou propre au
    // commerce. Une carte installée ne peut pas en changer.
    identiteCarte(customer.pass_type_identifier),
  ]);
  const isVisits = merchant.program_type === "visits";

  // Face avant : mêmes champs que l'aperçu (WalletPreview), source unique
  // dans wallet/champsCarte.
  const face = champsCarte({
    programType: merchant.program_type,
    points: customer.points,
    reward,
    firstName: customer.first_name,
    serial: customer.serial_number,
  });

  const pass = new PKPass(
    images,
    {
      wwdr: config.apple.wwdrCert(),
      signerCert: identite.cert,
      signerKey: identite.key,
      // Le schéma de passkit-generator déclare `signerKeyPassphrase` en
      // `Joi.string()` sans `.allow("")` : une chaîne vide est refusée, alors
      // que la propriété absente passe (elle n'est pas `.required()`). Une clé
      // non chiffrée n'a pas de passphrase — on omet donc la clé au lieu
      // d'envoyer "", que node-forge ignorerait de toute façon.
      ...(identite.passphrase ? { signerKeyPassphrase: identite.passphrase } : {}),
    },
    {
      formatVersion: 1,
      passTypeIdentifier: identite.passTypeIdentifier,
      teamIdentifier: config.apple.teamId,
      serialNumber: customer.serial_number,
      organizationName: merchant.name,
      description: `Carte de fidélité ${merchant.name}`,

      webServiceURL: `${config.baseUrl}/api/apple`,
      authenticationToken: customer.auth_token,

      // Pas de `logoText` : c'est le seul texte qu'Apple rende à côté du logo,
      // et il faisait doublon avec le logo du commerce, qui porte déjà son nom.
      // Il grignotait en plus la largeur de l'en-tête, d'où la troncature en
      // « Boulangerie M… ». `organizationName` ci-dessus reste défini et suffit
      // à l'identification : Apple ne l'affiche jamais sur la face avant, il ne
      // sert qu'aux notifications, aux réglages et au dos de la carte.

      backgroundColor: hexToRgb(theme.bg_color),
      foregroundColor: hexToRgb(theme.text_color),
      labelColor: hexToRgb(theme.label_color),
    }
  );

  pass.type = "storeCard";

  // Rappel de proximité : près de la boutique, iOS propose la carte sur
  // l'écran verrouillé. Passé par setLocations et non par les propriétés du
  // constructeur, que passkit-generator filtre : `locations` y était jeté en
  // silence et aucune carte ne portait d'emplacement.
  //
  // Pas de maxDistance : pour une storeCard, Apple plafonne le rayon à une
  // centaine de mètres, on laisse son rayon par défaut s'appliquer. Le texte
  // reste court, l'écran verrouillé le tronque.
  if (merchant.lat != null && merchant.lng != null) {
    pass.setLocations({
      latitude: merchant.lat,
      longitude: merchant.lng,
      relevantText: texteProximite(merchant.name),
    });
  }

  pass.headerFields.push(...face.headerFields);
  pass.primaryFields.push(...face.primaryFields);
  pass.secondaryFields.push(...face.secondaryFields);

  // Dernière promo du commerce, en tête du dos de la carte. Seul champ de la
  // carte à porter un changeMessage : à chaque nouveau texte, iOS l'affiche
  // en notification sur l'écran verrouillé (avec le nom du commerce en
  // titre). Un texte identique au précédent ne change pas la valeur, donc ne
  // notifie pas : le dashboard prévient le commerçant. Aucun champ sans
  // promo en cours d'affichage.
  if (promo) {
    pass.backFields.push({
      key: "promo",
      label: "Message",
      value: promo,
      changeMessage: "%@",
    });
  }

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
    altText: face.barcodeAltText,
  });

  return pass.getAsBuffer();
}

/**
 * Texte de la dernière promo du commerce si elle est encore dans sa durée
 * d'affichage, null sinon. Seule la dernière compte : une promo plus ancienne
 * mais plus longue ne revient pas à l'expiration d'une plus récente (elle
 * renotifierait les clients). Une promo expirée laisse la carte sans champ
 * « Message » : la tâche /api/cron/promos-expirees pousse cette version.
 */
async function dernierePromo(merchantId: string): Promise<string | null> {
  const { data } = await db
    .from("promos")
    .select("message, expires_at")
    .eq("merchant_id", merchantId)
    .order("sent_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data && promoActive(data.expires_at) ? data.message : null;
}

/** Texte affiché sur l'écran verrouillé près de la boutique. */
export function texteProximite(nomCommerce: string): string {
  return `${nomCommerce} est juste à côté. Votre carte est prête.`;
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
