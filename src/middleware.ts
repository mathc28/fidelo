import { NextRequest, NextResponse } from "next/server";

/**
 * Garde-fou pour /api/admin/* : vérifie le JWT Supabase et l'appartenance
 * à PLATFORM_ADMIN_EMAILS avant même d'atteindre le handler. Défense en
 * profondeur — chaque route admin fait déjà le même contrôle via
 * requirePlatformAdmin (@/lib/platformAdmin), qui reste la source de vérité.
 * Implémenté en fetch brut (pas de @supabase/supabase-js) pour rester léger
 * en edge runtime.
 */
function isPlatformAdminEmail(email: string | undefined): boolean {
  if (!email) return false;
  const admins = (process.env.PLATFORM_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(email.toLowerCase());
}

export async function middleware(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) {
    return new NextResponse("Non autorisé", { status: 401 });
  }

  const userRes = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    },
  });
  if (!userRes.ok) {
    return new NextResponse("Non autorisé", { status: 401 });
  }

  const user = await userRes.json();
  if (!isPlatformAdminEmail(user.email)) {
    return new NextResponse("Non autorisé", { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/admin/:path*",
};
