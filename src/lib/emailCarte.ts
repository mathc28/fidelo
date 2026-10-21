import { EMAIL_CONTACT } from "./site";

/*
 * Email « Votre carte de fidélité » : envoyé quand un client redemande sa
 * carte (espace client, ou réinscription avec un email déjà connu). C'est le
 * seul canal qui donne le lien d'une carte existante : jamais la réponse
 * HTTP, pour qu'un email connu d'un tiers ne suffise pas à récupérer la
 * carte de quelqu'un.
 *
 * Envoi par l'API Resend, serveur uniquement. Variables (intégration Resend
 * de Vercel) : RESEND_API_KEY, RESEND_EMAIL_DOMAIN.
 */

const LOGO = "https://fiduo.app/brand/logo-full.png";
const MARINE = "#1A2E60";
const CORAIL = "#F56C5A";

function echapper(texte: string): string {
  return texte
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type ContenuEmailCarte = {
  prenom: string;
  commerce: string;
  /** « 7 passages », « 124 points »… */
  solde: string;
  lienApple: string;
  lienGoogle: string;
};

function bouton(lien: string, libelle: string, plein: boolean): string {
  const style = plein
    ? `background:${CORAIL};color:${MARINE};border:2px solid ${CORAIL};`
    : `background:#ffffff;color:${MARINE};border:2px solid ${MARINE};`;
  return `<a href="${echapper(lien)}" style="${style}display:inline-block;padding:12px 22px;border-radius:14px;font-weight:700;font-size:15px;text-decoration:none;margin:6px 4px;">${libelle}</a>`;
}

/** Sujet, HTML et texte brut de l'email. Fonction pure. */
export function construireEmailCarte(c: ContenuEmailCarte) {
  const commerce = echapper(c.commerce);
  const prenom = echapper(c.prenom);
  const subject = `Votre carte de fidélité ${c.commerce}`;

  const html = `<!doctype html>
<html lang="fr"><body style="margin:0;padding:0;background:#F7F4EC;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F4EC;padding:32px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:14px;padding:32px 28px;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:${MARINE};">
<tr><td align="center" style="padding-bottom:24px;"><img src="${LOGO}" alt="Fiduo" height="36" style="height:36px;width:auto;"></td></tr>
<tr><td style="font-size:20px;font-weight:700;padding-bottom:12px;">Bonjour ${prenom},</td></tr>
<tr><td style="font-size:15px;line-height:1.6;padding-bottom:8px;">Voici votre carte de fidélité <strong>${commerce}</strong>. Vous avez <strong>${echapper(c.solde)}</strong>.</td></tr>
<tr><td style="font-size:15px;line-height:1.6;padding-bottom:20px;">Ajoutez-la à votre téléphone pour la présenter en caisse :</td></tr>
<tr><td align="center" style="padding-bottom:24px;">${bouton(c.lienApple, "Ajouter à Apple Wallet", true)}${bouton(c.lienGoogle, "Ajouter à Google Wallet", false)}</td></tr>
<tr><td style="font-size:13px;line-height:1.6;color:#4A5470;border-top:1px solid #EBE5D6;padding-top:16px;">Vous recevez cet email parce que votre carte ${commerce} a été demandée avec cette adresse. Si ce n'est pas vous, ignorez simplement ce message : rien ne change.<br>Une question ? <a href="mailto:${EMAIL_CONTACT}" style="color:${MARINE};">${EMAIL_CONTACT}</a></td></tr>
</table>
</td></tr>
</table>
</body></html>`;

  const text = [
    `Bonjour ${c.prenom},`,
    "",
    `Voici votre carte de fidélité ${c.commerce}. Vous avez ${c.solde}.`,
    "",
    `Ajouter à Apple Wallet : ${c.lienApple}`,
    `Ajouter à Google Wallet : ${c.lienGoogle}`,
    "",
    `Vous recevez cet email parce que votre carte ${c.commerce} a été demandée avec cette adresse. Si ce n'est pas vous, ignorez ce message.`,
    `Une question ? ${EMAIL_CONTACT}`,
  ].join("\n");

  return { subject, html, text };
}

/** Envoie l'email par Resend. Lève une erreur si l'envoi échoue. */
export async function envoyerEmailCarte(destinataire: string, contenu: ContenuEmailCarte) {
  const cle = process.env.RESEND_API_KEY;
  const domaine = process.env.RESEND_EMAIL_DOMAIN;
  if (!cle || !domaine) throw new Error("RESEND_API_KEY ou RESEND_EMAIL_DOMAIN manquante");

  const { subject, html, text } = construireEmailCarte(contenu);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${cle}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: `Fiduo <hello@${domaine}>`,
      to: [destinataire],
      subject,
      html,
      text,
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Resend ${res.status} : ${(await res.text()).slice(0, 200)}`);
}
