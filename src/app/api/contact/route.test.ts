import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { limite } = vi.hoisted(() => ({ limite: vi.fn() }));
vi.mock("@/lib/rateLimit", () => ({ clientIp: () => "1.2.3.4", isRateLimited: limite }));

import { POST } from "./route";

const VALIDE = {
  commerce: "Boulangerie Martin",
  prenom: "Léa",
  email: "Lea@Exemple.fr",
  telephone: "06 12 34 56 78",
  ville: "Lyon",
};

const appel = (corps: unknown) =>
  POST(
    new NextRequest("https://fiduo.app/api/contact", {
      method: "POST",
      body: JSON.stringify(corps),
    })
  );

/** Corps JSON envoyé à Resend lors du dernier appel. */
const envoi = () => JSON.parse(String(vi.mocked(fetch).mock.calls.at(-1)![1]!.body));

describe("POST /api/contact", () => {
  beforeEach(() => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("RESEND_EMAIL_DOMAIN", "fiduo.app");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 200 })));
    limite.mockReset().mockResolvedValue(false);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("envoie la demande à l'équipe, le prospect en reply-to", async () => {
    const res = await appel(VALIDE);
    expect(res.status).toBe(204);
    const corps = envoi();
    expect(corps.from).toBe("Fiduo <hello@fiduo.app>");
    expect(corps.to).toEqual(["hellofiduo@gmail.com"]);
    expect(corps.reply_to).toBe("lea@exemple.fr");
    expect(corps.subject).toBe("Mise en route : Boulangerie Martin (Lyon)");
    expect(corps.text).toContain("Téléphone : 06 12 34 56 78");
    expect(corps.html).toBeUndefined();
  });

  it("accepte une demande sans téléphone ni ville", async () => {
    const res = await appel({ ...VALIDE, telephone: "", ville: undefined });
    expect(res.status).toBe(204);
    expect(envoi().subject).toBe("Mise en route : Boulangerie Martin");
    expect(envoi().text).toContain("Téléphone : non renseigné");
  });

  it.each([
    ["sans nom de commerce", { commerce: "  " }, "nom de votre commerce"],
    ["sans prénom", { prenom: "" }, "prénom"],
    ["avec un email invalide", { email: "lea@" }, "email"],
    ["avec un téléphone invalide", { telephone: "abc" }, "téléphone"],
    ["avec un nom de commerce trop long", { commerce: "x".repeat(101) }, "100 caractères"],
    ["avec une ville trop longue", { ville: "x".repeat(81) }, "80 caractères"],
    ["avec un téléphone trop long", { telephone: "0".repeat(31) }, "30 caractères"],
  ])("refuse une demande %s, sans rien envoyer", async (_, champ, message) => {
    const res = await appel({ ...VALIDE, ...champ });
    expect(res.status).toBe(400);
    expect(await res.text()).toContain(message);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("refuse un corps qui n'est pas du JSON", async () => {
    const res = await POST(
      new NextRequest("https://fiduo.app/api/contact", { method: "POST", body: "pas du json" })
    );
    expect(res.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("met chaque champ sur une ligne : pas de retour à la ligne dans le sujet", async () => {
    await appel({ ...VALIDE, commerce: "Café\r\nBcc: autre@exemple.fr" });
    expect(envoi().subject).toBe("Mise en route : Café Bcc: autre@exemple.fr (Lyon)");
  });

  it("honeypot rempli : réponse de succès, aucun email", async () => {
    const res = await appel({ ...VALIDE, website: "https://spam.example" });
    expect(res.status).toBe(204);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("limite à 5 demandes par heure et par IP, et refuse si la limite est indisponible", async () => {
    await appel(VALIDE);
    expect(limite).toHaveBeenCalledWith("contact", "1.2.3.4", {
      max: 5,
      windowSeconds: 3600,
      siErreur: "bloquer",
    });

    limite.mockResolvedValue(true);
    vi.mocked(fetch).mockClear();
    const res = await appel(VALIDE);
    expect(res.status).toBe(429);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("échec de Resend : 502, sans donnée du prospect dans les journaux", async () => {
    const journal = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(fetch).mockResolvedValue(new Response("quota dépassé", { status: 429 }));
    const res = await appel(VALIDE);
    expect(res.status).toBe(502);
    const journalise = journal.mock.calls.flat().join(" ");
    expect(journalise).toContain("Resend 429");
    expect(journalise).not.toContain("exemple.fr");
    journal.mockRestore();
  });
});
