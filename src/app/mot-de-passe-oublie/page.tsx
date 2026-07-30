"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { Button, Field, Logo } from "@/components/ui";

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

  async function submit() {
    setError("");
    if (!/.+@.+\..+/.test(email)) {
      setError("Email invalide.");
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

  if (sent) {
    return (
      <main style={{ maxWidth: 380, margin: "0 auto", padding: "80px 20px", textAlign: "center" }}>
        <p style={{ fontSize: 40, margin: 0 }}>📬</p>
        <h1 style={{ fontSize: 22 }}>Vérifiez vos emails</h1>
        <p style={{ color: "var(--color-text-secondary)", fontSize: 14, lineHeight: 1.6 }}>
          Si un compte existe avec cet email, un lien de réinitialisation vient de vous être envoyé.
          Il est valable 24 h.
        </p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 380, margin: "0 auto", padding: "80px 20px" }}>
      <Logo height={40} />
      <h1 style={{ fontSize: 22, margin: "20px 0 4px" }}>Mot de passe oublié</h1>
      <p style={{ color: "var(--color-text-secondary)", fontSize: 14, marginBottom: 24 }}>
        Indiquez l’email de votre espace commerçant, on vous envoie un lien pour en choisir un
        nouveau.
      </p>
      <Field
        type="email"
        placeholder="Votre email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
      />
      {error && <p style={{ color: "var(--color-error)", fontSize: 14 }}>{error}</p>}
      <Button size="lg" block onClick={submit} disabled={sending}>
        {sending ? "Envoi…" : "Envoyer le lien"}
      </Button>
      <p style={{ color: "var(--color-text-secondary)", fontSize: 13, marginTop: 14 }}>
        <a href="/dashboard" style={{ color: "var(--color-marine)", fontWeight: 600 }}>
          ← Retour à la connexion
        </a>
      </p>
    </main>
  );
}
