import { afterEach, describe, expect, it, vi } from "vitest";
import { isPlatformAdminEmail, requirePlatformAdmin } from "./platformAdmin";

describe("isPlatformAdminEmail", () => {
  const originalEnv = process.env.PLATFORM_ADMIN_EMAILS;

  afterEach(() => {
    process.env.PLATFORM_ADMIN_EMAILS = originalEnv;
  });

  it("returns false when the list is empty", () => {
    process.env.PLATFORM_ADMIN_EMAILS = "";
    expect(isPlatformAdminEmail("owner@fiduo.app")).toBe(false);
  });

  it("returns false for an undefined email", () => {
    process.env.PLATFORM_ADMIN_EMAILS = "owner@fiduo.app";
    expect(isPlatformAdminEmail(undefined)).toBe(false);
  });

  it("matches case-insensitively", () => {
    process.env.PLATFORM_ADMIN_EMAILS = "Owner@Fiduo.app, other@fiduo.app";
    expect(isPlatformAdminEmail("owner@fiduo.app")).toBe(true);
    expect(isPlatformAdminEmail("OTHER@FIDUO.APP")).toBe(true);
  });

  it("rejects emails not in the list", () => {
    process.env.PLATFORM_ADMIN_EMAILS = "owner@fiduo.app";
    expect(isPlatformAdminEmail("intrus@fiduo.app")).toBe(false);
  });
});

describe("requirePlatformAdmin", () => {
  const originalEnv = process.env.PLATFORM_ADMIN_EMAILS;
  afterEach(() => {
    process.env.PLATFORM_ADMIN_EMAILS = originalEnv;
    vi.restoreAllMocks();
  });

  async function avecUtilisateur(user: Record<string, unknown>) {
    process.env.PLATFORM_ADMIN_EMAILS = "owner@fiduo.app";
    const { db } = await import("./supabaseAdmin");
    vi.spyOn(db.auth, "getUser").mockResolvedValue({ data: { user }, error: null } as never);
    const { NextRequest } = await import("next/server");
    return requirePlatformAdmin(
      new NextRequest("https://fiduo.app/api/admin/merchants", {
        headers: { authorization: "Bearer jeton" },
      })
    );
  }

  it("accepte un admin dont l'email est confirmé", async () => {
    const user = await avecUtilisateur({
      email: "owner@fiduo.app",
      email_confirmed_at: "2026-10-01T10:00:00Z",
    });
    expect(user).not.toBeNull();
  });

  it("refuse un compte à l'email d'un admin mais non confirmé", async () => {
    const user = await avecUtilisateur({ email: "owner@fiduo.app", email_confirmed_at: null });
    expect(user).toBeNull();
  });
});
