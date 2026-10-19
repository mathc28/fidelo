import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("./dashboardAuth", () => ({ requireMerchantEtCompte: vi.fn() }));
vi.mock("./site", () => ({ CGV_VERSION: "2.0" }));

import { requireMerchantEtCompte } from "./dashboardAuth";
import { ERREUR_CGV, exigerCommercantAJour } from "./cgvServeur";

const auth = vi.mocked(requireMerchantEtCompte);
const requete = () => new NextRequest("https://fiduo.app/api/dashboard/promo", { method: "POST" });

function compte(cgvVersion: string | null, email = "gerant@boulangerie.fr") {
  return { merchant: { id: "m1", cgv_version: cgvVersion } as never, email };
}

describe("exigerCommercantAJour", () => {
  const envAvant = process.env.PLATFORM_ADMIN_EMAILS;
  beforeEach(() => {
    process.env.PLATFORM_ADMIN_EMAILS = "admin@fiduo.app";
  });
  afterEach(() => {
    process.env.PLATFORM_ADMIN_EMAILS = envAvant;
    auth.mockReset();
  });

  it("laisse passer un commerçant qui a accepté la version en vigueur", async () => {
    auth.mockResolvedValue(compte("2.0"));
    const garde = await exigerCommercantAJour(requete());
    expect(garde).toEqual({ merchant: expect.objectContaining({ id: "m1" }) });
  });

  it("refuse (403 cgv_non_acceptees) un commerçant qui n'a jamais accepté", async () => {
    auth.mockResolvedValue(compte(null));
    const garde = await exigerCommercantAJour(requete());
    expect("reponse" in garde && garde.reponse.status).toBe(403);
    if ("reponse" in garde) expect(await garde.reponse.json()).toEqual({ error: ERREUR_CGV });
  });

  it("refuse un commerçant qui a accepté une version obsolète", async () => {
    auth.mockResolvedValue(compte("1.0"));
    const garde = await exigerCommercantAJour(requete());
    expect("reponse" in garde && garde.reponse.status).toBe(403);
  });

  it("laisse passer un admin plateforme, même sans acceptation", async () => {
    auth.mockResolvedValue(compte(null, "Admin@Fiduo.app"));
    const garde = await exigerCommercantAJour(requete());
    expect("merchant" in garde).toBe(true);
  });

  it("refuse (401) sans commerçant connecté", async () => {
    auth.mockResolvedValue(null);
    const garde = await exigerCommercantAJour(requete());
    expect("reponse" in garde && garde.reponse.status).toBe(401);
  });
});
