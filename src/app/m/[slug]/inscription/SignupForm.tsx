"use client";

import { useMemo, useState, type FormEvent } from "react";
import { emailValide } from "@/lib/uiText";

type Links = { serial: string; appleUrl: string; googleUrl: string };

export default function SignupForm({ slug }: { slug: string }) {
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [links, setLinks] = useState<Links | null>(null);
  // Email déjà inscrit : le serveur n'en dit pas plus et envoie le lien par email.
  const [messageNeutre, setMessageNeutre] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [forceOther, setForceOther] = useState(false);

  // Détection du téléphone : un seul bouton wallet, le bon. iPadOS se
  // présente comme un Mac ; on le reconnaît à son écran tactile.
  const isIOS = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    const ua = navigator.userAgent;
    return /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  }, []);
  const showApple = forceOther ? !isIOS : isIOS;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (!firstName.trim() || !email.trim()) {
      setError("Indiquez votre prénom et votre email.");
      return;
    }
    if (!emailValide(email)) {
      setError("Cette adresse email semble incomplète.");
      return;
    }
    // Honeypot anti-bot : champ invisible, un humain ne le remplit jamais.
    const website = String(new FormData(e.currentTarget).get("website") ?? "");
    setLoading(true);
    try {
      const res = await fetch(`/api/m/${slug}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName: firstName.trim(), email: email.trim(), website }),
      });
      // 4xx : le serveur dit pourquoi (limite de tentatives, champ manquant).
      if (res.status >= 400 && res.status < 500) {
        setError((await res.text()) || "Vérifiez vos informations.");
        return;
      }
      if (!res.ok) throw new Error();
      const data = (await res.json()) as Links | { message: string };
      if ("message" in data) setMessageNeutre(data.message);
      else setLinks(data);
    } catch {
      setError("La création a échoué. Vérifiez votre connexion et réessayez.");
    } finally {
      setLoading(false);
    }
  }

  if (messageNeutre) {
    return (
      <div role="status">
        <p className="m-success">Vérifiez votre boîte mail</p>
        <p className="m-lede m-muted">{messageNeutre}</p>
      </div>
    );
  }

  if (links) {
    const url = showApple ? links.appleUrl : links.googleUrl;
    return (
      <div role="status">
        <p className="m-success">Carte créée pour {firstName.trim()}.</p>
        <p className="m-lede m-muted" style={{ marginBottom: 20 }}>
          Ajoutez-la à votre téléphone, puis présentez-la en caisse.
        </p>
        <a href={url} className={`m-wallet ${showApple ? "m-wallet--apple" : "m-wallet--google"}`}>
          Ajouter à {showApple ? "Apple" : "Google"} Wallet
        </a>
        <button type="button" className="m-link m-muted" onClick={() => setForceOther((v) => !v)}>
          {showApple ? "J'ai un téléphone Android" : "J'ai un iPhone"}
        </button>
        <a href={`/m/${slug}/compte`} className="m-link m-muted">
          Voir où en est ma carte
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="m-field">
        <label className="m-label" htmlFor="signup-prenom">
          Prénom
        </label>
        <input
          id="signup-prenom"
          name="given-name"
          className="field-input field-input--on-theme"
          autoComplete="given-name"
          autoCapitalize="words"
          enterKeyHint="next"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
        />
      </div>
      <div className="m-field">
        <label className="m-label" htmlFor="signup-email">
          Email
        </label>
        <input
          id="signup-email"
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
          aria-describedby={error ? "signup-erreur" : undefined}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        style={{ position: "absolute", left: -9999 }}
        aria-hidden="true"
      />
      {error && (
        <p id="signup-erreur" className="m-error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="m-action" disabled={loading}>
        {loading ? "Création…" : "Créer ma carte"}
      </button>
    </form>
  );
}
