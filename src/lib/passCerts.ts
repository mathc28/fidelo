import { X509Certificate } from "crypto";
import { config } from "./config";
import { db } from "./supabaseAdmin";
import { cleDeChiffrement } from "./passCertCrypto";
import {
  identifiantNouvelleCarte,
  identitePourCarte,
  type IdentitePass,
  type LigneCertificat,
} from "./passIdentite";

/*
 * Accès serveur aux certificats Apple : identité partagée (.env) et
 * certificats propres aux commerces (merchant_pass_certs, service_role seul).
 */

export function identitePartagee(): Omit<IdentitePass, "dediee"> {
  return {
    passTypeIdentifier: config.apple.passTypeId,
    cert: config.apple.signerCert(),
    key: config.apple.signerKey(),
    ...(config.apple.signerKeyPassphrase ? { passphrase: config.apple.signerKeyPassphrase } : {}),
  };
}

export function cleCertificats(): Buffer {
  return cleDeChiffrement(process.env.PASS_CERTS_ENCRYPTION_KEY);
}

// Les lignes changent rarement (création, renouvellement) : un court cache
// évite une lecture en base à chaque carte générée ou push envoyé.
const cache = new Map<string, { ligne: LigneCertificat | null; at: number }>();
const DUREE_CACHE = 60 * 1000;

export function oublierCertificat(identifiant: string): void {
  cache.delete(identifiant);
}

async function ligneParIdentifiant(identifiant: string): Promise<LigneCertificat | null> {
  const enCache = cache.get(identifiant);
  if (enCache && Date.now() - enCache.at < DUREE_CACHE) return enCache.ligne;
  const { data } = await db
    .from("merchant_pass_certs")
    .select("pass_type_identifier, cert_pem, key_pem_chiffre")
    .eq("pass_type_identifier", identifiant)
    .maybeSingle<LigneCertificat>();
  cache.set(identifiant, { ligne: data ?? null, at: Date.now() });
  return data ?? null;
}

/** Identité de signature d'une carte, d'après son Pass Type ID figé. */
export async function identiteCarte(identifiantCarte: string | null): Promise<IdentitePass> {
  const partagee = identitePartagee();
  if (!identifiantCarte || identifiantCarte === partagee.passTypeIdentifier) {
    return { ...partagee, dediee: false };
  }
  return identitePourCarte(
    identifiantCarte,
    partagee,
    await ligneParIdentifiant(identifiantCarte),
    cleCertificats()
  );
}

/** Pass Type ID à figer sur une nouvelle carte du commerce (NULL = partagé). */
export async function identifiantPourNouvelleCarte(merchantId: string): Promise<string | null> {
  const { data } = await db
    .from("merchant_pass_certs")
    .select("pass_type_identifier")
    .eq("merchant_id", merchantId)
    .maybeSingle<Pick<LigneCertificat, "pass_type_identifier">>();
  return identifiantNouvelleCarte(data ?? null);
}

/** Le web service n'accepte que nos Pass Type IDs : le partagé et ceux des commerces. */
export async function identifiantConnu(identifiant: string): Promise<boolean> {
  if (identifiant === config.apple.passTypeId) return true;
  return (await ligneParIdentifiant(identifiant)) !== null;
}

/** Les iPhone stockent l'identifiant tel quel ; NULL en base = identifiant partagé. */
export function identifiantEffectif(identifiantCarte: string | null): string {
  return identifiantCarte ?? config.apple.passTypeId;
}

/**
 * Date d'expiration du certificat partagé (.env), lue dans le certificat
 * x509 lui-même. Celui-là n'est pas renouvelé automatiquement : le
 * back-office l'affiche et alerte à l'approche de l'échéance.
 */
export function expirationCertificatPartage(): { identifier: string; expiresAt: Date } {
  const cert = new X509Certificate(config.apple.signerCert());
  return { identifier: config.apple.passTypeId, expiresAt: new Date(cert.validTo) };
}
