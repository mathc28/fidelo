import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  LogoTooSmallError,
  generateAppleLogos,
  generateGoogleLogo,
  getLogoSizeWarning,
  isSquareLogo,
  normalizeSource,
  formatLogo,
} from "./logo-pipeline";

const MARK_COLOR = { r: 20, g: 60, b: 120, alpha: 1 };
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };

/** Canvas uni (blanc par défaut) avec une marque colorée centrée — simule un logo avec marges. */
async function fixture(opts: {
  canvasW: number;
  canvasH: number;
  markW: number;
  markH: number;
  background?: { r: number; g: number; b: number; alpha: number };
}): Promise<Buffer> {
  const mark = await sharp({
    create: { width: opts.markW, height: opts.markH, channels: 4, background: MARK_COLOR },
  })
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: opts.canvasW,
      height: opts.canvasH,
      channels: 4,
      background: opts.background ?? WHITE,
    },
  })
    .composite([{ input: mark, gravity: "center" }])
    .png()
    .toBuffer();
}

async function dims(buffer: Buffer) {
  const { width, height } = await sharp(buffer).metadata();
  return { width: width ?? 0, height: height ?? 0 };
}

describe("normalizeSource", () => {
  it("trims white margins and keeps a large-enough square logo", async () => {
    const input = await fixture({ canvasW: 1400, canvasH: 1400, markW: 1200, markH: 1200 });
    const normalized = await normalizeSource(input);
    const { width, height } = await dims(normalized);
    expect(width).toBeCloseTo(1200, -1);
    expect(height).toBeCloseTo(1200, -1);
  });

  it("trims large white margins down to the visible mark", async () => {
    const input = await fixture({ canvasW: 3000, canvasH: 3000, markW: 1050, markH: 1050 });
    const normalized = await normalizeSource(input);
    const { width, height } = await dims(normalized);
    expect(Math.max(width, height)).toBeGreaterThanOrEqual(400);
    expect(width).toBeLessThan(1200);
  });

  it("rejects a logo that is really unusable after trim (< 400px)", async () => {
    const input = await fixture({ canvasW: 500, canvasH: 500, markW: 300, markH: 300 });
    await expect(normalizeSource(input)).rejects.toThrow(LogoTooSmallError);
  });

  it("accepts a logo right at the 400px floor", async () => {
    const input = await fixture({ canvasW: 600, canvasH: 600, markW: 400, markH: 400 });
    const normalized = await normalizeSource(input);
    const { width, height } = await dims(normalized);
    expect(Math.max(width, height)).toBeGreaterThanOrEqual(400);
  });

  it("handles JPEG (no alpha channel) input", async () => {
    const input = await fixture({ canvasW: 1200, canvasH: 1200, markW: 1100, markH: 1100 });
    const jpeg = await sharp(input).flatten({ background: WHITE }).jpeg().toBuffer();
    const normalized = await normalizeSource(jpeg);
    const { width, height } = await dims(normalized);
    expect(Math.max(width, height)).toBeGreaterThanOrEqual(400);
  });

  it("rasterizes SVG input at a high-enough density to pass the size floor", async () => {
    const svg = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#123456"/></svg>`
    );
    const normalized = await normalizeSource(svg);
    const { width, height } = await dims(normalized);
    expect(Math.max(width, height)).toBeGreaterThanOrEqual(400);
  });
});

describe("getLogoSizeWarning", () => {
  it("warns between the 400px floor and the 660px recommended minimum", async () => {
    const input = await fixture({ canvasW: 700, canvasH: 700, markW: 500, markH: 500 });
    const normalized = await normalizeSource(input);
    expect(await getLogoSizeWarning(normalized)).toMatch(/un peu petit/);
  });

  it("stays silent at or above the 660px recommended minimum", async () => {
    const input = await fixture({ canvasW: 900, canvasH: 900, markW: 700, markH: 700 });
    const normalized = await normalizeSource(input);
    expect(await getLogoSizeWarning(normalized)).toBeNull();
  });
});

describe("generateAppleLogos", () => {
  it("derives 3 distinct height-constrained variants from a square source", async () => {
    const source = await fixture({ canvasW: 1400, canvasH: 1400, markW: 1200, markH: 1200 });
    const { logo, logo2x, logo3x } = await generateAppleLogos(source);

    const d1 = await dims(logo);
    const d2 = await dims(logo2x);
    const d3 = await dims(logo3x);

    expect(d1.height).toBe(50);
    expect(d2.height).toBe(100);
    expect(d3.height).toBe(150);
    // largeur libre (contrainte = hauteur uniquement) : un logo carré reste carré
    expect(d1.width).toBeCloseTo(50, -1);
    expect(d3.width).toBeCloseTo(150, -1);

    expect(Buffer.compare(logo, logo2x)).not.toBe(0);
    expect(Buffer.compare(logo2x, logo3x)).not.toBe(0);
  });

  it("contains a wide landscape logo inside Apple's box instead of overflowing it", async () => {
    const raw = await fixture({ canvasW: 2000, canvasH: 600, markW: 1800, markH: 300 });
    const source = await normalizeSource(raw);
    const { logo, logo3x } = await generateAppleLogos(source);

    // Source en 6:1 : c'est la largeur qui borne, pas la hauteur. Avant, on ne
    // contraignait que la hauteur et le @3x sortait en 900x150 — largement
    // au-delà des 480 pt qu'iOS accepte, qui le réduisait ensuite lui-même.
    const d1 = await dims(logo);
    const d3 = await dims(logo3x);
    expect(d1.width).toBe(160);
    expect(d1.height).toBeCloseTo(27, -1); // 160 / 6
    expect(d3.width).toBe(480);
    expect(d3.height).toBeCloseTo(80, -1); // 480 / 6
    // Le ratio d'origine est préservé : jamais de déformation.
    expect(d3.width / d3.height).toBeCloseTo(6, 0);
  });
});

describe("generateGoogleLogo", () => {
  it("returns a 660x660 square with ~15% transparent margin, never masked", async () => {
    const source = await fixture({ canvasW: 1400, canvasH: 1400, markW: 1200, markH: 1200 });
    const output = await generateGoogleLogo(source);
    const { width, height } = await dims(output);
    expect(width).toBe(660);
    expect(height).toBe(660);

    const raw = await sharp(output).raw().ensureAlpha().toBuffer();
    const channels = 4;
    const alphaAt = (x: number, y: number) => raw[(y * width + x) * channels + 3];

    expect(alphaAt(5, 5)).toBe(0); // coin : marge transparente
    expect(alphaAt(330, 330)).toBeGreaterThan(0); // centre : logo visible
  });
});

describe("isSquareLogo", () => {
  it("is true for a square logo", async () => {
    const input = await fixture({ canvasW: 1400, canvasH: 1400, markW: 1200, markH: 1200 });
    const normalized = await normalizeSource(input);
    expect(await isSquareLogo(normalized)).toBe(true);
  });

  it("is true for a portrait logo (still too narrow once height-constrained)", async () => {
    const input = await fixture({ canvasW: 600, canvasH: 2000, markW: 300, markH: 1800 });
    const normalized = await normalizeSource(input);
    expect(await isSquareLogo(normalized)).toBe(true);
  });

  it("is false for a clear landscape wordmark", async () => {
    const input = await fixture({ canvasW: 2000, canvasH: 600, markW: 1800, markH: 300 });
    const normalized = await normalizeSource(input);
    expect(await isSquareLogo(normalized)).toBe(false);
  });
});

describe("formatLogo (format lu dans le contenu)", () => {
  const carre = () =>
    sharp({ create: { width: 500, height: 500, channels: 4, background: "#123456" } });

  it("accepte PNG, JPEG, WebP et SVG", async () => {
    expect(await formatLogo(await carre().png().toBuffer())).toBe("png");
    expect(await formatLogo(await carre().jpeg().toBuffer())).toBe("jpeg");
    expect(await formatLogo(await carre().webp().toBuffer())).toBe("webp");
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>');
    expect(await formatLogo(svg)).toBe("svg");
  });

  it("refuse un autre format d'image (GIF, TIFF)", async () => {
    expect(await formatLogo(await carre().gif().toBuffer())).toBeNull();
    expect(await formatLogo(await carre().tiff().toBuffer())).toBeNull();
  });

  it("refuse un fichier qui n'est pas une image, quelle que soit son extension", async () => {
    expect(await formatLogo(Buffer.from("%PDF-1.7 pas une image"))).toBeNull();
    expect(await formatLogo(Buffer.from("<html><body>logo.png</body></html>"))).toBeNull();
  });
});

describe("normalizeSource avec un WebP", () => {
  it("traite un WebP comme les autres formats", async () => {
    const webp = await sharp({
      create: { width: 800, height: 800, channels: 4, background: "#123456" },
    })
      .webp()
      .toBuffer();
    const normalized = await normalizeSource(webp);
    const meta = await sharp(normalized).metadata();
    expect(meta.format).toBe("png");
    expect(Math.max(meta.width ?? 0, meta.height ?? 0)).toBeGreaterThanOrEqual(400);
  });
});
