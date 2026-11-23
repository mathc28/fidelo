"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Field } from "@/components/ui";
import { emailValide } from "@/lib/uiText";
import { LIMITES } from "@/lib/validation";
import { CONTACT_SECOURS, CTA, EMAIL_CONTACT } from "@/lib/site";

type Etat = "saisie" | "envoi" | "envoye" | "echec";
type Erreurs = Partial<Record<"commerce" | "prenom" | "email", string>>;

/**
 * Formulaire « Réserver ma mise en route » (section #demarrer de la
 * landing). La demande part par email à l'équipe via /api/contact.
 */
export function ContactForm() {
  const [etat, setEtat] = useState<Etat>("saisie");
  const [erreurs, setErreurs] = useState<Erreurs>({});
  // Refus du serveur (champ invalide, trop de demandes) : il dit pourquoi.
  const [refus, setRefus] = useState("");
  const confirmation = useRef<HTMLParagraphElement>(null);

  // Le formulaire disparaît au profit du message : le focus le suit.
  useEffect(() => {
    if (etat === "envoye") confirmation.current?.focus();
  }, [etat]);

  async function envoyer(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const champs = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const manque: Erreurs = {};
    if (!champs.commerce?.trim()) manque.commerce = "Indiquez le nom de votre commerce.";
    if (!champs.prenom?.trim()) manque.prenom = "Indiquez votre prénom.";
    if (!champs.email?.trim()) manque.email = "Indiquez votre email.";
    else if (!emailValide(champs.email)) manque.email = "Cette adresse email semble incomplète.";
    setErreurs(manque);
    setRefus("");
    if (Object.keys(manque).length) return;

    setEtat("envoi");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(champs),
      });
      if (res.ok) return setEtat("envoye");
      if (res.status === 400) {
        setRefus(await res.text());
        return setEtat("saisie");
      }
      // 429 : le serveur explique ; le reste (5xx) reçoit le message générique.
      if (res.status === 429) setRefus(await res.text());
      setEtat("echec");
    } catch {
      setEtat("echec");
    }
  }

  if (etat === "envoye") {
    return (
      <div className="landing-contact" role="status">
        <p ref={confirmation} tabIndex={-1} className="landing-contact-merci">
          Merci, on vous rappelle sous 24 h.
        </p>
      </div>
    );
  }

  const envoiEnCours = etat === "envoi";
  return (
    <form
      className="landing-contact"
      onSubmit={envoyer}
      // L'erreur d'un champ s'efface dès qu'on le corrige.
      onInput={(e) => {
        const nom = (e.target as HTMLInputElement).name as keyof Erreurs;
        if (erreurs[nom]) setErreurs({ ...erreurs, [nom]: undefined });
      }}
      noValidate
    >
      <Field
        label="Nom du commerce"
        name="commerce"
        autoComplete="organization"
        maxLength={LIMITES.nomCommerce}
        required
        aria-required
        error={erreurs.commerce}
      />
      <div className="landing-contact-paire">
        <Field
          label="Prénom"
          name="prenom"
          autoComplete="given-name"
          autoCapitalize="words"
          maxLength={LIMITES.prenom}
          required
          aria-required
          error={erreurs.prenom}
        />
        <Field
          label="Email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="off"
          spellCheck={false}
          maxLength={LIMITES.email}
          required
          aria-required
          error={erreurs.email}
        />
      </div>
      <div className="landing-contact-paire">
        <Field
          label="Téléphone (facultatif)"
          name="telephone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          maxLength={LIMITES.telephone}
        />
        <Field
          label="Ville (facultatif)"
          name="ville"
          autoComplete="address-level2"
          maxLength={LIMITES.ville}
        />
      </div>
      {/* Honeypot anti-bot, comme sur l'inscription client. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        style={{ position: "absolute", left: -9999 }}
        aria-hidden="true"
      />

      {refus && etat === "saisie" && (
        <p className="landing-contact-alerte" role="alert">
          {refus}
        </p>
      )}
      {etat === "echec" && (
        <p className="landing-contact-alerte" role="alert">
          {refus
            ? `${refus} Vous pouvez aussi nous écrire directement à `
            : "L'envoi n'a pas abouti de notre côté. Réessayez dans un instant, ou écrivez-nous directement à "}
          <a href={CONTACT_SECOURS}>{EMAIL_CONTACT}</a>.
        </p>
      )}

      <button
        type="submit"
        className="landing-action landing-contact-envoyer"
        disabled={envoiEnCours}
      >
        {envoiEnCours ? "Envoi…" : CTA}
      </button>
      <p className="landing-contact-mention">
        Vos coordonnées servent uniquement à vous recontacter.{" "}
        <Link href="/confidentialite">Confidentialité</Link>
      </p>
    </form>
  );
}
