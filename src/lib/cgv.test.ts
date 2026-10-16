import { describe, expect, it } from "vitest";
import { doitAccepterCgv } from "./cgv";

describe("acceptation des CGV à la connexion", () => {
  it("bloque un commerçant qui n'a jamais accepté", () => {
    expect(doitAccepterCgv(null, false, "1.0")).toBe(true);
  });

  it("bloque un commerçant qui a accepté une ancienne version", () => {
    expect(doitAccepterCgv("1.0", false, "1.1")).toBe(true);
  });

  it("laisse passer un commerçant à jour", () => {
    expect(doitAccepterCgv("1.1", false, "1.1")).toBe(false);
  });

  it("ne concerne jamais un admin plateforme", () => {
    expect(doitAccepterCgv(null, true, "1.1")).toBe(false);
  });
});
