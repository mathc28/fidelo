import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/*
 * Carte introuvable en caisse : on distingue la carte d'un autre commerce
 * d'un serial inconnu, sans rien révéler de l'autre commerce ni du client.
 */

const { cartes, limite } = vi.hoisted(() => ({
  // serial → commerce de la carte
  cartes: new Map<string, string>(),
  limite: vi.fn(),
}));

vi.mock("@/lib/rateLimit", () => ({ isRateLimited: limite }));
vi.mock("@/lib/loyalty", () => ({ getMerchantReward: vi.fn().mockResolvedValue(null) }));
vi.mock("@/lib/supabaseAdmin", () => ({
  db: {
    from: () => {
      const filtres: Record<string, string> = {};
      let comptage = false;
      const q = {
        select: (_: string, opts?: { count?: string }) => ((comptage = !!opts?.count), q),
        eq: (col: string, v: string) => ((filtres[col] = v), q),
        // Lecture scopée au commerce de la caisse (lookup).
        single: async () => {
          const commerce = cartes.get(filtres.serial_number);
          const trouvee = commerce && commerce === filtres.merchant_id;
          return { data: trouvee ? { id: "c1", serial_number: filtres.serial_number } : null };
        },
        // Comptage tous commerces confondus (messageCarteIntrouvable).
        then: (resoudre: (r: { count: number | null }) => void) =>
          resoudre({ count: comptage && cartes.has(filtres.serial_number) ? 1 : 0 }),
      };
      return q;
    },
  },
}));
vi.mock("@/lib/deviceAuth", async (original) => ({
  ...(await original<typeof import("@/lib/deviceAuth")>()),
  requireDevice: vi.fn().mockResolvedValue({
    deviceId: "d1",
    merchant: { id: "cosi", name: "Café Cosi", program_type: "points", max_scans_per_day: 1 },
  }),
}));

import { POST } from "./route";

const scanner = (serial: string) =>
  POST(
    new NextRequest("https://fiduo.app/api/scan/lookup", {
      method: "POST",
      headers: { Authorization: "Device jeton" },
      body: JSON.stringify({ serial }),
    })
  );

beforeEach(() => {
  cartes.clear();
  cartes.set("serial-martin", "boulangerie-martin");
  limite.mockReset().mockResolvedValue(false);
});

describe("POST /api/scan/lookup : carte introuvable", () => {
  it("carte d'un autre commerce : le dit, sans le nommer ni rien dire du client", async () => {
    const res = await scanner("serial-martin");
    expect(res.status).toBe(404);
    const texte = await res.text();
    expect(texte).toBe("Cette carte appartient à un autre commerce.");
    expect(texte).not.toMatch(/martin|boulangerie/i);
  });

  it("serial inconnu : rappelle quelle carte présenter, au nom du commerce de la caisse", async () => {
    const res = await scanner("n-importe-quoi");
    expect(res.status).toBe(404);
    expect(await res.text()).toBe(
      "Carte inconnue. Vérifiez que le client présente bien sa carte Café Cosi."
    );
  });

  it("les deux cas passent par la limite de recherches de la caisse", async () => {
    await scanner("serial-martin");
    await scanner("n-importe-quoi");
    expect(limite).toHaveBeenCalledTimes(2);
    expect(limite).toHaveBeenCalledWith("scan-lookup:cosi", "d1", {
      max: 120,
      windowSeconds: 600,
      siErreur: "bloquer",
    });

    // Limite atteinte : 429, sans rien dire de la carte.
    limite.mockResolvedValue(true);
    const res = await scanner("serial-martin");
    expect(res.status).toBe(429);
    expect(await res.text()).not.toContain("autre commerce");
  });
});
