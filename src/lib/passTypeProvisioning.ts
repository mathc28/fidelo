import { db } from "./supabaseAdmin";
import { chiffrer, cleEtCsr, derVersPem } from "./passCertCrypto";
import { cleCertificats, oublierCertificat } from "./passCerts";
import { identifiantCommerce, nomPortailApple } from "./passIdentite";
import {
  ErreurAppStoreConnect,
  creerCertificatPass,
  creerPassTypeId,
  revoquerCertificat,
  trouverPassTypeId,
} from "./appStoreConnect";

/*
 * Pass Type ID propre à un commerce, créé et renouvelé via App Store Connect.
 * Logs préfixés [Pass Type ID].
 */

function log(message: string): void {
  console.log(`[Pass Type ID] ${message}`);
}

export type ResultatProvisioning =
  | { statut: "existant"; identifier: string; expiresAt: string }
  | { statut: "cree"; identifier: string; expiresAt: string };

/**
 * Donne au commerce son propre Pass Type ID et un certificat pour signer.
 * Idempotent : un commerce déjà équipé n'est pas touché. Reprend une
 * tentative interrompue : un Pass Type ID déjà déclaré chez Apple est
 * réutilisé au lieu d'être recréé.
 */
export async function provisionnerPassTypeId(merchantId: string): Promise<ResultatProvisioning> {
  const { data: existant } = await db
    .from("merchant_pass_certs")
    .select("pass_type_identifier, expires_at")
    .eq("merchant_id", merchantId)
    .maybeSingle();
  if (existant) {
    return {
      statut: "existant",
      identifier: existant.pass_type_identifier,
      expiresAt: existant.expires_at,
    };
  }

  const { data: merchant } = await db
    .from("merchants")
    .select("id, name")
    .eq("id", merchantId)
    .maybeSingle();
  if (!merchant) throw new Error("Commerce introuvable");

  const identifier = identifiantCommerce(merchant.id);

  // 1. Le Pass Type ID, chez Apple.
  let ascPassTypeId = await trouverPassTypeId(identifier);
  if (ascPassTypeId) {
    log(`${identifier} existe déjà chez Apple (${ascPassTypeId}), réutilisé`);
  } else {
    try {
      ascPassTypeId = await creerPassTypeId(
        identifier,
        nomPortailApple(merchant.name, merchant.id)
      );
      log(`${identifier} créé chez Apple (${ascPassTypeId})`);
    } catch (e) {
      // Course avec une autre tentative : il vient d'être créé, on le relit.
      if (e instanceof ErreurAppStoreConnect && e.status === 409) {
        ascPassTypeId = await trouverPassTypeId(identifier);
      }
      if (!ascPassTypeId) throw e;
    }
  }

  // 2. Le certificat, à partir d'une clé générée ici et qui ne quitte pas le serveur.
  const { keyPem, csrPem } = cleEtCsr(identifier);
  const certificat = await creerCertificatPass(ascPassTypeId, csrPem);
  log(`${identifier} : certificat ${certificat.id} émis, expire le ${certificat.expirationDate}`);

  // 3. Stockage, clé privée chiffrée.
  const { error } = await db.from("merchant_pass_certs").insert({
    merchant_id: merchant.id,
    pass_type_identifier: identifier,
    asc_pass_type_id: ascPassTypeId,
    asc_certificate_id: certificat.id,
    cert_pem: derVersPem(certificat.certificateContent),
    key_pem_chiffre: chiffrer(keyPem, cleCertificats()),
    expires_at: certificat.expirationDate,
  });
  if (error) {
    // Ligne non enregistrée (ex. tentative simultanée déjà enregistrée) : le
    // certificat émis ne servira jamais, on le révoque pour ne pas l'orpheliner.
    await revoquerCertificat(certificat.id).catch((e) =>
      log(`${identifier} : certificat orphelin ${certificat.id} NON révoqué — ${e.message}`)
    );
    throw new Error(`Enregistrement du certificat impossible : ${error.message}`);
  }

  oublierCertificat(identifier);
  return { statut: "cree", identifier, expiresAt: certificat.expirationDate };
}

/**
 * Remplace le certificat d'un commerce par un neuf, pour le même Pass Type ID,
 * puis révoque l'ancien une fois le nouveau enregistré. Les cartes déjà
 * installées ne sont pas affectées : seul l'identifiant compte pour elles.
 */
export async function renouvelerCertificat(ligne: {
  merchant_id: string;
  pass_type_identifier: string;
  asc_pass_type_id: string;
  asc_certificate_id: string;
}): Promise<{ expiresAt: string; ancienRevoque: boolean }> {
  const { keyPem, csrPem } = cleEtCsr(ligne.pass_type_identifier);
  const certificat = await creerCertificatPass(ligne.asc_pass_type_id, csrPem);

  // Mise à jour conditionnée à l'ancien certificat : si une autre exécution a
  // déjà renouvelé, on n'écrase rien et on révoque le certificat en trop.
  const { data: maj, error } = await db
    .from("merchant_pass_certs")
    .update({
      asc_certificate_id: certificat.id,
      cert_pem: derVersPem(certificat.certificateContent),
      key_pem_chiffre: chiffrer(keyPem, cleCertificats()),
      expires_at: certificat.expirationDate,
    })
    .eq("merchant_id", ligne.merchant_id)
    .eq("asc_certificate_id", ligne.asc_certificate_id)
    .select("merchant_id");

  if (error || !maj?.length) {
    await revoquerCertificat(certificat.id).catch(() => {});
    throw new Error(
      `Renouvellement non enregistré pour ${ligne.pass_type_identifier} : ${error?.message ?? "certificat déjà remplacé"}`
    );
  }
  oublierCertificat(ligne.pass_type_identifier);

  // L'ancien certificat n'est révoqué qu'une fois le nouveau en service.
  let ancienRevoque = true;
  await revoquerCertificat(ligne.asc_certificate_id).catch((e) => {
    ancienRevoque = false;
    log(
      `${ligne.pass_type_identifier} : ancien certificat ${ligne.asc_certificate_id} NON révoqué — ${e.message}`
    );
  });
  return { expiresAt: certificat.expirationDate, ancienRevoque };
}

/**
 * Renouvelle les certificats des commerces qui expirent dans moins de
 * `margeJours` jours. Appelé chaque nuit par la tâche planifiée : avec une
 * vérification quotidienne, 30 jours laissent largement le temps de réessayer.
 * Ne concerne pas le certificat partagé du .env, renouvelé à la main.
 */
export async function renouvelerCertificatsProches(
  margeJours = 30
): Promise<{ aRenouveler: number; renouveles: number; echecs: number }> {
  const limite = new Date(Date.now() + margeJours * 24 * 3600 * 1000).toISOString();
  const { data: lignes, error } = await db
    .from("merchant_pass_certs")
    .select("merchant_id, pass_type_identifier, asc_pass_type_id, asc_certificate_id, expires_at")
    .lt("expires_at", limite);
  if (error) throw new Error(`Lecture des certificats impossible : ${error.message}`);

  let renouveles = 0;
  let echecs = 0;
  for (const ligne of lignes ?? []) {
    try {
      const r = await renouvelerCertificat(ligne);
      renouveles++;
      log(
        `${ligne.pass_type_identifier} renouvelé (expirait le ${ligne.expires_at}, nouveau jusqu'au ${r.expiresAt}) ; ancien ${r.ancienRevoque ? "révoqué" : "NON révoqué"}`
      );
    } catch (e) {
      echecs++;
      log(
        `${ligne.pass_type_identifier} NON renouvelé (expire le ${ligne.expires_at}) : ${(e as Error).message}`
      );
    }
  }
  log(
    `vérification quotidienne : ${lignes?.length ?? 0} certificat(s) à moins de ${margeJours} jours, ${renouveles} renouvelé(s), ${echecs} échec(s)`
  );
  return { aRenouveler: lignes?.length ?? 0, renouveles, echecs };
}
