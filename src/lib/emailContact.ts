import { EMAIL_CONTACT } from "./site";
import type { Prospect } from "./validation";

/**
 * Demande de mise en route envoyée depuis la landing. Rien n'est stocké en
 * base : la demande part par email à l'adresse de contact, avec le prospect
 * en reply-to pour qu'il suffise de répondre.
 *
 * Texte brut uniquement : les champs viennent d'un formulaire public, il n'y
 * a ainsi aucun HTML à échapper.
 */
export function construireEmailContact(p: Prospect) {
  const subject = `Mise en route : ${p.commerce}${p.ville ? ` (${p.ville})` : ""}`;
  const text = [
    "Nouvelle demande de mise en route depuis fiduo.app.",
    "",
    `Commerce : ${p.commerce}`,
    `Prénom : ${p.prenom}`,
    `Email : ${p.email}`,
    `Téléphone : ${p.telephone ?? "non renseigné"}`,
    `Ville : ${p.ville ?? "non renseignée"}`,
    "",
    `Répondez à cet email pour écrire directement à ${p.prenom}.`,
  ].join("\n");
  return { subject, text };
}

/** Envoie la demande par Resend. Lève une erreur si l'envoi échoue. */
export async function envoyerDemandeContact(p: Prospect) {
  const cle = process.env.RESEND_API_KEY;
  const domaine = process.env.RESEND_EMAIL_DOMAIN;
  if (!cle || !domaine) throw new Error("RESEND_API_KEY ou RESEND_EMAIL_DOMAIN manquante");

  const { subject, text } = construireEmailContact(p);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${cle}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: `Fiduo <hello@${domaine}>`,
      to: [EMAIL_CONTACT],
      reply_to: p.email,
      subject,
      text,
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Resend ${res.status} : ${(await res.text()).slice(0, 200)}`);
}
