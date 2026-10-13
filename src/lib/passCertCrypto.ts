import { createCipheriv, createDecipheriv, generateKeyPairSync, randomBytes } from "crypto";
import forge from "node-forge";

/*
 * Chiffrement des clés privées des certificats Apple des commerces
 * (merchant_pass_certs.key_pem_chiffre), en AES-256-GCM.
 *
 * Format stocké : « v1:<base64(iv 12 o | tag 16 o | texte chiffré)> ».
 * Le préfixe de version permet de changer d'algorithme plus tard sans
 * deviner le format d'une ligne. GCM authentifie le contenu : une valeur
 * altérée ou déchiffrée avec la mauvaise clé lève une erreur, jamais un
 * texte faux.
 *
 * La clé (PASS_CERTS_ENCRYPTION_KEY) fait 32 octets, encodée en base64 :
 *   openssl rand -base64 32
 */

const VERSION = "v1";

export function cleDeChiffrement(base64: string | undefined): Buffer {
  if (!base64) throw new Error("PASS_CERTS_ENCRYPTION_KEY manquante");
  const cle = Buffer.from(base64, "base64");
  if (cle.length !== 32) {
    throw new Error("PASS_CERTS_ENCRYPTION_KEY doit faire 32 octets (openssl rand -base64 32)");
  }
  return cle;
}

export function chiffrer(texte: string, cle: Buffer): string {
  const iv = randomBytes(12);
  const chiffreur = createCipheriv("aes-256-gcm", cle, iv);
  const corps = Buffer.concat([chiffreur.update(texte, "utf8"), chiffreur.final()]);
  const tag = chiffreur.getAuthTag();
  return `${VERSION}:${Buffer.concat([iv, tag, corps]).toString("base64")}`;
}

export function dechiffrer(valeur: string, cle: Buffer): string {
  const [version, charge] = valeur.split(":");
  if (version !== VERSION || !charge) throw new Error("Format de clé chiffrée inconnu");
  const brut = Buffer.from(charge, "base64");
  const iv = brut.subarray(0, 12);
  const tag = brut.subarray(12, 28);
  const corps = brut.subarray(28);
  const dechiffreur = createDecipheriv("aes-256-gcm", cle, iv);
  dechiffreur.setAuthTag(tag);
  return Buffer.concat([dechiffreur.update(corps), dechiffreur.final()]).toString("utf8");
}

/** Clé RSA 2048 (crypto natif, rapide) et CSR signée avec (node-forge). */
export function cleEtCsr(identifier: string): { keyPem: string; csrPem: string } {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  const csr = forge.pki.createCertificationRequest();
  csr.publicKey = forge.pki.publicKeyFromPem(publicKey);
  csr.setSubject([
    { name: "commonName", value: identifier },
    { name: "organizationName", value: "Fiduo" },
    { name: "countryName", value: "FR" },
  ]);
  csr.sign(forge.pki.privateKeyFromPem(privateKey), forge.md.sha256.create());
  return { keyPem: privateKey, csrPem: forge.pki.certificationRequestToPem(csr) };
}

/** certificateContent d'Apple (DER en base64) → PEM. */
export function derVersPem(base64: string): string {
  const lignes = base64.replace(/\s+/g, "").match(/.{1,64}/g) ?? [];
  return `-----BEGIN CERTIFICATE-----\n${lignes.join("\n")}\n-----END CERTIFICATE-----\n`;
}
