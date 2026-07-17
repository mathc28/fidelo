"use client";

import { useMemo, useState } from "react";

type Links = { serial: string; appleUrl: string; googleUrl: string };

export default function SignupForm({ slug, labelColor }: { slug: string; labelColor: string }) {
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [links, setLinks] = useState<Links | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [forceOther, setForceOther] = useState(false);

  // Détection du téléphone : un seul bouton wallet, le bon
  const isIOS = useMemo(
    () => typeof navigator !== "undefined" && /iPhone|iPad|iPod/i.test(navigator.userAgent),
    []
  );
  const showApple = forceOther ? !isIOS : isIOS;

  async function handleSubmit() {
    setError("");
    if (!firstName || !email) {
      setError("Prénom et email sont nécessaires.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/m/${slug}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, email, website: "" }),
      });
      if (!res.ok) throw new Error();
      setLinks(await res.json());
    } catch {
      setError("La création a échoué. Réessayez dans un instant.");
    } finally {
      setLoading(false);
    }
  }

  const input: React.CSSProperties = {
    width: "100%",
    padding: "14px 16px",
    borderRadius: "var(--radius-md)",
    border: "1px solid rgba(255,255,255,0.2)",
    background: "rgba(255,255,255,0.08)",
    color: "#fff",
    fontSize: 16,
    marginBottom: 12,
    boxSizing: "border-box",
  };

  if (links) {
    const url = showApple ? links.appleUrl : links.googleUrl;
    return (
      <div>
        <p style={{ marginBottom: 16 }}>🎉 Votre carte est prête, {firstName} !</p>
        <a
          href={url}
          style={{
            display: "block",
            textAlign: "center",
            padding: "16px",
            borderRadius: "var(--radius-md)",
            background: showApple ? "#000" : "#fff",
            color: showApple ? "#fff" : "#111",
            border: showApple ? "1px solid rgba(255,255,255,0.3)" : "none",
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          Ajouter à {showApple ? "Apple" : "Google"} Wallet
        </a>
        <button
          onClick={() => setForceOther((v) => !v)}
          style={{
            background: "none", border: "none", color: "rgba(255,255,255,0.4)",
            fontSize: 13, marginTop: 12, cursor: "pointer", textDecoration: "underline",
            display: "block", marginLeft: "auto", marginRight: "auto",
          }}
        >
          {showApple ? "J'ai un Android" : "J'ai un iPhone"}
        </button>
      </div>
    );
  }

  return (
    <>
      <input style={input} placeholder="Prénom" value={firstName}
        onChange={(e) => setFirstName(e.target.value)} />
      <input style={input} type="email" placeholder="Email" value={email}
        onChange={(e) => setEmail(e.target.value)} />
      {/* Honeypot anti-bot */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off"
        style={{ position: "absolute", left: -9999 }} aria-hidden="true" />
      {error && <p style={{ color: "#ff8a8a", fontSize: 14 }}>{error}</p>}
      <button
        onClick={handleSubmit}
        disabled={loading}
        style={{
          width: "100%", padding: 16, borderRadius: "var(--radius-md)", border: "none",
          background: labelColor, color: "#111", fontSize: 16, fontWeight: 700,
          cursor: "pointer", opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? "Création…" : "Créer ma carte"}
      </button>
    </>
  );
}
