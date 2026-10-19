"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseBrowser";
import { Button, Logo } from "@/components/ui";
import { CaseCgv } from "@/components/CaseCgv";
import { EVENEMENT_CGV } from "@/lib/cgvClient";

type Verification = "inutile" | "en-cours" | "a-accepter" | "ok";

/**
 * Barrière CGV du dashboard commerçant : tant que le gérant connecté n'a pas
 * accepté la version en vigueur, le dashboard est remplacé par la page « Nos
 * conditions ont évolué ». Le serveur décide (GET /api/dashboard/cgv) — les
 * admins plateforme n'y sont jamais soumis.
 *
 * Sans session, le dashboard affiche lui-même son écran de connexion : rien
 * à vérifier ici. Une vérification impossible (réseau, compte sans commerce)
 * laisse aussi passer : le dashboard gère ces cas et leurs messages.
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [etat, setEtat] = useState<Verification>("en-cours");
  const [cgv, setCgv] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const jeton = session?.access_token;

  // Une route du dashboard a refusé une action faute d'acceptation (403
  // cgv_non_acceptees, cf. cgvClient) : on affiche la page d'acceptation.
  useEffect(() => {
    const surRefus = () => {
      setCgv(false);
      setEtat("a-accepter");
    };
    window.addEventListener(EVENEMENT_CGV, surRefus);
    return () => window.removeEventListener(EVENEMENT_CGV, surRefus);
  }, []);

  useEffect(() => {
    if (session === undefined) return;
    if (!jeton) {
      setEtat("inutile");
      return;
    }
    setEtat("en-cours");
    fetch("/api/dashboard/cgv", { headers: { Authorization: `Bearer ${jeton}` } })
      .then(async (res) => {
        if (!res.ok) return setEtat("inutile");
        const { doitAccepter } = (await res.json()) as { doitAccepter: boolean };
        setEtat(doitAccepter ? "a-accepter" : "ok");
      })
      .catch(() => setEtat("inutile"));
    // Une nouvelle vérification seulement quand le compte change, pas à
    // chaque rafraîchissement du jeton.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session === undefined, session?.user.id]);

  async function accepter(e: FormEvent) {
    e.preventDefault();
    if (!cgv || !jeton) return;
    setEnCours(true);
    setErreur("");
    try {
      const res = await fetch("/api/dashboard/cgv", {
        method: "POST",
        headers: { Authorization: `Bearer ${jeton}` },
      });
      if (!res.ok) {
        setErreur((await res.text()) || "L'acceptation n'a pas pu être enregistrée.");
        return;
      }
      setEtat("ok");
    } catch {
      setErreur("Pas de connexion. Vérifiez le réseau et réessayez.");
    } finally {
      setEnCours(false);
    }
  }

  // Lecture de la session ou vérification en cours : rien à montrer encore.
  if (session === undefined || (jeton && etat === "en-cours")) {
    return (
      <main className="auth-shell" aria-busy="true">
        <Logo height={36} />
      </main>
    );
  }

  if (etat === "a-accepter") {
    return (
      <main className="auth-shell">
        <Logo height={36} />
        <h1 className="auth-title">Nos conditions ont évolué</h1>
        <p className="auth-lede">
          Pour continuer à utiliser Fiduo, prenez connaissance des nouvelles conditions générales de
          vente et de l&apos;accord de sous-traitance des données de vos clients, puis acceptez-les.
        </p>
        <form onSubmit={accepter} noValidate>
          <CaseCgv checked={cgv} onChange={setCgv} />
          {erreur && (
            <p className="field-error" role="alert" style={{ marginBottom: 12 }}>
              {erreur}
            </p>
          )}
          <Button type="submit" block disabled={!cgv || enCours}>
            {enCours ? "Enregistrement…" : "Accepter et accéder à mon espace"}
          </Button>
        </form>
        <button type="button" className="auth-link" onClick={() => supabase.auth.signOut()}>
          Se déconnecter
        </button>
      </main>
    );
  }

  return <>{children}</>;
}
