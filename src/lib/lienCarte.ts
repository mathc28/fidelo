import { config } from "./config";
import { db, type Merchant } from "./supabaseAdmin";
import { isRateLimited } from "./rateLimit";
import { envoyerEmailCarte } from "./emailCarte";
import { unite } from "./uiText";

/*
 * Redemande d'une carte existante (espace client, réinscription avec un
 * email déjà connu). La réponse HTTP est toujours la même, que l'email ait
 * une carte ou non : même message, même code, durée comparable. Le lien de
 * la carte part uniquement par email, au titulaire de l'adresse.
 */

export const MESSAGE_NEUTRE =
  "Si une carte existe pour cet email, nous venons de vous envoyer le lien.";

/** Durée minimale de réponse : l'envoi d'email ne doit pas se lire au chronomètre. */
export const DUREE_REPONSE_MS = 1500;

/** Exécute `travail`, et ne rend la main qu'après au moins `ms` millisecondes. */
export async function avecDureeMinimale<T>(travail: Promise<T>, ms: number): Promise<T> {
  const [resultat] = await Promise.all([travail, new Promise((r) => setTimeout(r, ms))]);
  return resultat;
}

/** Envois du lien tolérés par adresse et par commerce, sur une heure. */
const ENVOIS_PAR_EMAIL = { max: 3, windowSeconds: 3600, siErreur: "bloquer" } as const;

/**
 * Si l'email a une carte chez ce commerce, lui envoie le lien (dans la
 * limite de 3 envois par heure). Ne lève jamais d'erreur : tout est loggé,
 * rien ne transparaît dans la réponse.
 */
export async function envoyerLienSiCarte(merchant: Merchant, email: string): Promise<void> {
  try {
    const { data: client } = await db
      .from("customers")
      .select("serial_number, first_name, points")
      .eq("merchant_id", merchant.id)
      .eq("email", email)
      .maybeSingle();
    if (!client) return;

    if (await isRateLimited(`email-carte:${merchant.id}`, email, ENVOIS_PAR_EMAIL)) {
      console.log(`[Lien carte] limite d'envois atteinte — commerce ${merchant.slug}`);
      return;
    }

    await envoyerEmailCarte(email, {
      prenom: client.first_name,
      commerce: merchant.name,
      solde: unite(client.points, merchant.program_type === "visits"),
      lienApple: `${config.baseUrl}/api/pass/apple/${client.serial_number}`,
      lienGoogle: `${config.baseUrl}/api/pass/google/${client.serial_number}`,
    });
    console.log(`[Lien carte] envoyé — commerce ${merchant.slug}`);
  } catch (e) {
    console.error(
      `[Lien carte] envoi impossible — commerce ${merchant.slug} :`,
      (e as Error).message
    );
  }
}

/** Email plausible et de longueur raisonnable (RFC 5321 : 254 caractères). */
export function emailAcceptable(email: unknown): email is string {
  return (
    typeof email === "string" && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  );
}
