"use client";

import { useState, type FormEvent } from "react";
import { emailValide } from "@/lib/uiText";

/**
 * « Retrouver ma carte » : le client donne son email, le serveur lui envoie
 * le lien de sa carte et son solde par email. La page n'affiche jamais rien
 * d'autre que le message neutre du serveur, que l'email ait une carte ou
 * non : connaître l'email de quelqu'un ne suffit pas à voir sa carte.
 */
export default function AccountLookup({ slug }: { slug: string }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function lookup(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!emailValide(email)) {
      setError("Cette adresse email semble incomplète.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/m/${slug}/lookup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (res.status >= 400 && res.status < 500) {
        setError((await res.text()) || "Vérifiez votre adresse email.");
        return;
      }
      if (!res.ok) throw new Error();
      setMessage(((await res.json()) as { message: string }).message);
    } catch {
      setError("Connexion impossible. Vérifiez votre réseau et réessayez.");
    } finally {
      setLoading(false);
    }
  }

  if (message) {
    return (
      <div role="status">
        <p className="m-success">Vérifiez votre boîte mail</p>
        <p className="m-lede m-muted">{message}</p>
        <button
          type="button"
          className="m-link m-muted"
          onClick={() => {
            setMessage("");
            setEmail("");
          }}
        >
          Essayer une autre adresse
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={lookup} noValidate>
      <div className="m-field">
        <label className="m-label" htmlFor="compte-email">
          Votre email
        </label>
        <input
          id="compte-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="go"
          className={`field-input field-input--on-theme${error ? " has-error" : ""}`}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "compte-erreur" : undefined}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      {error && (
        <p id="compte-erreur" className="m-error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="m-action" disabled={loading}>
        {loading ? "Envoi…" : "Recevoir ma carte par email"}
      </button>
      <a href={`/m/${slug}/inscription`} className="m-link m-muted" style={{ marginTop: 8 }}>
        Pas encore de carte ? Créez-la en 30 secondes
      </a>
    </form>
  );
}
