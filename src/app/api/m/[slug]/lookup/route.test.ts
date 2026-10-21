import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { clients, envoyer } = vi.hoisted(() => ({
  clients: new Map<string, { serial_number: string; first_name: string; points: number }>(),
  envoyer: vi.fn(),
}));

vi.mock("@/lib/config", () => ({ config: { baseUrl: "https://fiduo.app" } }));
vi.mock("@/lib/emailCarte", () => ({ envoyerEmailCarte: envoyer }));
vi.mock("@/lib/rateLimit", () => ({
  clientIp: () => "1.2.3.4",
  isRateLimited: vi.fn().mockResolvedValue(false),
}));
vi.mock("@/lib/supabaseAdmin", () => ({
  getMerchantBySlug: vi.fn().mockResolvedValue({
    id: "m1",
    slug: "boulangerie-martin",
    name: "Boulangerie Martin",
    program_type: "visits",
  }),
  db: {
    from: () => {
      let email = "";
      const q = {
        select: () => q,
        eq: (col: string, v: string) => {
          if (col === "email") email = v;
          return q;
        },
        maybeSingle: async () => ({ data: clients.get(email) ?? null, error: null }),
      };
      return q;
    },
  },
}));

import { POST } from "./route";
import { DUREE_REPONSE_MS } from "@/lib/lienCarte";

function appel(email: string) {
  const req = new NextRequest("https://fiduo.app/api/m/boulangerie-martin/lookup", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
  return POST(req, { params: { slug: "boulangerie-martin" } });
}

/** Lance l'appel et fait avancer l'horloge simulée jusqu'à la réponse. */
async function repondre(email: string) {
  const debut = Date.now();
  const promesse = appel(email);
  await vi.advanceTimersByTimeAsync(DUREE_REPONSE_MS);
  const res = await promesse;
  return { status: res.status, corps: await res.text(), duree: Date.now() - debut };
}

describe("POST /api/m/[slug]/lookup", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    clients.clear();
    clients.set("lea@example.com", {
      serial_number: "SERIE-SECRETE",
      first_name: "Léa",
      points: 7,
    });
  });
  afterEach(() => {
    vi.useRealTimers();
    envoyer.mockReset();
  });

  it("répond exactement pareil qu'une carte existe ou non", async () => {
    const existe = await repondre("lea@example.com");
    const nExistePas = await repondre("inconnu@example.com");

    expect(existe.status).toBe(200);
    expect(existe).toEqual(nExistePas);
    expect(existe.corps).toContain("Si une carte existe pour cet email");
  });

  it("ne renvoie jamais le numéro de série ni de donnée de carte", async () => {
    const { corps } = await repondre("lea@example.com");
    expect(corps).not.toContain("SERIE-SECRETE");
    expect(corps).not.toMatch(/appleUrl|googleUrl|points|Léa/);
  });

  it("envoie le lien par email au seul titulaire d'une carte", async () => {
    await repondre("lea@example.com");
    await repondre("inconnu@example.com");
    expect(envoyer).toHaveBeenCalledTimes(1);
    expect(envoyer).toHaveBeenCalledWith(
      "lea@example.com",
      expect.objectContaining({
        commerce: "Boulangerie Martin",
        lienApple: "https://fiduo.app/api/pass/apple/SERIE-SECRETE",
      })
    );
  });

  it("répond de la même façon même si l'envoi d'email échoue", async () => {
    envoyer.mockRejectedValueOnce(new Error("Resend indisponible"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const echec = await repondre("lea@example.com");
    const inconnu = await repondre("inconnu@example.com");
    expect(echec).toEqual(inconnu);
  });
});
