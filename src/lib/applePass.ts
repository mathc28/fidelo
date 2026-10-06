import { PKPass } from "passkit-generator";
import { config } from "./config";
import { Customer, Merchant, Reward, db, getCardTheme } from "./supabaseAdmin";
import { getPassImages } from "./passAssets";
import { separerRecompense, texteCompteur, texteRecompense } from "./wallet/rewardText";
import { promoActive } from "./promo";

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
  const [images, theme, promo] = await Promise.all([
    getPassImages(merchant),
    getCardTheme(merchant.theme_id),
    dernierePromo(merchant.id),
  ]);
  const isVisits = merchant.program_type === "visits";

  // Même découpe que l'aperçu du dashboard : source unique dans wallet/rewardText.
  const { reachedReward, nextReward } = separerRecompense(reward, customer.points);

  const pass = new PKPass(
    images,
    {
      wwdr: config.apple.wwdrCert(),
      signerCert: config.apple.signerCert(),
      signerKey: config.apple.signerKey(),
      // Le schéma de passkit-generator déclare `signerKeyPassphrase` en
      // `Joi.string()` sans `.allow("")` : une chaîne vide est refusée, alors
      // que la propriété absente passe (elle n'est pas `.required()`). Une clé
      // non chiffrée n'a pas de passphrase — on omet donc la clé au lieu
      // d'envoyer "", que node-forge ignorerait de toute façon.
      ...(config.apple.signerKeyPassphrase
        ? { signerKeyPassphrase: config.apple.signerKeyPassphrase }
        : {}),
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

      // Pas de `logoText` : c'est le seul texte qu'Apple rende à côté du logo,
      // et il faisait doublon avec le logo du commerce, qui porte déjà son nom.
      // Il grignotait en plus la largeur de l'en-tête, d'où la troncature en
      // « Boulangerie M… ». `organizationName` ci-dessus reste défini et suffit
      // à l'identification : Apple ne l'affiche jamais sur la face avant, il ne
      // sert qu'aux notifications, aux réglages et au dos de la carte.

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

  // En-tête — le prénom à droite du logo et du nom du commerce. Ce champ
  // prend sur la largeur de `logoText` : sur un nom long, c'est lui qui
  // reviendra tronquer « Boulangerie Michel ».
  pass.headerFields.push({
    key: "member",
    label: "MEMBRE",
    value: customer.first_name,
  });

  // `primaryFields` volontairement vide : disposition à l'essai, la zone
  // principale reste libre et les deux informations descendent d'une rangée.

  // Rangée secondaire — le compteur et la récompense côte à côte. Le libellé
  // y est au-dessus de la valeur et prend la `labelColor` du thème, ce que la
  // rangée principale ne permet pas.
  //
  // Pas de `changeMessage` ici, volontairement : ces champs changent à chaque
  // passage en caisse, quand le client a son téléphone en main. Une
  // notification à chaque scan l'inciterait à couper celles de la carte, et
  // avec elles les promos. La carte se met à jour en silence.
  pass.secondaryFields.push(
    {
      key: "balance",
      label: isVisits ? "VOS PASSAGES" : "VOS POINTS",
      // Sans objectif, la valeur reste un nombre et non une chaîne : Apple lui
      // applique alors le formatage local, donc l'espace des milliers.
      value: nextReward
        ? texteCompteur(customer.points, nextReward.cost_points, isVisits)
        : customer.points,
    },
    {
      key: "reward",
      label: "RÉCOMPENSE",
      value: texteRecompense(reachedReward, nextReward, customer.points),
      // Calé à droite pour fermer la rangée : le compteur garde l'alignement
      // à gauche par défaut, les deux champs s'appuient sur les bords.
      textAlignment: "PKTextAlignmentRight",
    }
  );

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
    altText: customer.serial_number.slice(0, 8).toUpperCase(),
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
