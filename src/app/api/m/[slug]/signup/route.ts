import { NextRequest, NextResponse } from "next/server";
import { randomUUID, randomBytes } from "crypto";
import { db, getMerchantBySlug } from "@/lib/supabaseAdmin";
import { clientIp, isRateLimited } from "@/lib/rateLimit";
import { identifiantPourNouvelleCarte } from "@/lib/passCerts";
import {
  DUREE_REPONSE_MS,
  MESSAGE_NEUTRE,
  avecDureeMinimale,
  emailAcceptable,
  envoyerLienSiCarte,
} from "@/lib/lienCarte";

/**
 * Inscription publique d'un client final, scopée au commerce du slug.
 *
 * - Nouvel email : la carte est créée et ses liens renvoyés directement.
 * - Email déjà inscrit : jamais le numéro de série de la carte existante.
 *   Réponse neutre (« si une carte existe… ») et lien envoyé par email au
 *   titulaire, comme depuis l'espace client.
 */
export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const merchant = await getMerchantBySlug(params.slug);
  if (!merchant) return new NextResponse("Commerce introuvable", { status: 404 });

  const ip = clientIp(req);
  if (
    await isRateLimited(`signup:${merchant.id}`, ip, {
      max: 10,
      windowSeconds: 3600,
      siErreur: "bloquer",
    })
  ) {
    return new NextResponse("Trop de tentatives, réessayez plus tard", { status: 429 });
  }

  const corps = (await req.json().catch(() => null)) as {
    firstName?: unknown;
    email?: unknown;
    website?: unknown;
  } | null;

  // Honeypot anti-bot : champ invisible, un humain ne le remplit jamais
  if (corps?.website) return new NextResponse(null, { status: 204 });

  const prenom = typeof corps?.firstName === "string" ? corps.firstName.trim() : "";
  const email = typeof corps?.email === "string" ? corps.email.toLowerCase().trim() : "";
  if (!prenom || prenom.length > 60) {
    return new NextResponse("Indiquez votre prénom (60 caractères maximum).", { status: 400 });
  }
  if (!emailAcceptable(email)) {
    return new NextResponse("Cette adresse email semble incomplète.", { status: 400 });
  }

  const reponseNeutre = async () => {
    await avecDureeMinimale(envoyerLienSiCarte(merchant, email), DUREE_REPONSE_MS);
    return NextResponse.json({ message: MESSAGE_NEUTRE });
  };

  const { data: existant } = await db
    .from("customers")
    .select("id")
    .eq("merchant_id", merchant.id)
    .eq("email", email)
    .maybeSingle();
  if (existant) return reponseNeutre();

  const serial = randomUUID();
  const { error } = await db.from("customers").insert({
    merchant_id: merchant.id,
    serial_number: serial,
    auth_token: randomBytes(32).toString("hex"),
    first_name: prenom,
    email,
    points: 0,
    // Figé ici pour la vie de la carte : le Pass Type ID du commerce s'il en
    // a un, sinon l'identifiant partagé (null).
    pass_type_identifier: await identifiantPourNouvelleCarte(merchant.id),
  });
  // Inscription simultanée du même email : la carte existe désormais.
  if (error?.code === "23505") return reponseNeutre();
  if (error) return new NextResponse("Erreur de création", { status: 500 });

  return NextResponse.json({
    serial,
    appleUrl: `/api/pass/apple/${serial}`,
    googleUrl: `/api/pass/google/${serial}`,
  });
}
