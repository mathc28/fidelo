import path from "path";
import fs from "fs";
import { db, Merchant } from "./supabaseAdmin";

export type PassImages = Record<string, Buffer>;

const REQUIRED = ["icon.png", "icon@2x.png", "logo.png", "logo@2x.png", "strip.png", "strip@2x.png"];

const cache = new Map<string, { images: PassImages; at: number }>();

/**
 * Images du pass d'un merchant, générées par sharp à l'upload du logo
 * (voir /api/dashboard/logo) et stockées dans le bucket "pass-assets"
 * sous {merchantId}/. Fallback sur les images par défaut de la plateforme
 * tant que le commerçant n'a pas uploadé son logo.
 */
export async function getPassImages(merchant: Merchant): Promise<PassImages> {
  const cached = cache.get(merchant.id);
  if (cached && Date.now() - cached.at < 5 * 60 * 1000) return cached.images;

  const images: PassImages = {};

  for (const name of REQUIRED) {
    const { data } = await db.storage
      .from("pass-assets")
      .download(`${merchant.id}/${name}`);

    if (data) {
      images[name] = Buffer.from(await data.arrayBuffer());
    } else {
      images[name] = fs.readFileSync(
        path.join(process.cwd(), "assets", "pass-defaults", name)
      );
    }
  }

  cache.set(merchant.id, { images, at: Date.now() });
  return images;
}

/** À appeler après un upload de logo pour que le prochain pass régénéré le reflète immédiatement. */
export function invalidatePassImages(merchantId: string): void {
  cache.delete(merchantId);
}
