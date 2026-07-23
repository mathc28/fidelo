import { afterEach, describe, expect, it } from "vitest";
import { isPlatformAdminEmail } from "./platformAdmin";

describe("isPlatformAdminEmail", () => {
  const originalEnv = process.env.PLATFORM_ADMIN_EMAILS;

  afterEach(() => {
    process.env.PLATFORM_ADMIN_EMAILS = originalEnv;
  });

  it("returns false when the list is empty", () => {
    process.env.PLATFORM_ADMIN_EMAILS = "";
    expect(isPlatformAdminEmail("owner@fidelo.app")).toBe(false);
  });

  it("returns false for an undefined email", () => {
    process.env.PLATFORM_ADMIN_EMAILS = "owner@fidelo.app";
    expect(isPlatformAdminEmail(undefined)).toBe(false);
  });

  it("matches case-insensitively", () => {
    process.env.PLATFORM_ADMIN_EMAILS = "Owner@Fidelo.app, other@fidelo.app";
    expect(isPlatformAdminEmail("owner@fidelo.app")).toBe(true);
    expect(isPlatformAdminEmail("OTHER@FIDELO.APP")).toBe(true);
  });

  it("rejects emails not in the list", () => {
    process.env.PLATFORM_ADMIN_EMAILS = "owner@fidelo.app";
    expect(isPlatformAdminEmail("intrus@fidelo.app")).toBe(false);
  });
});
