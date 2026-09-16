import { describe, expect, it } from "vitest";
import { separerRecompense, texteCompteur, texteRecompense } from "./rewardText";

const cafe = { label: "Un café offert", cost_points: 10 };

describe("separerRecompense", () => {
  it("garde la récompense comme objectif tant que le seuil n'est pas atteint", () => {
    expect(separerRecompense(cafe, 8)).toEqual({ reachedReward: undefined, nextReward: cafe });
  });

  it("la bascule en atteinte au seuil exact, pas seulement au-delà", () => {
    expect(separerRecompense(cafe, 10)).toEqual({ reachedReward: cafe, nextReward: undefined });
    expect(separerRecompense(cafe, 12)).toEqual({ reachedReward: cafe, nextReward: undefined });
  });

  it("ne renvoie ni l'une ni l'autre sans récompense configurée", () => {
    expect(separerRecompense(null, 5)).toEqual({
      reachedReward: undefined,
      nextReward: undefined,
    });
  });
});

describe("texteCompteur", () => {
  it("écrit « sur » au passage — la barre oblique se collait au libellé", () => {
    expect(texteCompteur(0, 10, true)).toBe("0 sur 10");
    expect(texteCompteur(0, 10, true)).not.toContain("/");
  });

  it("garde la barre oblique aux points, où les seuils sont à trois chiffres", () => {
    expect(texteCompteur(124, 250, false)).toBe("124 / 250");
  });
});

describe("texteRecompense", () => {
  const pour = (points: number) => {
    const { reachedReward, nextReward } = separerRecompense(cafe, points);
    return texteRecompense(reachedReward, nextReward, points);
  };

  it("accorde le pluriel sans jamais écrire « (s) »", () => {
    expect(pour(8)).toBe("Plus que 2 avant : Un café offert");
    expect(pour(8)).not.toContain("(s)");
  });

  it("élide « que 1 » en « qu'un »", () => {
    expect(pour(9)).toBe("Plus qu'un avant : Un café offert");
  });

  it("annonce la récompense au seuil atteint", () => {
    expect(pour(10)).toBe("🎁 Un café offert");
  });

  it("reste neutre sans récompense configurée", () => {
    expect(texteRecompense(undefined, undefined, 5)).toBe("Programme en cours");
  });

  it("n'énonce pas l'unité — elle est déjà portée par le libellé du compteur", () => {
    expect(pour(8)).not.toMatch(/passage|point/i);
  });
});
