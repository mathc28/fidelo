import { describe, expect, it } from "vitest";
import { dernierJourVisible, dureeValide, finAffichage, promoActive } from "./promo";

describe("finAffichage", () => {
  it("3 jours envoyé un mercredi : visible jusqu'au samedi, minuit heure d'été", () => {
    // Mercredi 7 octobre 2026, 10 h à Paris (UTC+2).
    const envoi = Date.parse("2026-10-07T08:00:00Z");
    const fin = finAffichage(3, envoi);
    // Dimanche 11 octobre, 0 h à Paris = samedi 10, 22 h UTC.
    expect(fin.toISOString()).toBe("2026-10-10T22:00:00.000Z");
    expect(dernierJourVisible(fin)).toBe("samedi 10 octobre");
  });

  it("tient compte de l'heure d'hiver", () => {
    // Lundi 2 novembre 2026, 15 h à Paris (UTC+1).
    const fin = finAffichage(1, Date.parse("2026-11-02T14:00:00Z"));
    expect(fin.toISOString()).toBe("2026-11-03T23:00:00.000Z");
    expect(dernierJourVisible(fin)).toBe("mardi 3 novembre");
  });

  it("lit le jour d'envoi à Paris, pas en UTC", () => {
    // Mardi 6 octobre 23 h 30 UTC = mercredi 7 octobre 1 h 30 à Paris.
    const fin = finAffichage(1, Date.parse("2026-10-06T23:30:00Z"));
    expect(dernierJourVisible(fin)).toBe("jeudi 8 octobre");
  });

  it("passe d'un mois à l'autre", () => {
    const fin = finAffichage(7, Date.parse("2026-10-28T10:00:00Z"));
    expect(dernierJourVisible(fin)).toBe("mercredi 4 novembre");
  });
});

describe("dureeValide", () => {
  it("n'accepte que 1, 3 et 7", () => {
    expect([1, 3, 7].every(dureeValide)).toBe(true);
    expect([0, 2, 5, "3", null, undefined].some(dureeValide)).toBe(false);
  });
});

describe("promoActive", () => {
  it("est vraie jusqu'à l'instant d'expiration exclu", () => {
    const now = Date.parse("2026-10-08T10:00:00Z");
    expect(promoActive("2026-10-08T10:00:01Z", now)).toBe(true);
    expect(promoActive("2026-10-08T10:00:00Z", now)).toBe(false);
    expect(promoActive(null, now)).toBe(false);
  });
});
