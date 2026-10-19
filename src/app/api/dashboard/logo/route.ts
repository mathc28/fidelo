import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { exigerCommercantAJour } from "@/lib/cgvServeur";
import { db, getCardTheme } from "@/lib/supabaseAdmin";
import { invalidatePassImages, touchMerchantPasses } from "@/lib/passAssets";
import { pushMerchantPasses } from "@/lib/apns";
import {
  LogoTooSmallError,
  generateAppleLogos,
  generateGoogleLogo,
  getLogoSizeWarning,
  isSquareLogo,
  normalizeSource,
} from "@/lib/wallet/logo-pipeline";

const MAX_SIZE = 5 * 1024 * 1024;

/**
 * Upload du logo du commerçant : génère les images du pass Apple/Google
 * (icon, logo — voir passAssets.ts et lib/wallet/logo-pipeline.ts)
 * via sharp, les stocke dans le bucket Storage "pass-assets", et met à
 * jour merchants.logo_url (utilisé par les pages publiques
 * /m/[slug]/inscription et /compte) ainsi que merchants.is_square_logo.
 */
export async function POST(req: NextRequest) {
  const garde = await exigerCommercantAJour(req);
  if ("reponse" in garde) return garde.reponse;
  const { merchant } = garde;

  const form = await req.formData();
  const file = form.get("logo");
  if (!(file instanceof File)) return new NextResponse("Fichier logo requis", { status: 400 });
  if (file.size > MAX_SIZE)
    return new NextResponse("Fichier trop volumineux (5 Mo max)", { status: 400 });
  if (!file.type.startsWith("image/"))
    return new NextResponse("Le fichier doit être une image", { status: 400 });

  const input = Buffer.from(await file.arrayBuffer());
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

  const [icon, icon2x, webIcon, appleLogos, googleLogo, squareLogo, warning] = await Promise.all([
    sharp(input)
      .resize(29, 29, { fit: "contain", background: bg })
      .flatten({ background: bg })
      .png()
      .toBuffer(),
    sharp(input)
      .resize(58, 58, { fit: "contain", background: bg })
      .flatten({ background: bg })
      .png()
      .toBuffer(),
    sharp(input).resize(128, 128, { fit: "cover" }).png().toBuffer(),
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
    if (error)
      return new NextResponse(`Upload échoué (${name}) : ${error.message}`, { status: 500 });
  }

  const { data: pub } = db.storage.from("pass-assets").getPublicUrl(`${merchant.id}/web-icon.png`);
  const logoUrl = `${pub.publicUrl}?v=${Date.now()}`;

  const { error: updateError } = await db
    .from("merchants")
    .update({ logo_url: logoUrl, is_square_logo: squareLogo })
    .eq("id", merchant.id);
  if (updateError) return new NextResponse(updateError.message, { status: 500 });

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
