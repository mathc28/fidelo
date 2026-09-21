"use client";

import { useState, type FormEvent } from "react";
import { emailValide, unite } from "@/lib/uiText";

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
  programType,
}: {
  slug: string;
  programType: string;
}) {
  const [email, setEmail] = useState("");
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isVisits = programType === "visits";

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
      if (res.status === 404) {
        setError("Aucune carte pour cet email.");
        return;
      }
      if (res.status >= 400 && res.status < 500) {
        setError((await res.text()) || "Vérifiez votre adresse email.");
        return;
      }
      if (!res.ok) throw new Error();
      setAccount(await res.json());
    } catch {
      setError("Connexion impossible. Vérifiez votre réseau et réessayez.");
    } finally {
      setLoading(false);
    }
  }

  if (account) {
    const reward = account.nextReward;
    const ready = reward ? account.points >= reward.cost : false;
    const restant = reward ? reward.cost - account.points : 0;
    return (
      <div>
        <div className="m-card">
          <p className="m-hello m-muted">Bonjour {account.firstName}</p>
          <p className="m-count">
            {account.points}
            {reward && isVisits && <span className="m-count-total"> / {reward.cost}</span>}
          </p>
          {reward && (
            <>
              <div
                className="m-progress"
                role="progressbar"
                aria-label={`Progression vers : ${reward.label}`}
                aria-valuemin={0}
                aria-valuemax={reward.cost}
                aria-valuenow={Math.min(account.points, reward.cost)}
              >
                <div
                  className="m-progress-fill"
                  style={{ width: `${Math.min(100, (account.points / reward.cost) * 100)}%` }}
                />
              </div>
              {ready ? (
                <p className="m-reward-ready">
                  Récompense disponible : {reward.label}. Demandez-la en caisse.
                </p>
              ) : (
                <p className="m-muted" style={{ fontSize: "var(--text-sm)", margin: 0 }}>
                  Plus que {unite(restant, isVisits)} avant : {reward.label}
                </p>
              )}
            </>
          )}
        </div>
        <a href={account.appleUrl} className="m-wallet m-wallet--apple">
          Ajouter à nouveau à Apple Wallet
        </a>
        <a href={account.googleUrl} className="m-wallet m-wallet--google">
          Ajouter à nouveau à Google Wallet
        </a>
        <p className="m-muted" style={{ fontSize: "var(--text-xs)", textAlign: "center" }}>
          Membre depuis le {new Date(account.memberSince).toLocaleDateString("fr-FR")}
        </p>
        <button
          type="button"
          className="m-link m-muted"
          onClick={() => {
            setAccount(null);
            setEmail("");
          }}
        >
          Ce n&apos;est pas vous ? Chercher une autre carte
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
        {loading ? "Recherche…" : "Voir ma carte"}
      </button>
      <a href={`/m/${slug}/inscription`} className="m-link m-muted" style={{ marginTop: 8 }}>
        Pas encore de carte ? Créez-la en 30 secondes
      </a>
    </form>
  );
}
