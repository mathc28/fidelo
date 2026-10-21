import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./supabaseAdmin", () => ({ db: { rpc: vi.fn() } }));
vi.spyOn(console, "error").mockImplementation(() => {});

import { db } from "./supabaseAdmin";
import { clientIp, isRateLimited } from "./rateLimit";

const rpc = vi.mocked(db.rpc);

function requestWithHeaders(headers: Record<string, string>): NextRequest {
  return new NextRequest("http://localhost/api/test", { headers });
}

describe("clientIp", () => {
  it("uses the first entry of x-forwarded-for", () => {
    const req = requestWithHeaders({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" });
    expect(clientIp(req)).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip when there is no proxy chain", () => {
    const req = requestWithHeaders({ "x-real-ip": "9.9.9.9" });
    expect(clientIp(req)).toBe("9.9.9.9");
  });

  it("returns unknown when no IP header is present", () => {
    const req = requestWithHeaders({});
    expect(clientIp(req)).toBe("unknown");
  });
});

describe("isRateLimited", () => {
  afterEach(() => rpc.mockReset());
  const opts = { max: 10, windowSeconds: 600 };

  it("suit la réponse de la fonction SQL", async () => {
    rpc.mockResolvedValueOnce({ data: false, error: null } as never);
    expect(await isRateLimited("scan-pair", "1.2.3.4", { ...opts, siErreur: "bloquer" })).toBe(
      false
    );
    rpc.mockResolvedValueOnce({ data: true, error: null } as never);
    expect(await isRateLimited("scan-pair", "1.2.3.4", { ...opts, siErreur: "bloquer" })).toBe(
      true
    );
  });

  it("BLOQUE quand la fonction SQL renvoie une erreur (table ou fonction absente)", async () => {
    rpc.mockResolvedValueOnce({
      data: null,
      error: { message: "function rate_limit_hit does not exist" },
    } as never);
    expect(await isRateLimited("scan-pair", "1.2.3.4", { ...opts, siErreur: "bloquer" })).toBe(
      true
    );
  });

  it("BLOQUE quand la base est injoignable", async () => {
    rpc.mockRejectedValueOnce(new Error("fetch failed"));
    expect(await isRateLimited("lookup:m1", "1.2.3.4", { ...opts, siErreur: "bloquer" })).toBe(
      true
    );
  });

  it("laisse passer en cas d'erreur seulement si la route l'a choisi", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: "boom" } } as never);
    expect(await isRateLimited("pass", "1.2.3.4", { ...opts, siErreur: "laisser" })).toBe(false);
  });

  it("transmet les paramètres à rate_limit_hit", async () => {
    rpc.mockResolvedValueOnce({ data: false, error: null } as never);
    await isRateLimited("scan-pair-echecs", "global", {
      max: 50,
      windowSeconds: 900,
      siErreur: "bloquer",
      enregistrer: false,
    });
    expect(rpc).toHaveBeenCalledWith("rate_limit_hit", {
      p_bucket: "scan-pair-echecs",
      p_ip: "global",
      p_max: 50,
      p_fenetre_secondes: 900,
      p_enregistrer: false,
    });
  });
});
