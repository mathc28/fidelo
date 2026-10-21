import { describe, expect, it } from "vitest";
import { cronAutorise } from "./cronAuth";

describe("cronAutorise", () => {
  it("accepte exactement « Bearer <secret> »", () => {
    expect(cronAutorise("Bearer s3cret", "s3cret")).toBe(true);
  });
  it("refuse un mauvais secret, un en-tête absent ou un secret non configuré", () => {
    expect(cronAutorise("Bearer autre", "s3cret")).toBe(false);
    expect(cronAutorise("s3cret", "s3cret")).toBe(false);
    expect(cronAutorise(null, "s3cret")).toBe(false);
    expect(cronAutorise("Bearer ", "")).toBe(false);
    expect(cronAutorise("Bearer undefined", undefined)).toBe(false);
  });
});
