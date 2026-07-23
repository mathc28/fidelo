"use client";

import { useState } from "react";

type Account = {
  firstName: string;
  points: number;
  memberSince: string;
  nextReward: { label: string; cost: number } | null;
  appleUrl: string;
  googleUrl: string;
};

export default function AccountLookup({
  slug,
  labelColor,
  programType,
}: {
  slug: string;
  labelColor: string;
  programType: string;
}) {
  const [email, setEmail] = useState("");
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function lookup() {
    if (!email) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/m/${slug}/lookup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.status === 404) {
        setError("Aucune carte pour cet email.");
        return;
      }
      if (!res.ok) throw new Error();
      setAccount(await res.json());
    } catch {
      setError("Impossible de récupérer votre carte.");
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

  if (account) {
    const progress = account.nextReward
      ? Math.min(100, Math.round((account.points / account.nextReward.cost) * 100))
      : 100;
    return (
      <div>
        <div
          style={{
            background: "rgba(255,255,255,0.07)",
            borderRadius: "var(--radius-lg)",
            padding: 22,
            textAlign: "center",
            marginBottom: 16,
          }}
        >
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, margin: 0, letterSpacing: 1 }}>
            BONJOUR {account.firstName.toUpperCase()}
          </p>
          <p
            style={{
              fontSize: 46,
              fontWeight: 800,
              letterSpacing: -1,
              margin: "4px 0",
              color: labelColor,
            }}
          >
            {account.points}
            {account.nextReward && programType === "visits" && (
              <span style={{ fontSize: 20, color: "rgba(255,255,255,0.4)" }}>
                {" "}
                / {account.nextReward.cost}
              </span>
            )}
          </p>
          {account.nextReward && (
            <>
              <div
                style={{
                  background: "rgba(255,255,255,0.12)",
                  borderRadius: 99,
                  height: 6,
                  overflow: "hidden",
                  marginBottom: 8,
                }}
              >
                <div style={{ width: `${progress}%`, height: "100%", background: labelColor }} />
              </div>
              <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, margin: 0 }}>
                Plus que {account.nextReward.cost - account.points}{" "}
                {programType === "visits" ? "passage(s)" : "point(s)"} avant :{" "}
                {account.nextReward.label}
              </p>
            </>
          )}
        </div>
        <a
          href={account.appleUrl}
          style={{
            display: "block",
            textAlign: "center",
            padding: 14,
            borderRadius: "var(--radius-md)",
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.2)",
            color: "#fff",
            textDecoration: "none",
            fontWeight: 600,
            marginBottom: 10,
            fontSize: 14,
          }}
        >
          Ré-ajouter à Apple Wallet
        </a>
        <a
          href={account.googleUrl}
          style={{
            display: "block",
            textAlign: "center",
            padding: 14,
            borderRadius: "var(--radius-md)",
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.2)",
            color: "#fff",
            textDecoration: "none",
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          Ré-ajouter à Google Wallet
        </a>
        <p
          style={{
            color: "rgba(255,255,255,0.3)",
            fontSize: 12,
            textAlign: "center",
            marginTop: 14,
          }}
        >
          Membre depuis le {new Date(account.memberSince).toLocaleDateString("fr-FR")}
        </p>
      </div>
    );
  }

  return (
    <>
      <input
        style={input}
        type="email"
        placeholder="Votre email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && lookup()}
      />
      {error && <p style={{ color: "#ff8a8a", fontSize: 14 }}>{error}</p>}
      <button
        onClick={lookup}
        disabled={loading}
        style={{
          width: "100%",
          padding: 16,
          borderRadius: "var(--radius-md)",
          border: "none",
          background: labelColor,
          color: "#111",
          fontSize: 16,
          fontWeight: 700,
          cursor: "pointer",
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? "Recherche…" : "Voir ma carte"}
      </button>
      <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginTop: 14 }}>
        Pas encore de carte ?{" "}
        <a href={`/m/${slug}/inscription`} style={{ color: labelColor }}>
          Créez-la en 30 secondes
        </a>
        .
      </p>
    </>
  );
}
