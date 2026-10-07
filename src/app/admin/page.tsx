"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseBrowser";
import { Button, Field, Logo, SubscriptionBadge, ProgramBadge } from "@/components/ui";
import { emailValide } from "@/lib/uiText";
import type * as Row from "@/lib/types";
import { AdminLogin } from "./AdminLogin";
import { RafraichirCartes } from "./RafraichirCartes";
import "./admin.css";

// `cards` est calculé par l'API, pas une colonne : d'où l'intersection.
type Merchant = Pick<
  Row.Merchant,
  "id" | "slug" | "name" | "program_type" | "subscription_status"
> & {
  cards: number;
};

type Created = { name: string; email: string; slug: string };

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Back-office PLATEFORME — réservé aux emails de PLATFORM_ADMIN_EMAILS.
 * C'est ici que TU crées les comptes de tes clients commerçants.
 */
export default function AdminPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  const [merchants, setMerchants] = useState<Merchant[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState("");
  const [notAdmin, setNotAdmin] = useState(false);

  // Formulaire de création
  const [name, setName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [programType, setProgramType] = useState<"visits" | "points">("visits");
  const [rewardLabel, setRewardLabel] = useState("");
  const [seuil, setSeuil] = useState("10");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [created, setCreated] = useState<Created | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) loadMerchants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  async function loadMerchants() {
    if (!session) return;
    setLoadError(false);
    try {
      const res = await fetch("/api/admin/merchants", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.status === 401) {
        setNotAdmin(true);
        setTimeout(() => router.replace("/dashboard"), 1800);
        return;
      }
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMerchants(data.merchants);
    } catch {
      setLoadError(true);
    }
  }

  const slug = slugify(name);
  const isVisits = programType === "visits";
  const valid = Boolean(name.trim() && emailValide(ownerEmail) && rewardLabel.trim() && seuil);

  async function createMerchant(e: FormEvent) {
    e.preventDefault();
    if (!valid || !session) return;
    setCreating(true);
    setCreateError("");
    try {
      const res = await fetch("/api/admin/merchants", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          slug,
          ownerEmail: ownerEmail.trim(),
          programType,
          rewardLabel: rewardLabel.trim(),
          rewardCost: Number(seuil),
        }),
      });
      const text = await res.text();
      if (!res.ok) {
        setCreateError(text || "La création a échoué.");
        return;
      }
      const data = JSON.parse(text);
      setCreated({
        name: data.merchant.name,
        email: data.invitationSentTo,
        slug: data.merchant.slug,
      });
      setCopied(false);
      loadMerchants();
    } catch {
      setCreateError("Pas de connexion. Réessayez.");
    } finally {
      setCreating(false);
    }
  }

  function resetCreateForm() {
    setCreated(null);
    setName("");
    setOwnerEmail("");
    setRewardLabel("");
    setProgramType("visits");
    setSeuil("10");
  }

  async function copyUrl() {
    const url = `${window.location.origin}/m/${created?.slug}/inscription`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {}
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q || !merchants) return merchants ?? [];
    return merchants.filter((m) => m.name.toLowerCase().includes(q) || m.slug.includes(q));
  }, [merchants, search]);

  if (session === undefined) {
    return <main className="admin-chargement">Chargement…</main>;
  }

  if (!session) return <AdminLogin />;

  if (notAdmin) {
    return (
      <main className="auth-shell" role="status">
        <Logo height={32} />
        <h1 className="auth-title">Accès réservé</h1>
        <p className="auth-lede">
          Ce compte n’a pas accès au back-office plateforme. Redirection vers votre espace
          commerçant…
        </p>
      </main>
    );
  }

  const activeCount = merchants?.filter((m) => m.subscription_status === "active").length ?? 0;
  const pastDueCount = merchants?.filter((m) => m.subscription_status === "past_due").length ?? 0;

  return (
    <div>
      <header className="admin-barre on-dark">
        <Logo variant="symbol" theme="white" height={24} />
        <span className="admin-barre-nom">Fiduo</span>
        <span className="pill-on-dark">Back-office</span>
        <div className="admin-barre-fin">
          <span className="admin-barre-compte">{session.user.email}</span>
          <button className="admin-barre-lien" onClick={() => supabase.auth.signOut()}>
            Se déconnecter
          </button>
        </div>
      </header>

      <div className="admin-corps admin-grille">
        {/* ===== Tableau commerçants ===== */}
        <section className="card admin-table">
          <div className="admin-table-tete">
            <div>
              <h1 className="admin-titre">Commerçants</h1>
              <p className="admin-sous-titre">
                {merchants
                  ? `${merchants.length} au total · ${activeCount} actifs · ${pastDueCount} en retard de paiement`
                  : "Chargement…"}
              </p>
            </div>
            <div className="admin-table-outils">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nom ou slug"
                aria-label="Rechercher un commerçant"
                className="field-input field-input--sm admin-recherche"
              />
              <RafraichirCartes
                url="/api/admin/cartes"
                jeton={session.access_token}
                question="Mettre à jour les cartes de tous les commerces ?"
              />
            </div>
          </div>

          <div className="admin-defile">
            <div className="table-head admin-cols-commercants">
              <div>Commerce</div>
              <div>Programme</div>
              <div>Abonnement</div>
              <div className="admin-droite">Cartes</div>
              <div />
            </div>

            {filtered.map((m) => (
              <div key={m.id} className="table-row admin-cols-commercants">
                <div style={{ minWidth: 0 }}>
                  <div className="admin-nom">{m.name}</div>
                  <div className="admin-slug">/m/{m.slug}/inscription</div>
                </div>
                <div>
                  <ProgramBadge programType={m.program_type} />
                </div>
                <div>
                  <SubscriptionBadge status={m.subscription_status} />
                </div>
                <div className="admin-droite mono">{m.cards.toLocaleString("fr-FR")}</div>
                <div className="admin-droite">
                  <a className="row-action" href={`/admin/merchants/${m.slug}`}>
                    Ouvrir
                  </a>
                </div>
              </div>
            ))}
          </div>

          {loadError && (
            <div className="admin-vide" role="alert">
              La liste n’a pas pu être chargée.{" "}
              <button className="row-action" onClick={loadMerchants}>
                Réessayer
              </button>
            </div>
          )}
          {merchants && filtered.length === 0 && (
            <div className="admin-vide">
              {search ? `Aucun commerçant pour « ${search} »` : "Aucun commerçant pour l'instant."}
            </div>
          )}
        </section>

        {/* ===== Création ===== */}
        <section className="card admin-creation">
          {!created ? (
            <>
              <h2 className="admin-titre-2">Nouveau commerçant</h2>
              <p className="admin-note">L’invitation part par email dès la création.</p>
              <form onSubmit={createMerchant} noValidate>
                <div className="field">
                  <Field
                    label="Nom du commerce"
                    className="field-input--sm"
                    wrapperClassName="admin-sans-marge"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Café Bellecour"
                  />
                  <div className="admin-slug-apercu" aria-live="polite">
                    <span>/m/</span>
                    <strong>{slug || "…"}</strong>
                    <span>/inscription, généré automatiquement</span>
                  </div>
                </div>

                <Field
                  label="Email du gérant"
                  className="field-input--sm"
                  type="email"
                  inputMode="email"
                  autoComplete="off"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  placeholder="gerant@commerce.fr"
                />

                <fieldset className="admin-options" role="radiogroup">
                  <legend className="field-label">Programme de fidélité</legend>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={isVisits}
                    onClick={() => {
                      setProgramType("visits");
                      setSeuil("10");
                    }}
                    className={`option-card ${isVisits ? "is-selected" : ""}`}
                  >
                    <span className="admin-option-titre">Au passage</span>
                    <span className="admin-option-desc">
                      1 visite = 1 tampon. Ex : 10 visites = récompense
                    </span>
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={!isVisits}
                    onClick={() => {
                      setProgramType("points");
                      setSeuil("250");
                    }}
                    className={`option-card ${!isVisits ? "is-selected" : ""}`}
                  >
                    <span className="admin-option-titre">Aux points</span>
                    <span className="admin-option-desc">
                      1 € dépensé = 1 point. Paliers en points
                    </span>
                  </button>
                </fieldset>

                <div className="admin-recompense">
                  <Field
                    label="Première récompense"
                    className="field-input--sm"
                    value={rewardLabel}
                    onChange={(e) => setRewardLabel(e.target.value)}
                    placeholder="−10 % sur le panier"
                  />
                  <Field
                    label="Seuil"
                    className="field-input--sm mono"
                    inputMode="numeric"
                    hint={isVisits ? "passages" : "points"}
                    value={seuil}
                    onChange={(e) => setSeuil(e.target.value.replace(/\D/g, ""))}
                  />
                </div>

                {createError && (
                  <p className="field-error" role="alert" style={{ marginBottom: 12 }}>
                    {createError}
                  </p>
                )}

                <Button type="submit" block disabled={!valid || creating}>
                  {creating ? "Création…" : "Créer et envoyer l'invitation"}
                </Button>
              </form>
            </>
          ) : (
            <div className="admin-cree" role="status">
              <div className="flash flash-success" style={{ marginBottom: 16 }}>
                <strong>{created.name} est créé</strong>
                Invitation envoyée à {created.email}.
              </div>
              <p className="admin-note">Transmettez aussi l’adresse d’inscription :</p>
              <div className="admin-url">
                <code>
                  {typeof window !== "undefined" ? window.location.origin : ""}/m/{created.slug}
                  /inscription
                </code>
                <Button size="sm" onClick={copyUrl}>
                  {copied ? "Copié" : "Copier"}
                </Button>
              </div>
              <Button variant="secondary" block onClick={resetCreateForm}>
                Créer un autre commerçant
              </Button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
