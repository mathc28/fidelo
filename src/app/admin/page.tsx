"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";
import { Button, Field, Logo, SubscriptionBadge, ProgramBadge } from "@/components/ui";

type Merchant = {
  id: string;
  slug: string;
  name: string;
  program_type: "visits" | "points";
  subscription_status: string;
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
  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  const [merchants, setMerchants] = useState<Merchant[] | null>(null);
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

  async function login() {
    setAuthError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setAuthError(error.message);
  }

  async function loadMerchants() {
    const res = await fetch("/api/admin/merchants", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.status === 401) {
      setNotAdmin(true);
      setTimeout(() => router.replace("/dashboard"), 1800);
      return;
    }
    const data = await res.json();
    setMerchants(data.merchants);
  }

  const slug = slugify(name);
  const isVisits = programType === "visits";
  const valid = Boolean(name.trim() && /.+@.+\..+/.test(ownerEmail) && rewardLabel.trim() && seuil);

  async function createMerchant() {
    if (!valid) return;
    setCreating(true);
    setCreateError("");
    const res = await fetch("/api/admin/merchants", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        name: name.trim(), slug, ownerEmail: ownerEmail.trim(), programType,
        rewardLabel: rewardLabel.trim(), rewardCost: Number(seuil),
      }),
    });
    const text = await res.text();
    setCreating(false);
    if (!res.ok) { setCreateError(text); return; }
    const data = JSON.parse(text);
    setCreated({ name: data.merchant.name, email: data.invitationSentTo, slug: data.merchant.slug });
    setCopied(false);
    loadMerchants();
  }

  function resetCreateForm() {
    setCreated(null);
    setName(""); setOwnerEmail(""); setRewardLabel(""); setProgramType("visits"); setSeuil("10");
  }

  async function copyUrl() {
    const url = `${window.location.origin}/m/${created?.slug}/inscription`;
    try { await navigator.clipboard.writeText(url); } catch {}
    setCopied(true);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q || !merchants) return merchants ?? [];
    return merchants.filter((m) => m.name.toLowerCase().includes(q) || m.slug.includes(q));
  }, [merchants, search]);

  if (!session) {
    return (
      <main style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "var(--color-marine)", padding: 20,
      }}>
        <div style={{ width: "100%", maxWidth: 380 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
            <Logo variant="symbol" theme="white" height={30} />
            <span style={{
              fontSize: 11, fontWeight: 700, color: "#B9C2DC", background: "rgba(255,255,255,.1)",
              borderRadius: 999, padding: "4px 10px", letterSpacing: ".05em",
            }}>BACK-OFFICE PLATEFORME</span>
          </div>
          <h1 style={{ fontSize: 22, margin: "0 0 18px", color: "#fff" }}>Connexion admin</h1>
          <Field type="email" placeholder="Email admin" value={email}
            onChange={(e) => setEmail(e.target.value)} />
          <Field type="password" placeholder="Mot de passe" value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && login()} />
          {authError && <p style={{ color: "#FF9C93", fontSize: 14 }}>{authError}</p>}
          <Button block onClick={login}>Connexion</Button>
          <p style={{ color: "#B9C2DC", fontSize: 12.5, marginTop: 14, textAlign: "center" }}>
            Vous êtes commerçant ? <a href="/dashboard" style={{ color: "#fff", fontWeight: 600 }}>Connectez-vous à votre espace</a>
          </p>
        </div>
      </main>
    );
  }

  if (notAdmin) {
    return (
      <main style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "var(--color-marine)", padding: 20, textAlign: "center",
      }}>
        <div style={{ maxWidth: 340 }}>
          <Logo variant="symbol" theme="white" height={30} />
          <p style={{ color: "#fff", fontSize: 15, margin: "18px 0 0", lineHeight: 1.5 }}>
            Ce compte n'a pas accès au back-office plateforme.
            <br />Redirection vers votre espace commerçant…
          </p>
        </div>
      </main>
    );
  }

  const activeCount = merchants?.filter((m) => m.subscription_status === "active").length ?? 0;
  const pastDueCount = merchants?.filter((m) => m.subscription_status === "past_due").length ?? 0;

  return (
    <div style={{ minHeight: "100vh" }}>
      <header style={{
        background: "var(--color-marine)", padding: "0 28px", height: 56,
        display: "flex", alignItems: "center", gap: 14, position: "sticky", top: 0, zIndex: 20,
      }}>
        <Logo variant="symbol" theme="white" height={24} />
        <span style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 17, color: "#fff" }}>Fidelo</span>
        <span style={{
          fontSize: 11, fontWeight: 700, color: "#B9C2DC", background: "rgba(255,255,255,.1)",
          borderRadius: 999, padding: "4px 10px", letterSpacing: ".05em",
        }}>BACK-OFFICE</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 13, color: "#B9C2DC" }}>{session.user.email}</span>
        <Button variant="ghost" size="sm" onClick={() => supabase.auth.signOut()}
          style={{ color: "#B9C2DC", padding: "13px 0 13px 16px" }}>
          Se déconnecter
        </Button>
      </header>

      <div style={{
        maxWidth: 1360, margin: "0 auto", padding: "26px 28px",
        display: "grid", gridTemplateColumns: "1fr 400px", gap: 22, alignItems: "start",
      }}>
        {/* ===== Tableau commerçants ===== */}
        <section className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            gap: 16, padding: "18px 22px 14px",
          }}>
            <div>
              <h1 style={{ fontSize: 22 }}>Commerçants</h1>
              <div style={{ fontSize: 12.5, color: "var(--color-text-secondary)", marginTop: 2 }}>
                {merchants?.length ?? "…"} clients · {activeCount} actifs · {pastDueCount} en retard de paiement
              </div>
            </div>
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher nom ou slug…" className="field-input"
              style={{ width: 240, padding: "9px 12px", fontSize: 13 }} />
          </div>

          <div className="table-head" style={{ gridTemplateColumns: "2fr 1.1fr 1.1fr 0.8fr 0.7fr" }}>
            <div>Commerce</div><div>Programme</div><div>Abonnement</div>
            <div style={{ textAlign: "right" }}>Cartes actives</div><div />
          </div>

          {filtered.map((m) => (
            <div key={m.id} className="table-row" style={{ gridTemplateColumns: "2fr 1.1fr 1.1fr 0.8fr 0.7fr" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.name}</div>
                <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 11, color: "var(--color-text-secondary)" }}>
                  fidelo.app/{m.slug}
                </div>
              </div>
              <div><ProgramBadge programType={m.program_type} /></div>
              <div><SubscriptionBadge status={m.subscription_status} /></div>
              <div style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                {m.cards.toLocaleString("fr-FR")}
              </div>
              <div style={{ textAlign: "right" }}>
                <a className="row-action" href={`/admin/merchants/${m.slug}`}>
                  Ouvrir
                </a>
              </div>
            </div>
          ))}

          {merchants && filtered.length === 0 && (
            <div style={{ padding: 28, textAlign: "center", color: "var(--color-text-secondary)", fontSize: 13, borderTop: "1px solid #F0EDE2" }}>
              {search ? `Aucun commerçant pour « ${search} »` : "Aucun commerçant pour l'instant."}
            </div>
          )}
        </section>

        {/* ===== Création ===== */}
        <section className="card" style={{ padding: "22px 24px", position: "sticky", top: 82 }}>
          {!created ? (
            <>
              <h2 style={{ fontSize: 19, marginBottom: 2 }}>Nouveau commerçant</h2>
              <p style={{ fontSize: 12.5, color: "var(--color-text-secondary)", margin: "0 0 18px" }}>
                L'invitation part par email dès la création.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label className="field-label">Nom du commerce</label>
                  <input className="field-input" style={{ fontSize: 13.5, padding: "10px 12px" }}
                    value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : Café Bellecour" />
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5, fontFamily: "ui-monospace, monospace", fontSize: 11.5, color: "var(--color-text-secondary)" }}>
                    <span>fidelo.app/</span>
                    <span style={{ background: "var(--color-cream)", borderRadius: 5, padding: "1px 6px", color: "var(--color-text)", fontWeight: 600 }}>
                      {slug || "…"}
                    </span>
                    <span style={{ fontFamily: "var(--font-body)", fontSize: 10.5, color: "#9AA0B0" }}>généré automatiquement</span>
                  </div>
                </div>

                <div>
                  <label className="field-label">Email du gérant</label>
                  <input className="field-input" style={{ fontSize: 13.5, padding: "10px 12px" }}
                    type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)}
                    placeholder="gerant@commerce.fr" />
                </div>

                <div>
                  <label className="field-label" style={{ marginBottom: 6 }}>Programme de fidélité</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="button" onClick={() => { setProgramType("visits"); setSeuil("10"); }}
                      className={`option-card ${isVisits ? "is-selected" : ""}`}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                        <span style={{ fontSize: 16 }}>🥖</span>
                        <span style={{ fontWeight: 700, fontSize: 13 }}>Au passage</span>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--color-text-secondary)", lineHeight: 1.4 }}>
                        1 visite = 1 tampon.<br />Ex : 10 visites = récompense
                      </div>
                    </button>
                    <button type="button" onClick={() => { setProgramType("points"); setSeuil("250"); }}
                      className={`option-card ${!isVisits ? "is-selected" : ""}`}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                        <span style={{ fontSize: 16 }}>🧾</span>
                        <span style={{ fontWeight: 700, fontSize: 13 }}>Aux points</span>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--color-text-secondary)", lineHeight: 1.4 }}>
                        1 € dépensé = 1 point.<br />Paliers en points
                      </div>
                    </button>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 96px", gap: 10 }}>
                  <div>
                    <label className="field-label">Première récompense</label>
                    <input className="field-input" style={{ fontSize: 13.5, padding: "10px 12px" }}
                      value={rewardLabel} onChange={(e) => setRewardLabel(e.target.value)}
                      placeholder="Ex : −10 % sur le panier" />
                  </div>
                  <div>
                    <label className="field-label">Seuil</label>
                    <input className="field-input" style={{ fontSize: 13.5, padding: "10px 12px", textAlign: "center" }}
                      value={seuil} onChange={(e) => setSeuil(e.target.value.replace(/\D/g, ""))} />
                    <div style={{ fontSize: 10.5, color: "#9AA0B0", marginTop: 4, textAlign: "center" }}>
                      {isVisits ? "passages" : "points"}
                    </div>
                  </div>
                </div>

                {createError && <p style={{ color: "var(--color-error)", fontSize: 13, margin: 0 }}>❌ {createError}</p>}

                <Button block disabled={!valid || creating} onClick={createMerchant} style={{ marginTop: 2 }}>
                  {creating ? "Création…" : "Créer et envoyer l'invitation"}
                </Button>
              </div>
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "10px 0 4px" }}>
              <div style={{
                width: 58, height: 58, borderRadius: "50%", background: "var(--color-success-bg)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 14px", fontSize: 26, color: "var(--color-success)",
              }}>✓</div>
              <h2 style={{ fontSize: 19, marginBottom: 6 }}>{created.name} est créé</h2>
              <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 18px", lineHeight: 1.5 }}>
                Invitation envoyée à <strong style={{ color: "var(--color-text)" }}>{created.email}</strong>.
                <br />Transmettez aussi l'URL d'inscription :
              </p>
              <div style={{
                display: "flex", gap: 8, alignItems: "center", background: "var(--color-surface)",
                borderRadius: "var(--radius-md)", padding: "10px 12px", marginBottom: 16,
              }}>
                <span style={{
                  flex: 1, fontFamily: "ui-monospace, monospace", fontSize: 12, color: "var(--color-text)",
                  textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {typeof window !== "undefined" ? window.location.origin : ""}/m/{created.slug}/inscription
                </span>
                <Button size="sm" onClick={copyUrl} style={{ flex: "none" }}>
                  {copied ? "Copié ✓" : "Copier"}
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
