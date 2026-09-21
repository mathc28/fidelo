"use client";

import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { Button, Field, Logo } from "@/components/ui";
import { authErrorFr } from "@/lib/uiText";

/**
 * Page d'atterrissage du lien d'invitation ET du lien de réinitialisation
 * de mot de passe (même mécanique côté Supabase) : le gérant arrive ici
 * avec une session temporaire (token dans l'URL, géré automatiquement par
 * supabase-js), définit son mot de passe, puis file sur son espace.
 */
export default function DefinirMotDePassePage() {
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // supabase-js consomme le token de l'URL (#access_token=...) tout seul ;
    // on attend juste que la session soit posée.
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(Boolean(data.session));
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (s) setHasSession(true);
      if (event === "PASSWORD_RECOVERY") setIsRecovery(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Mot de passe trop court : 8 caractères minimum.");
      return;
    }
    if (password !== confirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      setError(authErrorFr(error));
      return;
    }
    setDone(true);
    setTimeout(() => {
      window.location.href = "/dashboard";
    }, 1500);
  }

  if (!ready) {
    return (
      <main className="auth-shell" aria-busy="true">
        <Logo height={36} />
        <p className="auth-lede" style={{ marginTop: 28 }}>
          Vérification du lien…
        </p>
      </main>
    );
  }

  if (!hasSession) {
    return (
      <main className="auth-shell">
        <Logo height={36} />
        <h1 className="auth-title">Lien invalide ou expiré</h1>
        <p className="auth-lede">
          Ce lien n’est plus valable : il expire après 24 h et ne fonctionne qu’une fois. Si vous
          attendiez une invitation, contactez la personne qui vous a invité.
        </p>
        <a className="btn btn-primary btn-md btn-block" href="/mot-de-passe-oublie">
          Demander un nouveau lien
        </a>
      </main>
    );
  }

  if (done) {
    return (
      <main className="auth-shell" role="status">
        <Logo height={36} />
        <h1 className="auth-title">Mot de passe enregistré</h1>
        <p className="auth-lede">Ouverture de votre espace commerçant…</p>
      </main>
    );
  }

  return (
    <main className="auth-shell">
      <Logo height={36} />
      <h1 className="auth-title">{isRecovery ? "Nouveau mot de passe" : "Bienvenue sur Fidelo"}</h1>
      <p className="auth-lede">
        {isRecovery
          ? "Choisissez un nouveau mot de passe pour votre espace commerçant."
          : "Choisissez le mot de passe de votre espace commerçant."}
      </p>
      <form onSubmit={save} noValidate>
        <Field
          type="password"
          label="Mot de passe"
          hint="8 caractères minimum."
          autoComplete="new-password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Field
          type="password"
          label="Confirmation"
          autoComplete="new-password"
          value={confirm}
          error={error || undefined}
          onChange={(e) => setConfirm(e.target.value)}
        />
        <Button type="submit" block disabled={saving}>
          {saving ? "Enregistrement…" : "Accéder à mon espace"}
        </Button>
      </form>
    </main>
  );
}
