import { dechiffrer } from "./passCertCrypto";

/*
 * Règles de choix du Pass Type ID et du certificat d'une carte Apple.
 * Module sans effet de bord (ni config ni base) : testable tel quel.
 *
 * Une carte installée dans un iPhone ne peut JAMAIS changer de Pass Type ID :
 * une mise à jour signée sous un autre identifiant serait rejetée par iOS.
 * Le Pass Type ID est donc figé par carte, à sa création
 * (customers.pass_type_identifier), et non lu sur le commerce à chaque fois.
 * NULL = l'identifiant historique partagé du .env.
 */

/** Signature d'une carte : l'identifiant et le certificat qui va avec. */
export type IdentitePass = {
  passTypeIdentifier: string;
  cert: string | Buffer;
  key: string | Buffer;
  passphrase?: string;
  /** true = Pass Type ID propre au commerce ; false = identifiant partagé. */
  dediee: boolean;
};

/** Ligne de merchant_pass_certs, réduite à ce qui sert à signer. */
export type LigneCertificat = {
  pass_type_identifier: string;
  cert_pem: string;
  key_pem_chiffre: string;
};

/**
 * Pass Type ID d'une nouvelle carte : celui du commerce s'il en a un, sinon
 * NULL (identifiant partagé). Appelé une seule fois, à l'inscription.
 */
export function identifiantNouvelleCarte(
  certCommerce: Pick<LigneCertificat, "pass_type_identifier"> | null
): string | null {
  return certCommerce?.pass_type_identifier ?? null;
}

/**
 * Identité de signature d'une carte existante.
 * - identifiant NULL ou égal à celui du .env → certificat partagé du .env,
 *   même si le commerce a depuis obtenu son propre identifiant ;
 * - sinon → le certificat du commerce, clé déchiffrée.
 * Un identifiant dédié sans certificat correspondant est une erreur : signer
 * avec un autre identifiant casserait la carte, mieux vaut échouer.
 */
export function identitePourCarte(
  identifiantCarte: string | null,
  partagee: Omit<IdentitePass, "dediee">,
  ligne: LigneCertificat | null,
  cleChiffrement: Buffer
): IdentitePass {
  if (!identifiantCarte || identifiantCarte === partagee.passTypeIdentifier) {
    return { ...partagee, dediee: false };
  }
  if (!ligne || ligne.pass_type_identifier !== identifiantCarte) {
    throw new Error(`Aucun certificat pour le Pass Type ID ${identifiantCarte}`);
  }
  return {
    passTypeIdentifier: ligne.pass_type_identifier,
    cert: ligne.cert_pem,
    key: dechiffrer(ligne.key_pem_chiffre, cleChiffrement),
    dediee: true,
  };
}

/** Identifiant Apple propre à un commerce : pass.app.fiduo.<8 hex de son UUID>. */
export function identifiantCommerce(merchantId: string): string {
  return `pass.app.fiduo.${merchantId.replace(/-/g, "").slice(0, 8).toLowerCase()}`;
}

/**
 * Nom affiché dans le portail Apple. Apple refuse les caractères spéciaux
 * dans les descriptions d'identifiants : accents retirés, seuls lettres,
 * chiffres et espaces gardés.
 */
export function nomPortailApple(nomCommerce: string, merchantId: string): string {
  const propre = nomCommerce
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 50)
    .trim();
  return propre ? `Fiduo ${propre}` : `Fiduo ${merchantId.slice(0, 8)}`;
}
