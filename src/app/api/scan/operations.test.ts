import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/*
 * Limite des opérations en caisse : crédit (earn) et récompense (redeem)
 * partagent 120 opérations par caisse et par 10 minutes. La vraie
 * isRateLimited est utilisée ; seule la fonction SQL rate_limit_hit est
 * simulée par un compteur en mémoire.
 */

const { compteurs, rpc, appareil, transaction } = vi.hoisted(() => {
  const compteurs = new Map<string, number>();
  return {
    compteurs,
    // Comme rate_limit_hit : compte le passage, true au-delà du maximum.
    rpc: vi.fn(async (_: string, a: { p_bucket: string; p_ip: string; p_max: number }) => {
      const cle = `${a.p_bucket}|${a.p_ip}`;
      const n = (compteurs.get(cle) ?? 0) + 1;
      compteurs.set(cle, n);
      return { data: n > a.p_max, error: null };
    }),
    appareil: { deviceId: "d1" },
    transaction: vi.fn(),
  };
});

vi.mock("@/lib/supabaseAdmin", () => ({
  merchantActive: () => true,
  db: {
    rpc,
    from: () => {
      const q = {
        select: () => q,
        eq: () => q,
        single: async () => ({
          data: { id: "c1", serial_number: "serial-lea", first_name: "Léa", points: 30 },
        }),
      };
      return q;
    },
  },
}));
vi.mock("@/lib/loyalty", () => ({
  applyTransaction: transaction,
  getMerchantReward: vi.fn().mockResolvedValue({ id: "r1", label: "Un café", cost_points: 10 }),
}));
vi.mock("@/lib/deviceAuth", async (original) => ({
  ...(await original<typeof import("@/lib/deviceAuth")>()),
  requireDevice: vi.fn(async () => ({
    deviceId: appareil.deviceId,
    merchant: { id: "cosi", name: "Café Cosi", program_type: "visits" },
  })),
}));

import { POST as crediter } from "./earn/route";
import { POST as offrir } from "./redeem/route";
import { MESSAGE_OPERATIONS_LIMITEES } from "@/lib/deviceAuth";

const appel = (route: typeof crediter, chemin: string) =>
  route(
    new NextRequest(`https://fiduo.app/api/scan/${chemin}`, {
      method: "POST",
      headers: { Authorization: "Device jeton" },
      body: JSON.stringify({ serial: "serial-lea" }),
    })
  );
const credit = () => appel(crediter, "earn");
const recompense = () => appel(offrir, "redeem");

beforeEach(() => {
  compteurs.clear();
  appareil.deviceId = "d1";
  rpc.mockClear();
  transaction.mockReset().mockResolvedValue({ ok: true, customer: { points: 0 } });
});

describe("POST /api/scan/earn et /api/scan/redeem : limite par caisse", () => {
  it("compte chaque opération dans le même bucket, par appareil", async () => {
    await credit();
    await recompense();
    expect(rpc).toHaveBeenCalledTimes(2);
    for (const [, args] of rpc.mock.calls) {
      expect(args).toMatchObject({
        p_bucket: "scan-operation:cosi",
        p_ip: "d1",
        p_max: 120,
        p_fenetre_secondes: 600,
      });
    }
  });

  it("120 opérations passent, la 121e reçoit un 429 clair sans rien écrire", async () => {
    for (let i = 0; i < 60; i++) {
      expect((await credit()).status).toBe(200);
      expect((await recompense()).status).toBe(200);
    }
    expect(transaction).toHaveBeenCalledTimes(120);

    for (const res of [await credit(), await recompense()]) {
      expect(res.status).toBe(429);
      expect(await res.text()).toBe(MESSAGE_OPERATIONS_LIMITEES);
    }
    expect(transaction).toHaveBeenCalledTimes(120);
  });

  it("la limite d'une caisse ne bloque pas une autre caisse", async () => {
    for (let i = 0; i < 120; i++) await credit();
    expect((await credit()).status).toBe(429);

    appareil.deviceId = "d2";
    expect((await credit()).status).toBe(200);
  });

  it("limite indisponible : la caisse continue d'encaisser", async () => {
    const journal = vi.spyOn(console, "error").mockImplementation(() => {});
    rpc.mockRejectedValueOnce(new Error("base injoignable"));
    rpc.mockResolvedValueOnce({ data: null, error: { message: "fonction absente" } } as never);

    expect((await credit()).status).toBe(200);
    expect((await recompense()).status).toBe(200);
    expect(transaction).toHaveBeenCalledTimes(2);
    expect(journal).toHaveBeenCalledTimes(2);
    journal.mockRestore();
  });
});
