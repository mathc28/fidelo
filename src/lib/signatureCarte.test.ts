import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/*
 * Liens de carte signés : le helper, puis les deux routes de téléchargement
 * (Apple et Google), qui doivent répondre exactement comme pour un serial
 * inconnu dès que la signature manque ou ne correspond pas.
 */

const { clients, buildApplePass, ensureLoyaltyObject } = vi.hoisted(() => ({
  clients: new Map<string, Record<string, unknown>>(),
  buildApplePass: vi.fn(),
  ensureLoyaltyObject: vi.fn(),
}));

vi.mock("@/lib/rateLimit", () => ({
  clientIp: () => "1.2.3.4",
  isRateLimited: vi.fn().mockResolvedValue(false),
}));
vi.mock("@/lib/supabaseAdmin", () => ({
  db: {
    from: () => {
      let serial = "";
      const q = {
        select: () => q,
        eq: (_: string, v: string) => ((serial = v), q),
        single: async () => ({ data: clients.get(serial) ?? null, error: null }),
      };
      return q;
    },
  },
  getMerchantById: vi.fn().mockResolvedValue({ id: "m1", slug: "cafe-cosi", name: "Café Cosi" }),
}));
vi.mock("@/lib/loyalty", () => ({ getMerchantReward: vi.fn().mockResolvedValue(null) }));
vi.mock("@/lib/applePass", () => ({ buildApplePass }));
vi.mock("@/lib/googleWallet", () => ({
  ensureLoyaltyObject,
  buildSaveUrl: () => "https://pay.google.com/gp/v/save/jeton",
}));

import { liensCarte, signatureValide, signerSerial } from "./signatureCarte";
import { GET as getApple } from "@/app/api/pass/apple/[serial]/route";
import { GET as getGoogle } from "@/app/api/pass/google/[serial]/route";

const SERIAL = "1b4e28ba-2fa1-11d2-883f-0016d3cca427";

const appel = (route: typeof getApple, plateforme: string, serial: string, t?: string) =>
  route(
    new NextRequest(
      `https://fiduo.app/api/pass/${plateforme}/${serial}${t === undefined ? "" : `?t=${t}`}`
    ),
    { params: Promise.resolve({ serial }) }
  );

beforeEach(() => {
  vi.stubEnv("PASS_LINK_SECRET", "secret-de-test");
  clients.clear();
  clients.set(SERIAL, { serial_number: SERIAL, merchant_id: "m1", email: "lea@exemple.fr" });
  buildApplePass.mockReset().mockResolvedValue(Buffer.from("pkpass"));
  ensureLoyaltyObject.mockReset().mockResolvedValue(undefined);
});
afterEach(() => vi.unstubAllEnvs());

describe("signature d'un serial", () => {
  it("HMAC-SHA256 en base64url, stable pour un même serial", () => {
    const t = signerSerial(SERIAL);
    expect(t).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(signerSerial(SERIAL)).toBe(t);
    expect(signerSerial("autre-serial")).not.toBe(t);
  });

  it("valide la bonne signature, refuse une signature altérée, absente ou d'un autre serial", () => {
    const t = signerSerial(SERIAL);
    expect(signatureValide(SERIAL, t)).toBe(true);
    expect(signatureValide(SERIAL, t.slice(0, -1) + (t.endsWith("A") ? "B" : "A"))).toBe(false);
    expect(signatureValide(SERIAL, t.slice(0, 10))).toBe(false);
    expect(signatureValide(SERIAL, "")).toBe(false);
    expect(signatureValide(SERIAL, null)).toBe(false);
    expect(signatureValide(SERIAL, signerSerial("autre-serial"))).toBe(false);
  });

  it("dépend du secret : un autre secret invalide les liens", () => {
    const t = signerSerial(SERIAL);
    vi.stubEnv("PASS_LINK_SECRET", "autre-secret");
    expect(signatureValide(SERIAL, t)).toBe(false);
  });

  it("sans secret configuré : aucune signature valide, et aucun lien construit", () => {
    const t = signerSerial(SERIAL);
    vi.stubEnv("PASS_LINK_SECRET", "");
    expect(signatureValide(SERIAL, t)).toBe(false);
    expect(() => liensCarte(SERIAL)).toThrow("PASS_LINK_SECRET");
  });

  it("construit les deux liens, relatifs ou absolus", () => {
    const t = signerSerial(SERIAL);
    expect(liensCarte(SERIAL)).toEqual({
      apple: `/api/pass/apple/${SERIAL}?t=${t}`,
      google: `/api/pass/google/${SERIAL}?t=${t}`,
    });
    expect(liensCarte(SERIAL, "https://fiduo.app").apple).toBe(
      `https://fiduo.app/api/pass/apple/${SERIAL}?t=${t}`
    );
  });
});

describe.each([
  ["apple", getApple],
  ["google", getGoogle],
] as const)("GET /api/pass/%s/[serial]", (plateforme, route) => {
  it("signature valide : la carte est servie", async () => {
    const res = await appel(route, plateforme, SERIAL, signerSerial(SERIAL));
    if (plateforme === "apple") {
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("application/vnd.apple.pkpass");
    } else {
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("pay.google.com");
    }
  });

  it.each([
    ["invalide", "signature-inventee"],
    ["absente", undefined],
    ["d'un autre serial", "AUTRE"],
  ])("signature %s : 404 « Carte introuvable », rien n'est généré", async (_, t) => {
    const sig = t === "AUTRE" ? signerSerial("autre-serial") : t;
    const res = await appel(route, plateforme, SERIAL, sig);
    expect(res.status).toBe(404);
    expect(await res.text()).toBe("Carte introuvable");
    expect(buildApplePass).not.toHaveBeenCalled();
    expect(ensureLoyaltyObject).not.toHaveBeenCalled();
  });

  it("serial inconnu, même bien signé : la même réponse 404", async () => {
    const inconnu = "00000000-0000-0000-0000-000000000000";
    const res = await appel(route, plateforme, inconnu, signerSerial(inconnu));
    expect(res.status).toBe(404);
    expect(await res.text()).toBe("Carte introuvable");
  });
});
