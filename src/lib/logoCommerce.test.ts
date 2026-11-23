import { describe, expect, it } from "vitest";
import { urlLogoEntier } from "./logoCommerce";

describe("urlLogoEntier", () => {
  const base = "https://x.supabase.co/storage/v1/object/public/pass-assets/m1";

  it("remplace la vignette recadrée par le logo Apple entier, en gardant la version", () => {
    expect(urlLogoEntier(`${base}/web-icon.png?v=1700000000000`)).toBe(
      `${base}/logo@3x.png?v=1700000000000`
    );
    expect(urlLogoEntier(`${base}/web-icon.png`)).toBe(`${base}/logo@3x.png`);
  });

  it("rend tel quel ce qui n'est pas une vignette (aperçu local, autre URL)", () => {
    expect(urlLogoEntier("blob:http://localhost/1234")).toBe("blob:http://localhost/1234");
    expect(urlLogoEntier(`${base}/autre-web-icon.png`)).toBe(`${base}/autre-web-icon.png`);
  });

  it("pas de logo : null", () => {
    expect(urlLogoEntier(null)).toBeNull();
    expect(urlLogoEntier(undefined)).toBeNull();
    expect(urlLogoEntier("")).toBeNull();
  });
});
