import { createHmac, timingSafeEqual } from "crypto";

/*
 * Liens de téléchargement de carte signés.
 *
 * Le serial d'une carte est aussi le contenu de son QR code, montré au
 * comptoir : le connaître ne doit pas suffire à télécharger la carte (le
 * .pkpass contient l'email du client et l'authenticationToken du web service
 * Apple). Les liens portent donc ?t=, un HMAC-SHA256 du serial avec
 * PASS_LINK_SECRET, connu du serveur seul.
 *
 * Les mises à jour Apple (/api/apple/…) ne passent pas par ici : elles
 * s'authentifient déjà avec l'authenticationToken de la carte.
 */

function secret(): string {
  const s = process.env.PASS_LINK_SECRET;
  if (!s) throw new Error("PASS_LINK_SECRET manquante : liens de carte impossibles à signer");
  return s;
}

/** Signature du serial, en base64url (sûre telle quelle dans une URL). */
export function signerSerial(serial: string): string {
  return createHmac("sha256", secret()).update(serial).digest("base64url");
}

/**
 * La signature `t` correspond-elle au serial ? Comparaison en temps constant.
 * Sans secret configuré, aucune signature n'est valide : la carte reste
 * introuvable plutôt que servie sans contrôle.
 */
export function signatureValide(serial: string, t: string | null | undefined): boolean {
  if (!t || !process.env.PASS_LINK_SECRET) return false;
  const attendue = Buffer.from(signerSerial(serial));
  const recue = Buffer.from(t);
  return recue.length === attendue.length && timingSafeEqual(recue, attendue);
}

/**
 * Liens Apple Wallet et Google Wallet d'une carte, signés. `base` : origine
 * du site pour un lien absolu (email), vide pour un lien relatif (page web).
 */
export function liensCarte(serial: string, base = ""): { apple: string; google: string } {
  const t = signerSerial(serial);
  return {
    apple: `${base}/api/pass/apple/${serial}?t=${t}`,
    google: `${base}/api/pass/google/${serial}?t=${t}`,
  };
}
