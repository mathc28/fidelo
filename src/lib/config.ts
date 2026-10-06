function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Variable d'environnement manquante : ${name}`);
  return v;
}

function fromBase64(name: string): Buffer {
  return Buffer.from(required(name), "base64");
}

/** Config PLATEFORME uniquement — tout ce qui est propre à un commerce vit en base. */
export const config = {
  baseUrl: required("BASE_URL"),

  apple: {
    passTypeId: required("APPLE_PASS_TYPE_ID"),
    teamId: required("APPLE_TEAM_ID"),
    signerCert: () => fromBase64("APPLE_SIGNER_CERT_BASE64"),
    signerKey: () => fromBase64("APPLE_SIGNER_KEY_BASE64"),
    signerKeyPassphrase: process.env.APPLE_SIGNER_KEY_PASSPHRASE ?? "",
    wwdrCert: () => fromBase64("APPLE_WWDR_CERT_BASE64"),
    // APNs s'authentifie avec ce même certificat (signerCert / signerKey) :
    // APNS_KEY_ID et APNS_KEY_BASE64 ne servent plus.
  },

  google: {
    issuerId: required("GOOGLE_WALLET_ISSUER_ID"),
    saEmail: required("GOOGLE_SA_EMAIL"),
    saKey: () => fromBase64("GOOGLE_SA_KEY_BASE64").toString("utf-8"),
  },
};
