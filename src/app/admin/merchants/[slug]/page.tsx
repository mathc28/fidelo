"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";
import { Button, Field, Logo, SubscriptionBadge, ProgramBadge } from "@/components/ui";

type Merchant = {
  id: string;
  name: string;
  slug: string;
  program_type: "visits" | "points";
  subscription_status: string;
  address: string | null;
};
type Customer = {
  id: string;
  first_name: string;
  email: string;
  points: number;
  updated_at: string;
};
type Reward = { id: string; label: string; cost_points: number; active: boolean };
type Device = { id: string; label: string; created_at: string };
type Stats = {
  totalCards: number;
  cardsThisMonth: number;
  txThisMonth: number;
  promosThisMonth: number;
  promosThisWeek: number;
};

/**
 * Vue admin plateforme en lecture seule du dashboard d'un commerçant.
 * Aucune action possible ici (pas d'édition, pas d'envoi de promo) —
 * juste un aperçu pour diagnostiquer/support, alimenté par une API
 * qui bypass la RLS (service_role) puisque l'admin n'est pas le gérant.
 */
export default function AdminMerchantPage() {
  const { slug } = useParams<{ slug: string }>();

  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [reward, setReward] = useState<Reward | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    (async () => {
      const res = await fetch(`/api/admin/merchants/${slug}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.status === 401) {
        setLoadError("❌ Ce compte n'est pas admin plateforme (PLATFORM_ADMIN_EMAILS).");
        return;
      }
      if (res.status === 404) {
        setLoadError("❌ Commerce introuvable.");
        return;
      }
      if (!res.ok) {
        setLoadError(`❌ ${await res.text()}`);
        return;
      }
      const data = await res.json();
      setMerchant(data.merchant);
      setCustomers(data.customers);
      setReward(data.reward);
      setDevices(data.devices);
      setStats(data.stats);
    })();
  }, [session, slug]);

  async function login() {
    setAuthError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setAuthError(error.message);
  }

  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) => c.first_name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
    );
  }, [customers, search]);

  if (!session) {
    return (
      <main style={{ maxWidth: 380, margin: "0 auto", padding: "80px 20px" }}>
        <Logo height={40} />
        <h1 style={{ fontSize: 22, margin: "20px 0 4px" }}>Back-office plateforme</h1>
        <Field
          type="email"
          placeholder="Email admin"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && login()}
        />
        {authError && <p style={{ color: "var(--color-error)", fontSize: 14 }}>{authError}</p>}
        <Button block onClick={login}>
          Connexion
        </Button>
      </main>
    );
  }

  if (loadError) {
    return (
      <main style={{ maxWidth: 560, margin: "0 auto", padding: "80px 20px" }}>
        <p style={{ color: "var(--color-error)" }}>{loadError}</p>
        <a href="/admin" className="row-action">
          ← Retour au back-office
        </a>
      </main>
    );
  }

  if (!merchant || !stats) {
    return (
      <main style={{ padding: 80, textAlign: "center", color: "var(--color-text-secondary)" }}>
        Chargement…
      </main>
    );
  }

  const isVisits = merchant.program_type === "visits";
  const unit = isVisits ? "passages" : "points";

  return (
    <div style={{ minHeight: "100vh" }}>
      <header
        style={{
          background: "var(--color-marine)",
          padding: "0 28px",
          height: 56,
          display: "flex",
          alignItems: "center",
          gap: 14,
          position: "sticky",
          top: 0,
          zIndex: 20,
        }}
      >
        <Logo variant="symbol" theme="white" height={24} />
        <a href="/admin" style={{ color: "#B9C2DC", fontSize: 13, textDecoration: "none" }}>
          ← Back-office
        </a>
        <div style={{ flex: 1 }} />
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "#B9C2DC",
            background: "rgba(255,255,255,.1)",
            borderRadius: 999,
            padding: "4px 10px",
            letterSpacing: ".05em",
          }}
        >
          LECTURE SEULE
        </span>
      </header>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 32px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 20 }}>
          <h1 style={{ fontSize: 24 }}>{merchant.name}</h1>
          <ProgramBadge programType={merchant.program_type} />
          <SubscriptionBadge status={merchant.subscription_status} />
          <span
            style={{
              fontFamily: "ui-monospace, monospace",
              fontSize: 12,
              color: "var(--color-text-secondary)",
            }}
          >
            fidelo.app/{merchant.slug}
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 16,
            marginBottom: 20,
          }}
        >
          <div className="card">
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--color-text-secondary)",
                marginBottom: 8,
              }}
            >
              Cartes actives
            </div>
            <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: -1, lineHeight: 1 }}>
              {stats.totalCards.toLocaleString("fr-FR")}
            </div>
            <div
              style={{ fontSize: 12, color: "var(--color-success)", fontWeight: 700, marginTop: 8 }}
            >
              +{stats.cardsThisMonth} ce mois
            </div>
          </div>
          <div className="card">
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--color-text-secondary)",
                marginBottom: 8,
              }}
            >
              {isVisits ? "Passages ce mois" : "Points crédités ce mois"}
            </div>
            <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: -1, lineHeight: 1 }}>
              {stats.txThisMonth.toLocaleString("fr-FR")}
            </div>
          </div>
          <div className="card">
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--color-text-secondary)",
                marginBottom: 8,
              }}
            >
              Promos envoyées
            </div>
            <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: -1, lineHeight: 1 }}>
              {stats.promosThisMonth}
            </div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 8 }}>
              {stats.promosThisWeek}/3 cette semaine
            </div>
          </div>
          <div className="card">
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--color-text-secondary)",
                marginBottom: 8,
              }}
            >
              Caisses actives
            </div>
            <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: -1, lineHeight: 1 }}>
              {devices.length}
            </div>
          </div>
        </div>

        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}
        >
          <section className="card" style={{ padding: "24px 26px" }}>
            <h2 style={{ fontSize: 20, marginBottom: 4 }}>Récompense</h2>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 16px" }}>
              {isVisits ? "1 tampon par visite." : "1 point par euro dépensé."}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {reward && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    border: "1px solid #F0EDE2",
                    borderRadius: "var(--radius-md)",
                    padding: "12px 16px",
                    opacity: 1,
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      flex: "none",
                      borderRadius: "var(--radius-md)",
                      background: "var(--color-cream)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <div style={{ fontWeight: 800, fontSize: 15, lineHeight: 1 }}>
                      {reward.cost_points}
                    </div>
                    <div
                      style={{
                        fontSize: 8.5,
                        fontWeight: 700,
                        color: "var(--color-text-secondary)",
                        textTransform: "uppercase",
                      }}
                    >
                      {unit}
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{reward.label}</div>
                    <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                      Seuil du programme
                    </div>
                  </div>
                </div>
              )}
              {!reward && (
                <div
                  style={{
                    padding: 16,
                    textAlign: "center",
                    color: "var(--color-text-secondary)",
                    fontSize: 13,
                  }}
                >
                  Aucune récompense configurée
                </div>
              )}
            </div>
          </section>

          <section className="card" style={{ padding: "24px 26px" }}>
            <h2 style={{ fontSize: 20, marginBottom: 4 }}>Caisses</h2>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 16px" }}>
              Téléphones autorisés à scanner les cartes de ce commerçant.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {devices.map((d) => (
                <div
                  key={d.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    background: "var(--color-surface)",
                    borderRadius: "var(--radius-md)",
                    padding: "12px 16px",
                  }}
                >
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      background: "#fff",
                      border: "1px solid var(--color-border)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 15,
                    }}
                  >
                    📱
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{d.label}</div>
                    <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                      Appairé le {new Date(d.created_at).toLocaleDateString("fr-FR")}
                    </div>
                  </div>
                </div>
              ))}
              {devices.length === 0 && (
                <div
                  style={{
                    padding: 16,
                    textAlign: "center",
                    color: "var(--color-text-secondary)",
                    fontSize: 13,
                  }}
                >
                  Aucune caisse appairée
                </div>
              )}
            </div>
          </section>

          <section className="card" style={{ padding: "24px 26px", gridColumn: "1 / -1" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                marginBottom: 16,
                flexWrap: "wrap",
              }}
            >
              <h2 style={{ fontSize: 20 }}>Derniers clients</h2>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un prénom ou un email…"
                className="field-input"
                style={{ width: 280, padding: "10px 14px", fontSize: 13 }}
              />
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.4fr 1.8fr 1fr 1fr",
                padding: "8px 16px",
                fontSize: 11,
                fontWeight: 700,
                color: "var(--color-text-secondary)",
                textTransform: "uppercase",
                letterSpacing: ".06em",
              }}
            >
              <div>Client</div>
              <div>Email</div>
              <div>{isVisits ? "Passages" : "Points"}</div>
              <div style={{ textAlign: "right" }}>Dernier passage</div>
            </div>
            {filteredClients.map((c) => (
              <div
                key={c.id}
                className="table-row"
                style={{ gridTemplateColumns: "1.4fr 1.8fr 1fr 1fr" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      flex: "none",
                      borderRadius: "50%",
                      background: "var(--color-cream)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: 12,
                    }}
                  >
                    {c.first_name.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontWeight: 700 }}>{c.first_name}</span>
                </div>
                <div style={{ color: "var(--color-text-secondary)", fontSize: 13 }}>{c.email}</div>
                <div style={{ fontWeight: 700 }}>{c.points}</div>
                <div
                  style={{ textAlign: "right", color: "var(--color-text-secondary)", fontSize: 13 }}
                >
                  {new Date(c.updated_at).toLocaleString("fr-FR", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            ))}
            {filteredClients.length === 0 && (
              <div
                style={{
                  padding: 24,
                  textAlign: "center",
                  color: "var(--color-text-secondary)",
                  fontSize: 13,
                }}
              >
                {search
                  ? `Aucun client ne correspond à « ${search} »`
                  : "Aucun client pour l'instant."}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
