import { describe, expect, it } from "vitest";
import { authErrorFr, emailValide, pluriel, unite } from "./uiText";
import { MAX_PROMOS, PROMO_WINDOW_MS, prochainEnvoiPossible } from "./promo";

describe("pluriel", () => {
  it("accorde à partir de 2, le zéro reste singulier", () => {
    expect(pluriel(0, "client")).toBe("0 client");
    expect(pluriel(1, "client")).toBe("1 client");
    expect(pluriel(2, "client")).toBe("2 clients");
  });

  it("accepte une forme plurielle irrégulière", () => {
    expect(pluriel(3, "cadeau", "cadeaux")).toBe("3 cadeaux");
  });

  it("choisit l'unité du programme", () => {
    expect(unite(1, true)).toBe("1 passage");
    expect(unite(5, false)).toBe("5 points");
  });
});

describe("authErrorFr", () => {
  it("ne laisse jamais passer le message anglais de Supabase", () => {
    expect(authErrorFr({ message: "Invalid login credentials" })).toBe(
      "Email ou mot de passe incorrect."
    );
    expect(
      authErrorFr({ message: "New password should be different from the old password." })
    ).toBe("Choisissez un mot de passe différent de l'actuel.");
    expect(authErrorFr({ message: "Something unexpected" })).toMatch(/Réessayez/);
  });

  it("reconnaît la limite de débit par le code HTTP", () => {
    expect(authErrorFr({ status: 429 })).toMatch(/Trop de tentatives/);
  });
});

describe("emailValide", () => {
  it("attrape les fautes de frappe courantes", () => {
    expect(emailValide("claire@boulangerie.fr")).toBe(true);
    expect(emailValide(" claire@boulangerie.fr ")).toBe(true);
    expect(emailValide("claire@boulangerie")).toBe(false);
    expect(emailValide("claire boulangerie.fr")).toBe(false);
  });
});

describe("prochainEnvoiPossible", () => {
  const now = Date.parse("2026-09-18T12:00:00Z");
  const ilYa = (jours: number) => new Date(now - jours * 24 * 3600 * 1000).toISOString();

  it("renvoie null tant que le quota n'est pas atteint", () => {
    expect(prochainEnvoiPossible([ilYa(1), ilYa(2)], now)).toBeNull();
  });

  it("libère le quota 7 jours après la plus ancienne promo de la fenêtre glissante", () => {
    const envois = [ilYa(1), ilYa(3), ilYa(5)];
    expect(envois).toHaveLength(MAX_PROMOS);
    expect(prochainEnvoiPossible(envois, now)?.getTime()).toBe(
      Date.parse(ilYa(5)) + PROMO_WINDOW_MS
    );
  });

  it("ignore les promos sorties de la fenêtre", () => {
    expect(prochainEnvoiPossible([ilYa(1), ilYa(3), ilYa(8)], now)).toBeNull();
  });
});
