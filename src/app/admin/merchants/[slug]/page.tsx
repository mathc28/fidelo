"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseBrowser";
import { Logo, SubscriptionBadge, ProgramBadge } from "@/components/ui";
import { MAX_PROMOS } from "@/lib/promo";
import type * as Row from "@/lib/types";
import { AdminLogin } from "../../AdminLogin";
import "../../admin.css";

// Dérivés du modèle : voir src/lib/types.ts.
type Customer = Pick<Row.Customer, "id" | "first_name" | "email" | "points" | "updated_at">;
type Reward = Row.Reward;
type Device = Pick<Row.Device, "id" | "label" | "created_at">;
type Stats = {
  totalCards: number;
  cardsThisMonth: number;
  txThisMonth: number;
  promosThisMonth: number;
  promosThisWeek: number;
};

function Stat({ label, valeur, note }: { label: string; valeur: string; note?: string }) {
  return (
    <div className="card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{valeur}</div>
      {note && <div className="stat-delta">{note}</div>}
    </div>
  );
}

/**
 * Vue admin plateforme en lecture seule du dashboard d'un commerçant.
 * Aucune action possible ici (pas d'édition, pas d'envoi de promo) —
 * juste un aperçu pour diagnostiquer/support, alimenté par une API
 * qui bypass la RLS (service_role) puisque l'admin n'est pas le gérant.
 */
export default function AdminMerchantPage() {
  const { slug } = useParams<{ slug: string }>();

  const [session, setSession] = useState<Session | null | undefined>(undefined);

  const [merchant, setMerchant] = useState<Row.Merchant | null>(null);
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
      try {
        const res = await fetch(`/api/admin/merchants/${slug}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.status === 401) {
          setLoadError("Ce compte n'a pas accès au back-office.");
          return;
        }
        if (res.status === 404) {
          setLoadError("Commerce introuvable.");
          return;
        }
        if (!res.ok) {
          setLoadError((await res.text()) || "La fiche n'a pas pu être chargée.");
          return;
        }
        const data = await res.json();
        setMerchant(data.merchant);
        setCustomers(data.customers);
        setReward(data.reward);
        setDevices(data.devices);
        setStats(data.stats);
      } catch {
        setLoadError("Pas de connexion. Rechargez la page.");
      }
    })();
  }, [session, slug]);

  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) => c.first_name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
    );
  }, [customers, search]);

  if (session === undefined) return <main className="admin-chargement">Chargement…</main>;

  if (!session) return <AdminLogin />;

  if (loadError) {
    return (
      <main className="auth-shell">
        <Logo height={32} />
        <h1 className="auth-title">Fiche indisponible</h1>
        <p className="auth-lede" role="alert">
          {loadError}
        </p>
        <a href="/admin" className="row-action">
          Retour au back-office
        </a>
      </main>
    );
  }

  if (!merchant || !stats) {
    return <main className="admin-chargement">Chargement de la fiche…</main>;
  }

  const isVisits = merchant.program_type === "visits";
  const unit = isVisits ? "passages" : "points";

  return (
    <div>
      <header className="admin-barre on-dark">
        <Logo variant="symbol" theme="white" height={24} />
        <a href="/admin" className="admin-barre-lien">
          Back-office
        </a>
        <div className="admin-barre-fin">
          <span className="pill-on-dark">Lecture seule</span>
        </div>
      </header>

      <div className="admin-corps">
        <div className="admin-fiche-tete">
          <h1 className="admin-titre">{merchant.name}</h1>
          <ProgramBadge programType={merchant.program_type} />
          <SubscriptionBadge status={merchant.subscription_status} />
          <span className="admin-slug">/m/{merchant.slug}/inscription</span>
        </div>

        <div className="admin-stats">
          <Stat
            label="Cartes actives"
            valeur={stats.totalCards.toLocaleString("fr-FR")}
            note={`+${stats.cardsThisMonth} ce mois`}
          />
          <Stat
            label={isVisits ? "Passages ce mois" : "Points crédités ce mois"}
            valeur={stats.txThisMonth.toLocaleString("fr-FR")}
          />
          <Stat
            label="Promos ce mois"
            valeur={String(stats.promosThisMonth)}
            note={`${stats.promosThisWeek}/${MAX_PROMOS} sur 7 jours glissants`}
          />
          <Stat label="Caisses actives" valeur={String(devices.length)} />
        </div>

        <div className="admin-duo">
          <section className="card">
            <h2 className="admin-titre-2">Récompense</h2>
            <p className="admin-note">
              {isVisits ? "1 tampon par visite." : "1 point par euro dépensé."}
            </p>
            {reward ? (
              <div className="admin-ligne">
                <div className="admin-seuil" aria-label={`${reward.cost_points} ${unit}`}>
                  {reward.cost_points}
                </div>
                <div>
                  <div className="admin-ligne-titre">{reward.label}</div>
                  <div className="admin-ligne-meta">
                    Seuil : {reward.cost_points} {unit}
                  </div>
                </div>
              </div>
            ) : (
              <p className="admin-vide">Aucune récompense configurée.</p>
            )}
          </section>

          <section className="card">
            <h2 className="admin-titre-2">Caisses</h2>
            <p className="admin-note">
              Téléphones autorisés à scanner les cartes de ce commerçant.
            </p>
            {devices.map((d) => (
              <div key={d.id} className="admin-ligne">
                <div>
                  <div className="admin-ligne-titre">{d.label}</div>
                  <div className="admin-ligne-meta">
                    Appairée le {new Date(d.created_at).toLocaleDateString("fr-FR")}
                  </div>
                </div>
              </div>
            ))}
            {devices.length === 0 && <p className="admin-vide">Aucune caisse appairée.</p>}
          </section>

          <section className="card admin-table admin-pleine">
            <div className="admin-table-tete">
              <h2 className="admin-titre-2">Derniers clients</h2>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Prénom ou email"
                aria-label="Filtrer les clients"
                className="field-input field-input--sm admin-recherche"
              />
            </div>
            <div className="admin-defile">
              <div className="table-head admin-cols-clients">
                <div>Client</div>
                <div>Email</div>
                <div className="admin-droite">{isVisits ? "Passages" : "Points"}</div>
                <div className="admin-droite">Dernière activité</div>
              </div>
              {filteredClients.map((c) => (
                <div key={c.id} className="table-row admin-cols-clients">
                  <div className="admin-nom">{c.first_name}</div>
                  <div className="admin-slug">{c.email}</div>
                  <div className="admin-droite mono">{c.points}</div>
                  <div className="admin-droite mono">
                    {new Date(c.updated_at).toLocaleString("fr-FR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              ))}
            </div>
            {filteredClients.length === 0 && (
              <div className="admin-vide">
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
