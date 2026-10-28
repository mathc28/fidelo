import { NextRequest, NextResponse } from "next/server";
import { getMerchantBySlug } from "@/lib/supabaseAdmin";
import { clientIp, isRateLimited } from "@/lib/rateLimit";
import {
  DUREE_REPONSE_MS,
  MESSAGE_NEUTRE,
  avecDureeMinimale,
  emailAcceptable,
  envoyerLienSiCarte,
} from "@/lib/lienCarte";

/**
 * Espace client public : « retrouver ma carte » par email.
 *
 * Ne renvoie jamais le numéro de série ni aucune donnée de carte. La réponse
 * est identique qu'une carte existe ou non (même message, même code, durée
 * comparable) ; si elle existe, son lien part par email au titulaire.
 */
export async function POST(req: NextRequest, props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const merchant = await getMerchantBySlug(params.slug);
  if (!merchant) return new NextResponse("Commerce introuvable", { status: 404 });

  const ip = clientIp(req);
  if (
    await isRateLimited(`lookup:${merchant.id}`, ip, {
      max: 10,
      windowSeconds: 3600,
      siErreur: "bloquer",
    })
  ) {
    return new NextResponse("Trop de tentatives, réessayez plus tard", { status: 429 });
  }

  const corps = (await req.json().catch(() => null)) as { email?: unknown } | null;
  const email = typeof corps?.email === "string" ? corps.email.toLowerCase().trim() : "";
  if (!emailAcceptable(email)) {
    return new NextResponse("Cette adresse email semble incomplète.", { status: 400 });
  }

  await avecDureeMinimale(envoyerLienSiCarte(merchant, email), DUREE_REPONSE_MS);
  return NextResponse.json({ message: MESSAGE_NEUTRE });
}
