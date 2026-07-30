import sharp from "sharp";

const MIN_SOURCE_SIZE = 400; // en dessous : vraiment inutilisable, on refuse
const RECOMMENDED_SOURCE_SIZE = 660; // minimum demandé par Google pour son programLogo
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

const APPLE_HEIGHTS = { logo: 50, logo2x: 100, logo3x: 150 } as const;

const GOOGLE_LOGO_SIZE = 660;
const GOOGLE_LOGO_INNER = 561; // 660 * 0.85 ≈ 561 → ~15 % de marge une fois étendu

// Landscape net = seul cas où le texte du commerce n'est pas obligatoire à
// côté du logo sur le pass Apple. Carré et portrait sont traités pareil :
// une fois contraints par la hauteur, ils deviennent trop étroits pour être
// lisibles seuls.
const LANDSCAPE_RATIO_THRESHOLD = 1.15;

export class LogoTooSmallError extends Error {
  constructor(public readonly largeSide: number) {
    super(
      `Votre logo est trop petit (${largeSide}px après recadrage des marges) : il nous faut au moins ${MIN_SOURCE_SIZE}px de côté.`
    );
  }
}

export type AppleLogos = { logo: Buffer; logo2x: Buffer; logo3x: Buffer };

function isSvg(buffer: Buffer): boolean {
  return buffer.subarray(0, 1000).toString("utf-8").toLowerCase().includes("<svg");
}

/**
 * Trim des marges (transparentes ou blanches) + conversion en PNG sRGB avec
 * alpha. Rejette les sources trop petites une fois les marges enlevées :
 * on n'upscale jamais un logo commerçant.
 */
export async function normalizeSource(buffer: Buffer): Promise<Buffer> {
  // Densité élevée pour les SVG : sans ça, sharp rastérise sur le viewBox
  // (souvent 24x24 ou 100x100), ce qui rejetterait à tort un vecteur net.
  const source = isSvg(buffer) ? sharp(buffer, { density: 2400 }) : sharp(buffer);

  const { data, info } = await source
    .trim()
    .toColorspace("srgb")
    .ensureAlpha()
    .png()
    .toBuffer({ resolveWithObject: true });

  const largeSide = Math.max(info.width, info.height);
  if (largeSide < MIN_SOURCE_SIZE) {
    throw new LogoTooSmallError(largeSide);
  }

  return data;
}

/**
 * Avertissement non bloquant : entre le seuil de refus (400px) et le
 * minimum recommandé par Google (660px), le logo est accepté mais restera
 * un peu flou sur les cartes Android. À appeler sur une source déjà passée
 * par normalizeSource (donc garantie ≥ 400px).
 */
export async function getLogoSizeWarning(buffer: Buffer): Promise<string | null> {
  const { width, height } = await sharp(buffer).metadata();
  const largeSide = Math.max(width ?? 0, height ?? 0);
  if (largeSide >= RECOMMENDED_SOURCE_SIZE) return null;
  return "Votre logo est un peu petit, il pourrait manquer de netteté sur les cartes Android. Un fichier de 1000px ou plus donnera un meilleur rendu.";
}

async function resizeAppleLogo(buffer: Buffer, height: number): Promise<Buffer> {
  return sharp(buffer).resize({ height, fit: "inside", withoutEnlargement: true }).png().toBuffer();
}

/**
 * Les 3 variantes Apple sont dérivées indépendamment de la source
 * normalisée (jamais du @3x en cascade) : la hauteur est la seule
 * contrainte, la largeur reste libre — un logo carré ne doit jamais être
 * écrasé en largeur.
 */
export async function generateAppleLogos(buffer: Buffer): Promise<AppleLogos> {
  const [logo, logo2x, logo3x] = await Promise.all([
    resizeAppleLogo(buffer, APPLE_HEIGHTS.logo),
    resizeAppleLogo(buffer, APPLE_HEIGHTS.logo2x),
    resizeAppleLogo(buffer, APPLE_HEIGHTS.logo3x),
  ]);
  return { logo, logo2x, logo3x };
}

/**
 * Carré plein bleed 660×660 : le logo est contenu dans 561×561 puis étendu
 * symétriquement jusqu'à 660 pour obtenir la marge de 15 % que Google
 * attend (il masque l'image en cercle) — jamais de masque appliqué ici.
 */
export async function generateGoogleLogo(buffer: Buffer): Promise<Buffer> {
  const inner = await sharp(buffer)
    .resize({
      width: GOOGLE_LOGO_INNER,
      height: GOOGLE_LOGO_INNER,
      fit: "contain",
      background: TRANSPARENT,
    })
    .png()
    .toBuffer();

  const pad = (GOOGLE_LOGO_SIZE - GOOGLE_LOGO_INNER) / 2;
  return sharp(inner)
    .extend({
      top: Math.floor(pad),
      bottom: Math.ceil(pad),
      left: Math.floor(pad),
      right: Math.ceil(pad),
      background: TRANSPARENT,
    })
    .png()
    .toBuffer();
}

/**
 * true pour carré et portrait (le logo devient illisible seul une fois
 * contraint par la hauteur) ; false seulement pour un paysage net — dans ce
 * cas, et seulement dans ce cas, le pass Apple peut omettre logoText.
 */
export async function isSquareLogo(buffer: Buffer): Promise<boolean> {
  const { width, height } = await sharp(buffer).metadata();
  if (!width || !height) return true;
  return width / height < LANDSCAPE_RATIO_THRESHOLD;
}
