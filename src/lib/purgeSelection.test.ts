import { describe, expect, it } from "vitest";
import {
  cartesAPurger,
  commercesAPurger,
  limiteInactivite,
  limiteResiliation,
} from "./purgeSelection";

const MAINTENANT = new Date("2026-10-16T02:00:00Z");

describe("limites", () => {
  it("3 ans pour les cartes, 3 mois pour les commerces résiliés", () => {
    expect(limiteInactivite(MAINTENANT).toISOString()).toBe("2023-10-16T02:00:00.000Z");
    expect(limiteResiliation(MAINTENANT).toISOString()).toBe("2026-07-16T02:00:00.000Z");
  });
});

describe("cartes à purger", () => {
  const limite = limiteInactivite(MAINTENANT);

  it("purge une carte créée il y a plus de 3 ans et jamais utilisée depuis", () => {
    const vieille = { id: "vieille", created_at: "2022-01-10T10:00:00Z" };
    expect(cartesAPurger([vieille], new Set(), limite)).toEqual(["vieille"]);
  });

  it("ne purge jamais une carte utilisée récemment, même très ancienne", () => {
    const ancienneActive = { id: "active", created_at: "2020-05-01T10:00:00Z" };
    expect(cartesAPurger([ancienneActive], new Set(["active"]), limite)).toEqual([]);
  });

  it("ne purge pas une carte récente, même jamais utilisée", () => {
    const recente = { id: "recente", created_at: "2026-09-01T10:00:00Z" };
    expect(cartesAPurger([recente], new Set(), limite)).toEqual([]);
  });

  it("ne purge pas une carte créée juste après la limite", () => {
    const juste = { id: "juste", created_at: "2023-10-16T02:00:01Z" };
    expect(cartesAPurger([juste], new Set(), limite)).toEqual([]);
  });

  it("trie un lot mélangé", () => {
    const candidates = [
      { id: "a", created_at: "2021-01-01T00:00:00Z" }, // inactive → purgée
      { id: "b", created_at: "2021-01-01T00:00:00Z" }, // utilisée récemment → gardée
      { id: "c", created_at: "2025-01-01T00:00:00Z" }, // récente → gardée
    ];
    expect(cartesAPurger(candidates, new Set(["b"]), limite)).toEqual(["a"]);
  });
});

describe("commerces à purger", () => {
  const limite = limiteResiliation(MAINTENANT);

  it("seuls les commerces résiliés depuis plus de 3 mois", () => {
    const commerces = [
      { id: "jamais-resilie", resiliated_at: null },
      { id: "resilie-hier", resiliated_at: "2026-10-15T10:00:00Z" },
      { id: "resilie-il-y-a-4-mois", resiliated_at: "2026-06-01T10:00:00Z" },
    ];
    expect(commercesAPurger(commerces, limite)).toEqual(["resilie-il-y-a-4-mois"]);
  });

  it("aucun commerce sans date de résiliation, comme aujourd'hui", () => {
    expect(commercesAPurger([{ id: "x", resiliated_at: null }], limite)).toEqual([]);
  });
});
