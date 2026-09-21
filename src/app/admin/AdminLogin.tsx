"use client";

import { useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { Button, Field, Logo } from "@/components/ui";
import { authErrorFr } from "@/lib/uiText";

/** Connexion au back-office plateforme, commune à toutes les pages /admin. */
export function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function login(e: FormEvent) {
    e.preventDefault();
    setError("");
    setPending(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setPending(false);
    if (error) setError(authErrorFr(error));
  }

  return (
    <main className="auth-shell">
      <div className="admin-login-tete">
        <Logo height={32} />
        <span className="badge badge-marine">Back-office</span>
      </div>
      <h1 className="auth-title">Connexion administrateur</h1>
      <form onSubmit={login}>
        <Field
          type="email"
          label="Email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field
          type="password"
          label="Mot de passe"
          autoComplete="current-password"
          value={password}
          error={error || undefined}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button type="submit" block disabled={pending || !email || !password}>
          {pending ? "Connexion…" : "Se connecter"}
        </Button>
      </form>
      <a className="auth-link" href="/dashboard">
        Vous êtes commerçant ? Connectez-vous à votre espace
      </a>
    </main>
  );
}
