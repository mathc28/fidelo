import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { exigerCommercantAJour } from "@/lib/cgvServeur";
import { db, getCardTheme } from "@/lib/supabaseAdmin";
import { invalidatePassImages, touchMerchantPasses } from "@/lib/passAssets";
import { pushMerchantPasses } from "@/lib/apns";
import {
  LogoTooSmallError,
  formatLogo,
  generateAppleLogos,
  generateGoogleLogo,
  getLogoSizeWarning,
  isSquareLogo,
  normalizeSource,
} from "@/lib/wallet/logo-pipeline";

/** 4 Mo : sous le plafond de 4,5 Mo que Vercel impose au corps d'une requête. */
const MAX_SIZE = 4 * 1024 * 1024;

/**
 * Upload du logo du commerçant : génère les images du pass Apple/Google
 * (icon, logo — voir passAssets.ts et lib/wallet/logo-pipeline.ts)
 * via sharp, les stocke dans le bucket Storage "pass-assets", et met à
 * jour merchants.logo_url (utilisé par les pages publiques
 * /m/[slug]/inscription et /compte) ainsi que merchants.is_square_logo.
 */
const ERREUR_GENERIQUE = "Le logo n'a pas pu être enregistré. Réessayez dans un instant.";

export async function POST(req: NextRequest) {
  const garde = await exigerCommercantAJour(req);
  if ("reponse" in garde) return garde.reponse;
  const { merchant } = garde;

  const form = await req.formData();
  const file = form.get("logo");
  if (!(file instanceof File)) return new NextResponse("Fichier logo requis", { status: 400 });
  if (file.size > MAX_SIZE) {
    return new NextResponse("Fichier trop volumineux : 4 Mo maximum.", { status: 400 });
  }

  const input = Buffer.from(await file.arrayBuffer());
  // Format lu dans le contenu, pas dans le type déclaré par le navigateur.
  const format = await formatLogo(input);
  if (!format) {
    return new NextResponse(
      "Format non pris en charge : envoyez un PNG, un JPEG, un WebP ou un SVG.",
      {
        status: 400,
      }
    );
  }
  const theme = await getCardTheme(merchant.theme_id);
  const bg = hexToRgba(theme.bg_color);

  let normalized: Buffer;
  try {
    normalized = await normalizeSource(input);
  } catch (error) {
    if (error instanceof LogoTooSmallError) {
      return new NextResponse(error.message, { status: 400 });
    }
    return new NextResponse("Image illisible : essayez un autre fichier.", { status: 400 });
  }

  // Icônes : depuis la version déjà rastérisée pour un SVG (sinon un SVG de
  // 24 px serait agrandi à 72 dpi, flou) ; depuis le fichier d'origine sinon.
  const base = format === "svg" ? normalized : input;

  const [icon, icon2x, webIcon, appleLogos, googleLogo, squareLogo, warning] = await Promise.all([
    sharp(base)
      .resize(29, 29, { fit: "contain", background: bg })
      .flatten({ background: bg })
      .png()
      .toBuffer(),
    sharp(base)
      .resize(58, 58, { fit: "contain", background: bg })
      .flatten({ background: bg })
      .png()
      .toBuffer(),
    sharp(base).resize(128, 128, { fit: "cover" }).png().toBuffer(),
    generateAppleLogos(normalized),
    generateGoogleLogo(normalized),
    isSquareLogo(normalized),
    getLogoSizeWarning(normalized),
  ]);

  const files: Record<string, Buffer> = {
    "icon.png": icon,
    "icon@2x.png": icon2x,
    "logo.png": appleLogos.logo,
    "logo@2x.png": appleLogos.logo2x,
    "logo@3x.png": appleLogos.logo3x,
    "web-icon.png": webIcon,
    "google-logo.png": googleLogo,
  };

  for (const [name, buf] of Object.entries(files)) {
    const { error } = await db.storage
      .from("pass-assets")
      .upload(`${merchant.id}/${name}`, buf, { contentType: "image/png", upsert: true });
    if (error) {
      console.error(`[Logo] upload ${name} échoué — commerce ${merchant.slug} :`, error.message);
      return new NextResponse(ERREUR_GENERIQUE, { status: 500 });
    }
  }

  const { data: pub } = db.storage.from("pass-assets").getPublicUrl(`${merchant.id}/web-icon.png`);
  const logoUrl = `${pub.publicUrl}?v=${Date.now()}`;

  const { error: updateError } = await db
    .from("merchants")
    .update({ logo_url: logoUrl, is_square_logo: squareLogo })
    .eq("id", merchant.id);
  if (updateError) {
    console.error(`[Logo] mise à jour du commerce ${merchant.slug} échouée :`, updateError.message);
    return new NextResponse(ERREUR_GENERIQUE, { status: 500 });
  }

  invalidatePassImages(merchant.id);

  // Le nouveau logo ne concerne aucune ligne client, mais il change bien leur
  // pass : sans ce bump, `passesUpdatedSince` répond 204 et les cartes déjà
  // installées gardent l'ancienne image. Le push réveille les appareils ;
  // sans APNs configuré ils rattraperont au prochain rafraîchissement.
  await touchMerchantPasses(merchant.id);
  await pushMerchantPasses(merchant.id).catch(() => {});

  return NextResponse.json({ ok: true, logoUrl, warning });
}

function hexToRgba(hex: string) {
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
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, alpha: 1 };
}
