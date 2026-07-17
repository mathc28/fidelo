import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { requireMerchant } from "@/lib/dashboardAuth";
import { db } from "@/lib/supabaseAdmin";
import { invalidatePassImages } from "@/lib/passAssets";

const MAX_SIZE = 5 * 1024 * 1024;
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

/**
 * Upload du logo du commerçant : génère les images du pass Apple/Google
 * (icon, logo, strip — voir passAssets.ts) via sharp, les stocke dans le
 * bucket Storage "pass-assets", et met à jour merchants.logo_url (utilisé
 * par les pages publiques /m/[slug]/inscription et /compte).
 */
export async function POST(req: NextRequest) {
  const merchant = await requireMerchant(req);
  if (!merchant) return new NextResponse("Non autorisé", { status: 401 });

  const form = await req.formData();
  const file = form.get("logo");
  if (!(file instanceof File)) return new NextResponse("Fichier logo requis", { status: 400 });
  if (file.size > MAX_SIZE) return new NextResponse("Fichier trop volumineux (5 Mo max)", { status: 400 });
  if (!file.type.startsWith("image/")) return new NextResponse("Le fichier doit être une image", { status: 400 });

  const input = Buffer.from(await file.arrayBuffer());
  const bg = hexToRgba(merchant.bg_color);

  async function stripBanner(w: number, h: number, logoW: number, logoH: number) {
    const logoBuf = await sharp(input)
      .resize(logoW, logoH, { fit: "contain", background: TRANSPARENT })
      .png().toBuffer();
    return sharp({ create: { width: w, height: h, channels: 4, background: bg } })
      .composite([{ input: logoBuf, gravity: "center" }])
      .png().toBuffer();
  }

  const [icon, icon2x, logo, logo2x, strip, strip2x, webIcon] = await Promise.all([
    sharp(input).resize(29, 29, { fit: "contain", background: bg }).flatten({ background: bg }).png().toBuffer(),
    sharp(input).resize(58, 58, { fit: "contain", background: bg }).flatten({ background: bg }).png().toBuffer(),
    sharp(input).resize(160, 50, { fit: "contain", background: TRANSPARENT }).png().toBuffer(),
    sharp(input).resize(320, 100, { fit: "contain", background: TRANSPARENT }).png().toBuffer(),
    stripBanner(375, 123, 220, 70),
    stripBanner(750, 246, 440, 140),
    sharp(input).resize(128, 128, { fit: "cover" }).png().toBuffer(),
  ]);

  const files: Record<string, Buffer> = {
    "icon.png": icon, "icon@2x.png": icon2x,
    "logo.png": logo, "logo@2x.png": logo2x,
    "strip.png": strip, "strip@2x.png": strip2x,
    "web-icon.png": webIcon,
  };

  for (const [name, buf] of Object.entries(files)) {
    const { error } = await db.storage
      .from("pass-assets")
      .upload(`${merchant.id}/${name}`, buf, { contentType: "image/png", upsert: true });
    if (error) return new NextResponse(`Upload échoué (${name}) : ${error.message}`, { status: 500 });
  }

  const { data: pub } = db.storage.from("pass-assets").getPublicUrl(`${merchant.id}/web-icon.png`);
  const logoUrl = `${pub.publicUrl}?v=${Date.now()}`;

  const { error: updateError } = await db.from("merchants").update({ logo_url: logoUrl }).eq("id", merchant.id);
  if (updateError) return new NextResponse(updateError.message, { status: 500 });

  invalidatePassImages(merchant.id);

  return NextResponse.json({ ok: true, logoUrl });
}

function hexToRgba(hex: string) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, alpha: 1 };
}
