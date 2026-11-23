import { NextRequest, NextResponse } from "next/server";
import { clientIp, isRateLimited } from "@/lib/rateLimit";
import { validerProspect } from "@/lib/validation";
import { envoyerDemandeContact } from "@/lib/emailContact";

/**
 * Formulaire « Réserver ma mise en route » de la landing : la demande part
 * par email à l'équipe, rien n'est stocké en base.
 */
export async function POST(req: NextRequest) {
  // 5 demandes par IP et par heure. Si la limite est indisponible, on refuse :
  // le formulaire propose alors l'email en secours, sans ouvrir la porte au spam.
  if (
    await isRateLimited("contact", clientIp(req), {
      max: 5,
      windowSeconds: 3600,
      siErreur: "bloquer",
    })
  ) {
    return new NextResponse(
      "Plusieurs demandes sont déjà parties de cette connexion. Réessayez dans une heure.",
      { status: 429 }
    );
  }

  const corps = (await req.json().catch(() => null)) as Record<string, unknown> | null;

  // Honeypot anti-bot : champ invisible, un humain ne le remplit jamais. Le
  // robot reçoit la même réponse qu'un envoi réussi.
  if (corps?.website) return new NextResponse(null, { status: 204 });

  const prospect = validerProspect(corps ?? {});
  if (!prospect.ok) return new NextResponse(prospect.erreur, { status: 400 });

  try {
    await envoyerDemandeContact(prospect.valeur);
  } catch (e) {
    // Pas de donnée du prospect dans les journaux : seulement la cause.
    console.error("[Contact] envoi échoué :", (e as Error).message);
    return new NextResponse("La demande n'a pas pu être envoyée.", { status: 502 });
  }

  return new NextResponse(null, { status: 204 });
}
