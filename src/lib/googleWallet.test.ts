import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Merchant } from "./supabaseAdmin";

type Call = { method: string; url: string; data: Record<string, unknown> };

const calls: Call[] = [];
/** Statut renvoyé par le prochain PATCH : 404 simule une classe absente chez Google. */
let patchStatus = 200;

vi.mock("google-auth-library", () => ({
  GoogleAuth: class {
    async getClient() {
      return {
        async request(opts: Call) {
          calls.push(opts);
          if (opts.method === "PATCH" && patchStatus !== 200) {
            throw { response: { status: patchStatus, data: {} } };
          }
          return { status: 200, data: {} };
        },
      };
    }
  },
}));

vi.mock("./config", () => ({
  config: {
    baseUrl: "https://fidelo.test",
    google: { issuerId: "3388000000000000000", saEmail: "sa@test", saKey: () => "key" },
  },
}));

const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) });

vi.mock("./supabaseAdmin", () => ({
  db: {
    from: () => ({ update }),
    storage: {
      from: () => ({
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `https://storage.test/${path}` },
        }),
      }),
    },
  },
  getCardTheme: async () => ({ bg_color: "#123456" }),
}));

const { ensureMerchantClass } = await import("./googleWallet");

function buildMerchant(overrides: Partial<Merchant> = {}): Merchant {
  return {
    id: "merchant-1",
    owner_id: "owner-1",
    slug: "test-merchant",
    name: "Test Merchant",
    logo_url: null,
    is_square_logo: false,
    theme_id: "marine",
    address: null,
    lat: null,
    lng: null,
    program_type: "visits",
    max_scans_per_day: 1,
    google_class_id: null,
    subscription_status: "active",
    ...overrides,
  } as Merchant;
}

describe("ensureMerchantClass", () => {
  beforeEach(() => {
    calls.length = 0;
    patchStatus = 200;
    update.mockClear();
  });

  it("ne met jamais reviewStatus dans le PATCH", async () => {
    await ensureMerchantClass(buildMerchant({ google_class_id: "3388000000000000000.old" }));

    const patch = calls.find((c) => c.method === "PATCH");
    expect(patch).toBeDefined();
    expect(patch!.data).not.toHaveProperty("reviewStatus");
  });

  it("patche l'id déterministe même quand google_class_id est vide", async () => {
    await ensureMerchantClass(buildMerchant({ google_class_id: null }));

    expect(calls.map((c) => c.method)).toEqual(["PATCH"]);
    expect(calls[0].url).toContain("/loyaltyClass/3388000000000000000.test-merchant");
  });

  it("ne crée la classe que sur 404, avec reviewStatus UNDER_REVIEW", async () => {
    patchStatus = 404;
    await ensureMerchantClass(buildMerchant());

    const post = calls.find((c) => c.method === "POST");
    expect(post).toBeDefined();
    expect(post!.data.reviewStatus).toBe("UNDER_REVIEW");
  });

  it("laisse remonter les autres erreurs du PATCH", async () => {
    patchStatus = 400;
    await expect(ensureMerchantClass(buildMerchant())).rejects.toMatchObject({
      response: { status: 400 },
    });
  });
});
