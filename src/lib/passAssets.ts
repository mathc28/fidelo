import path from "path";
import fs from "fs";
import { db, Merchant } from "./supabaseAdmin";

export type PassImages = Record<string, Buffer>;

// Pas de strip : la carte est un aplat de la couleur du thème, et le
// compteur du primaryField s'y détache directement.

// L'icône est la seule image qu'Apple exige : elle sert aux notifications et
// à l'écran verrouillé, et un pass sans elle est rejeté. Elle garde donc un
// repli sur l'image de la plateforme.
const ICONES = ["icon.png", "icon@2x.png"];

// Le logo, lui, est facultatif côté Apple — et il appartient au commerce.
// Aucun repli : sans logo uploadé, le pass n'embarque aucun fichier logo et
// l'en-tête n'affiche que le nom du commerce.
const LOGOS = ["logo.png", "logo@2x.png", "logo@3x.png"];

const cache = new Map<string, { images: PassImages; at: number }>();

/** Trace du chargement des images, activée par DEBUG_PASS_ASSETS=1. */
const trace = (msg: string) => {
  if (process.env.DEBUG_PASS_ASSETS) console.log(`[pass-assets] ${msg}`);
};

async function telecharger(merchantId: string, name: string): Promise<Buffer | null> {
  const { data, error } = await db.storage.from("pass-assets").download(`${merchantId}/${name}`);
  if (error || !data) {
    trace(`${name} : absent du bucket (${error?.message ?? "pas de données"})`);
    return null;
  }
  const buf = Buffer.from(await data.arrayBuffer());
  trace(`${name} : ${buf.length} o téléchargés depuis ${merchantId}/`);
  return buf;
}

/**
 * Images du pass d'un merchant, générées par sharp à l'upload du logo
 * (voir /api/dashboard/logo) et stockées dans le bucket "pass-assets"
 * sous {merchantId}/.
 */
export async function getPassImages(merchant: Merchant): Promise<PassImages> {
  const cached = cache.get(merchant.id);
  if (cached && Date.now() - cached.at < 5 * 60 * 1000) return cached.images;

  const images: PassImages = {};
  trace(`merchant ${merchant.slug} — logo_url ${merchant.logo_url ? "présent" : "ABSENT"}`);

  for (const name of ICONES) {
    const buf = await telecharger(merchant.id, name);
    if (!buf) trace(`${name} : REPLI sur l'image plateforme (icône obligatoire)`);
    images[name] =
      buf ?? fs.readFileSync(path.join(process.cwd(), "assets", "pass-defaults", name));
  }

  // `logo_url` évite trois appels Storage inutiles au cas courant « pas de
  // logo » ; le garde par fichier couvre le cas où la colonne est renseignée
  // mais le bucket vide (upload partiel, restauration).
  if (merchant.logo_url) {
    for (const name of LOGOS) {
      const buf = await telecharger(merchant.id, name);
      if (buf) images[name] = buf;
    }
  } else {
    trace("aucun logo_url : le pass partira sans logo (pas de repli plateforme)");
  }

  trace(`bundle : ${Object.keys(images).join(", ")}`);

  cache.set(merchant.id, { images, at: Date.now() });
  return images;
}

/** À appeler après un upload de logo pour que le prochain pass régénéré le reflète immédiatement. */
export function invalidatePassImages(merchantId: string): void {
  cache.delete(merchantId);
}

/**
 * Marque les pass de tous les clients d'un commerce comme modifiés.
 *
 * Le protocole Apple ne connaît qu'un horodatage par pass, et notre route
 * `passesUpdatedSince` le lit dans `customers.updated_at` (voir
 * /api/apple/v1/devices/[deviceId]/registrations/[passTypeId]). Or un
 * changement au niveau du COMMERCE — logo, nom, couleurs, adresse — ne touche
 * aucune ligne client : la route répondait donc 204 « rien de neuf » et les
 * pass déjà installés gardaient indéfiniment l'ancienne image, même avec APNs
 * correctement configuré. On propage donc l'horodatage sur ses clients, ce
 * qui est exact du point de vue d'Apple : leur pass a bien changé.
 */
export async function touchMerchantPasses(merchantId: string): Promise<void> {
  await db
    .from("customers")
    .update({ updated_at: new Date().toISOString() })
    .eq("merchant_id", merchantId);
}
