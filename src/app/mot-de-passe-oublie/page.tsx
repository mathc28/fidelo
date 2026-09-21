"use client";

import { useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { Button, Field, Logo } from "@/components/ui";
import { emailValide } from "@/lib/uiText";

/**
 * Demande de réinitialisation de mot de passe commerçant : envoie un lien
 * Supabase vers /definir-mot-de-passe, qui gère déjà la pose du nouveau
 * mot de passe (même mécanique que le lien d'invitation initial).
 */
export default function MotDePasseOubliePage() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!emailValide(email)) {
      setError("Cette adresse email semble incomplète.");
      return;
    }
    setSending(true);
    await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/definir-mot-de-passe`,
    });
    setSending(false);
    // Message générique dans tous les cas : on ne révèle jamais si l'email existe.
    setSent(true);
  }

  return (
    <main className="auth-shell">
      <Logo height={36} />
      {sent ? (
        <div role="status">
          <h1 className="auth-title">Vérifiez vos emails</h1>
          <p className="auth-lede">
            Si un espace commerçant existe pour <strong>{email.trim()}</strong>, un lien pour
            choisir un nouveau mot de passe vient d&apos;y être envoyé. Il est valable 24 h.
          </p>
          <a className="auth-link" href="/dashboard">
            Retour à la connexion
          </a>
        </div>
      ) : (
        <>
          <h1 className="auth-title">Mot de passe oublié</h1>
          <p className="auth-lede">
            Indiquez l’email de votre espace commerçant, on vous envoie un lien pour en choisir un
            nouveau.
          </p>
          <form onSubmit={submit} noValidate>
            <Field
              type="email"
              label="Email"
              autoComplete="email"
              inputMode="email"
              autoFocus
              value={email}
              error={error || undefined}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button type="submit" block disabled={sending}>
              {sending ? "Envoi…" : "Envoyer le lien"}
            </Button>
          </form>
          <a className="auth-link" href="/dashboard">
            Retour à la connexion
          </a>
        </>
      )}
    </main>
  );
}
