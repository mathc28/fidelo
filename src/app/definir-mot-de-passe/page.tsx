"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { Button, Field, Logo } from "@/components/ui";

/**
 * Page d'atterrissage du lien d'invitation ET du lien de réinitialisation
 * de mot de passe (même mécanique côté Supabase) : le gérant arrive ici
 * avec une session temporaire (token dans l'URL, géré automatiquement par
 * supabase-js), définit son mot de passe, puis file sur son dashboard.
 */
export default function DefinirMotDePassePage() {
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
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

  async function save() {
    setError("");
    if (password.length < 8) {
      setError("8 caractères minimum.");
      return;
    }
    if (password !== confirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
    setTimeout(() => {
      window.location.href = "/dashboard";
    }, 1500);
  }

  if (!ready) return null;

  if (!hasSession) {
    return (
      <main style={{ maxWidth: 380, margin: "0 auto", padding: "80px 20px" }}>
        <h1 style={{ fontSize: 22 }}>Lien invalide ou expiré</h1>
        <p style={{ color: "var(--color-text-secondary)", fontSize: 14, lineHeight: 1.6 }}>
          Ce lien n’est plus valable (il expire après 24 h et ne fonctionne qu’une fois).
          Demandez-en un nouveau depuis la{" "}
          <a href="/mot-de-passe-oublie" style={{ color: "var(--color-marine)", fontWeight: 600 }}>
            page de réinitialisation
          </a>
          , ou contactez la personne qui vous a invité si vous attendiez une invitation.
        </p>
      </main>
    );
  }

  if (done) {
    return (
      <main style={{ maxWidth: 380, margin: "0 auto", padding: "80px 20px", textAlign: "center" }}>
        <p style={{ fontSize: 40, margin: 0 }}>🎉</p>
        <h1 style={{ fontSize: 22 }}>Mot de passe enregistré</h1>
        <p style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>
          Redirection vers votre dashboard…
        </p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 380, margin: "0 auto", padding: "80px 20px" }}>
      <Logo height={40} />
      <h1 style={{ fontSize: 22, margin: "20px 0 4px" }}>
        {isRecovery ? "Réinitialisez votre mot de passe" : "Bienvenue ! 👋"}
      </h1>
      <p style={{ color: "var(--color-text-secondary)", fontSize: 14, marginBottom: 24 }}>
        {isRecovery
          ? "Choisissez un nouveau mot de passe pour votre espace commerçant."
          : "Choisissez le mot de passe de votre espace commerçant."}
      </p>
      <Field
        type="password"
        placeholder="Mot de passe (8 caractères min.)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Field
        type="password"
        placeholder="Confirmez le mot de passe"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && save()}
      />
      {error && <p style={{ color: "var(--color-error)", fontSize: 14 }}>{error}</p>}
      <Button size="lg" block onClick={save}>
        Accéder à mon dashboard
      </Button>
    </main>
  );
}
