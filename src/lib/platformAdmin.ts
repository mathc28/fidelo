import { NextRequest } from "next/server";
import { db } from "./supabaseAdmin";

/**
 * Back-office PLATEFORME (toi), distinct du dashboard commerçant.
 * Les admins plateforme sont listés dans PLATFORM_ADMIN_EMAILS
 * (emails séparés par des virgules). Ils se connectent avec un compte
 * Supabase Auth normal ; c'est l'appartenance à cette liste qui ouvre /admin.
 */
export function isPlatformAdminEmail(email: string | undefined): boolean {
  if (!email) return false;
  const admins = (process.env.PLATFORM_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(email.toLowerCase());
}

/** Vérifie le JWT et l'appartenance à la liste des admins plateforme. */
export async function requirePlatformAdmin(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return null;
  return isPlatformAdminEmail(data.user.email) ? data.user : null;
}
