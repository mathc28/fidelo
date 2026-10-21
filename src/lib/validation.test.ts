import { describe, expect, it } from "vitest";
import {
  LIMITES,
  validerEmail,
  validerLibelleCaisse,
  validerMontant,
  validerPrenom,
  validerPromo,
} from "./validation";

describe("email", () => {
  it("normalise et accepte un email plausible", () => {
    expect(validerEmail("  Lea@Example.COM ")).toEqual({ ok: true, valeur: "lea@example.com" });
  });
  it("refuse un format invalide, un type inattendu ou plus de 254 caractères", () => {
    for (const e of ["", "lea", "lea@", "lea@example", "a b@c.fr", 42, null]) {
      expect(validerEmail(e).ok).toBe(false);
    }
    const long = `${"a".repeat(250)}@x.fr`;
    expect(long.length).toBeGreaterThan(LIMITES.email);
    expect(validerEmail(long).ok).toBe(false);
  });
});

describe("prénom", () => {
  it("de 1 à 50 caractères", () => {
    expect(validerPrenom(" Léa ")).toEqual({ ok: true, valeur: "Léa" });
    expect(validerPrenom("a".repeat(50)).ok).toBe(true);
    expect(validerPrenom("a".repeat(51)).ok).toBe(false);
    expect(validerPrenom("   ").ok).toBe(false);
    expect(validerPrenom(undefined).ok).toBe(false);
  });
});

describe("promo", () => {
  it("message de 1 à 140 caractères, comme le formulaire", () => {
    expect(validerPromo(null, "Croissants offerts samedi")).toEqual({
      ok: true,
      valeur: { titre: null, message: "Croissants offerts samedi" },
    });
    expect(validerPromo(null, "a".repeat(140)).ok).toBe(true);
    expect(validerPromo(null, "a".repeat(141)).ok).toBe(false);
    expect(validerPromo(null, "  ").ok).toBe(false);
    expect(validerPromo(null, { texte: "x" }).ok).toBe(false);
  });
  it("titre facultatif, 60 caractères au plus", () => {
    expect(validerPromo("Samedi", "Message").ok).toBe(true);
    expect(validerPromo("a".repeat(61), "Message").ok).toBe(false);
    expect(validerPromo(12, "Message").ok).toBe(false);
  });
});

describe("montant en caisse", () => {
  it("nombre positif jusqu'à 10 000 €", () => {
    expect(validerMontant(12.5)).toEqual({ ok: true, valeur: 12.5 });
    expect(validerMontant("10000").ok).toBe(true);
    for (const m of [0, -5, "abc", Infinity, 10000.01, 1e9])
      expect(validerMontant(m).ok).toBe(false);
  });
});

describe("libellé de caisse", () => {
  it("50 caractères au plus, « Caisse » par défaut", () => {
    expect(validerLibelleCaisse(undefined)).toEqual({ ok: true, valeur: "Caisse" });
    expect(validerLibelleCaisse("  Comptoir  ")).toEqual({ ok: true, valeur: "Comptoir" });
    expect(validerLibelleCaisse("a".repeat(51)).ok).toBe(false);
    expect(validerLibelleCaisse(["x"]).ok).toBe(false);
  });
});
