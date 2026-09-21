import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Merchant } from "./supabaseAdmin";

type Call = { method: string; url: string; data: Record<string, unknown> };

const calls: Call[] = [];
/** Statut du prochain PATCH par type de ressource : 404 simule une absence chez Google. */
let patchStatus = { loyaltyClass: 200, loyaltyObject: 200 };

vi.mock("google-auth-library", () => ({
  GoogleAuth: class {
    async getClient() {
      return {
        async request(opts: Call) {
          calls.push(opts);
          const kind = opts.url.includes("/loyaltyObject") ? "loyaltyObject" : "loyaltyClass";
          if (opts.method === "PATCH" && patchStatus[kind] !== 200) {
            throw { response: { status: patchStatus[kind], data: {} } };
          }
          return { status: 200, data: {} };
        },
      };
    }
  },
}));

vi.mock("./config", () => ({
  config: {
    baseUrl: "https://fiduo.test",
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

const { ensureMerchantClass, ensureLoyaltyObject, rewardSummary, frenchOrdinal } =
  await import("./googleWallet");

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
    patchStatus = { loyaltyClass: 200, loyaltyObject: 200 };
    update.mockClear();
  });

  // Google refuse en 400 tout PATCH omettant reviewStatus sur une classe déjà
  // approuvée : il faut la resoumettre explicitement à revue.
  it("envoie reviewStatus UNDER_REVIEW dans le PATCH", async () => {
    await ensureMerchantClass(buildMerchant({ google_class_id: "3388000000000000000.old" }));

    const patch = calls.find((c) => c.method === "PATCH");
    expect(patch).toBeDefined();
    expect(patch!.data.reviewStatus).toBe("UNDER_REVIEW");
  });

  it("ne met jamais APPROVED dans une écriture", async () => {
    patchStatus.loyaltyClass = 404;
    await ensureMerchantClass(buildMerchant());

    for (const call of calls) expect(call.data.reviewStatus).not.toBe("APPROVED");
  });

  it("patche l'id déterministe même quand google_class_id est vide", async () => {
    await ensureMerchantClass(buildMerchant({ google_class_id: null }));

    expect(calls.map((c) => c.method)).toEqual(["PATCH"]);
    expect(calls[0].url).toContain("/loyaltyClass/3388000000000000000.test-merchant");
  });

  it("ne crée la classe que sur 404, avec reviewStatus UNDER_REVIEW", async () => {
    patchStatus.loyaltyClass = 404;
    await ensureMerchantClass(buildMerchant());

    const post = calls.find((c) => c.method === "POST");
    expect(post).toBeDefined();
    expect(post!.data.reviewStatus).toBe("UNDER_REVIEW");
  });

  it("laisse remonter les autres erreurs du PATCH", async () => {
    patchStatus.loyaltyClass = 400;
    await expect(ensureMerchantClass(buildMerchant())).rejects.toMatchObject({
      response: { status: 400 },
    });
  });

  it("décrit le recto : compteur seul, puis prénom + récompense", async () => {
    await ensureMerchantClass(buildMerchant());

    const rows = (calls.find((c) => c.method === "PATCH")!.data as any).classTemplateInfo
      .cardTemplateOverride.cardRowTemplateInfos;
    expect(rows).toHaveLength(2);
    expect(rows[0].oneItem.item.firstValue.fields[0].fieldPath).toBe(
      "object.loyaltyPoints.balance"
    );
    expect(rows[1].twoItems.startItem.firstValue.fields[0].fieldPath).toBe("object.accountName");
    expect(rows[1].twoItems.endItem.firstValue.fields[0].fieldPath).toBe(
      "object.textModulesData['reward']"
    );
  });
});

describe("ensureLoyaltyObject", () => {
  const customer = {
    serial_number: "abc123",
    email: "a@b.c",
    first_name: "Camille",
    points: 7,
  } as any;
  const reward = { active: true, cost_points: 10, label: "Café offert" } as any;

  beforeEach(() => {
    calls.length = 0;
    patchStatus = { loyaltyClass: 200, loyaltyObject: 200 };
  });

  it("ne porte le prénom que via accountName, sans textModule Membre", async () => {
    await ensureLoyaltyObject(customer, buildMerchant(), reward);

    const patch = calls.find((c) => c.url.includes("/loyaltyObject"))!.data as any;
    expect(patch.accountName).toBe("Camille");
    expect(patch.textModulesData.map((t: any) => t.id)).toEqual(["reward"]);
  });

  it("resynchronise un objet existant au lieu de le recréer", async () => {
    await ensureLoyaltyObject(customer, buildMerchant(), reward);

    const objectCalls = calls.filter((c) => c.url.includes("/loyaltyObject"));
    expect(objectCalls.map((c) => c.method)).toEqual(["PATCH"]);
  });

  it("crée l'objet quand Google répond 404", async () => {
    patchStatus.loyaltyObject = 404;
    await ensureLoyaltyObject(customer, buildMerchant(), reward);

    const objectCalls = calls.filter((c) => c.url.includes("/loyaltyObject"));
    expect(objectCalls.map((c) => c.method)).toEqual(["PATCH", "POST"]);
    expect((objectCalls[1].data as any).id).toBe("3388000000000000000.abc123");
  });

  it("omet le textModule récompense quand aucune n'est active", async () => {
    await ensureLoyaltyObject(customer, buildMerchant(), null);

    const patch = calls.find((c) => c.url.includes("/loyaltyObject"))!.data as any;
    expect(patch.textModulesData).toEqual([]);
  });
});

describe("rewardSummary", () => {
  const reward = (cost: number) =>
    ({ id: "r1", merchant_id: "m1", label: "Café offert", cost_points: cost, active: true }) as any;

  it("énonce un seuil de passages comme un rang", () => {
    expect(frenchOrdinal(1)).toBe("1er");
    expect(rewardSummary(reward(10), true)).toBe("Café offert au 10e passage");
  });

  it("énonce un seuil de points comme un total", () => {
    expect(rewardSummary(reward(250), false)).toBe("Café offert à 250 points");
  });

  it("rend null quand le commerce n'a pas de récompense", () => {
    expect(rewardSummary(null, true)).toBeNull();
  });
});
