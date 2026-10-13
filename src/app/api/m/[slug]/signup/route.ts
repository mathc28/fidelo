import { NextRequest, NextResponse } from "next/server";
import { randomUUID, randomBytes } from "crypto";
import { db, getMerchantBySlug } from "@/lib/supabaseAdmin";
import { clientIp, isRateLimited } from "@/lib/rateLimit";
import { identifiantPourNouvelleCarte } from "@/lib/passCerts";

/** Inscription publique d'un client final, scopée au commerce du slug. */
export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const merchant = await getMerchantBySlug(params.slug);
  if (!merchant) return new NextResponse("Commerce introuvable", { status: 404 });

  const ip = clientIp(req);
  if (await isRateLimited(`signup:${merchant.id}`, ip, { max: 10, windowSeconds: 3600 })) {
    return new NextResponse("Trop de tentatives, réessayez plus tard", { status: 429 });
  }

  const { firstName, email, website } = await req.json();

  // Honeypot anti-bot : champ invisible, un humain ne le remplit jamais
  if (website) return new NextResponse(null, { status: 204 });

  if (!firstName || !email) {
    return new NextResponse("Prénom et email requis", { status: 400 });
  }

  const normalizedEmail = String(email).toLowerCase().trim();

  const { data: existing } = await db
    .from("customers")
    .select("serial_number")
    .eq("merchant_id", merchant.id)
    .eq("email", normalizedEmail)
    .single();

  const serial = existing?.serial_number ?? randomUUID();

  if (!existing) {
    const { error } = await db.from("customers").insert({
      merchant_id: merchant.id,
      serial_number: serial,
      auth_token: randomBytes(32).toString("hex"),
      first_name: String(firstName).trim(),
      email: normalizedEmail,
      points: 0,
      // Figé ici pour la vie de la carte : le Pass Type ID du commerce s'il en
      // a un, sinon l'identifiant partagé (null).
      pass_type_identifier: await identifiantPourNouvelleCarte(merchant.id),
    });
    if (error) return new NextResponse("Erreur de création", { status: 500 });
  }

  return NextResponse.json({
    serial,
    appleUrl: `/api/pass/apple/${serial}`,
    googleUrl: `/api/pass/google/${serial}`,
  });
}
