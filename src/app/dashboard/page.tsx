"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import type * as Row from "@/lib/types";
import { Button, Field, Logo, PoweredByBadge } from "@/components/ui";
import WalletPreview from "@/components/WalletPreview";
import { separerRecompense, texteRecompense } from "@/lib/wallet/rewardText";
import "./dashboard.css";

// Dérivés du modèle plutôt que redéclarés : chaque alias dit exactement quelles
// colonnes la requête ramène, et une colonne renommée en base casse ici à la
// compilation au lieu de rendre `undefined` à l'exécution.
type Customer = Pick<Row.Customer, "id" | "first_name" | "email" | "points" | "updated_at">;
type Reward = Row.Reward;
type Device = Pick<Row.Device, "id" | "label" | "created_at">;

/** Une journée de la frise : la date et ce qui s'y est compté. */
type Journee = { date: Date; n: number };

/** Un accusé de réception : ce qui vient de se passer, et si ça a tenu. */
type Recu = { texte: string; echec?: boolean };

/**
 * Le sommaire est rangé par fréquence d'usage, pas par importance : ce qu'on
 * lit tous les matins, ce qu'on fait de temps en temps, ce qu'on règle une
 * fois. C'est la seule hiérarchie qui soit vraie pour un commerce.
 */
const SOMMAIRE = [
  {
    zone: "Aujourd'hui",
    liens: [
      { href: "#registre", label: "Le registre" },
      { href: "#clients", label: "Mes clients" },
    ],
  },
  {
    zone: "Faire",
    liens: [
      { href: "#promo", label: "Envoyer une promo" },
      { href: "#inscription", label: "Le QR du comptoir" },
    ],
  },
  {
    zone: "Réglages",
    liens: [
      { href: "#carte", label: "Ma carte" },
      { href: "#recompense", label: "La récompense" },
      { href: "#caisses", label: "Mes caisses" },
    ],
  },
] as const;

const LETTRES_JOUR = ["D", "L", "M", "M", "J", "V", "S"] as const;

const JOURS_FRISE = 14;

const STATUTS: Record<string, { classe: string; label: string }> = {
  active: { classe: "cpt-statut--actif", label: "Abonnement actif" },
  trialing: { classe: "cpt-statut--essai", label: "Période d'essai" },
  past_due: { classe: "cpt-statut--retard", label: "Paiement en retard" },
};

function Statut({ status }: { status: string }) {
  const s = STATUTS[status] ?? { classe: "cpt-statut--retard", label: status };
  return <span className={`cpt-statut ${s.classe}`}>{s.label}</span>;
}

/** Minuit, il y a `recul` jours. Passe par setDate plutôt que par une
 *  soustraction de millisecondes : aux changements d'heure, un jour ne fait
 *  pas 24 h et les compteurs déborderaient d'une case. */
function minuit(recul = 0): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - recul);
  return d;
}

/**
 * La frise : quatorze jours, un tampon par jour, le rayon proportionnel au
 * nombre. L'aire exagère un peu l'écart — l'encodage par la racine serait
 * plus juste, mais sur quatorze empreintes de 26 px il écrase tout entre
 * neuf et vingt-trois passages, et la frise ne sert qu'à faire sentir le
 * rythme : le compte exact est dans l'infobulle et dans la pointe, en pied.
 * Un jour creux garde son empreinte vide, comme une case non tamponnée sur
 * le carton, et aujourd'hui est cerclé parce qu'il n'est pas encore refermé.
 */
function Frise({ jours, unite }: { jours: Journee[]; unite: string }) {
  const max = Math.max(1, ...jours.map((j) => j.n));
  const dernier = jours.length - 1;
  const jourCourt = (d: Date) =>
    d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <figure
      className="cpt-frise"
      role="img"
      aria-label={`${unite} des ${jours.length} derniers jours : ${jours
        .map((j) => `${jourCourt(j.date)}, ${j.n}`)
        .join(" ; ")}.`}
    >
      <div className="cpt-frise-grille">
        {jours.map((j, i) => {
          const estAujourdhui = i === dernier;
          const r = j.n > 0 ? Math.max(3, 17 * (j.n / max)) : 0;
          return (
            <div
              key={j.date.toISOString()}
              className="cpt-frise-cellule"
              title={`${jourCourt(j.date)} — ${j.n} ${unite}`}
            >
              <svg viewBox="0 0 40 40" aria-hidden="true" focusable="false">
                {j.n === 0 && !estAujourdhui && (
                  <circle className="cpt-tampon-vide" cx="20" cy="20" r="6" />
                )}
                {j.n > 0 && (
                  <circle
                    className="cpt-tampon"
                    cx="20"
                    cy="20"
                    r={r}
                    style={{ animationDelay: `${i * 24}ms` }}
                  />
                )}
                {estAujourdhui && <circle className="cpt-tampon-jour" cx="20" cy="20" r="18.4" />}
              </svg>
              <span
                className={`cpt-frise-jour${estAujourdhui ? " cpt-frise-jour--auj" : ""}`}
                aria-hidden="true"
              >
                {LETTRES_JOUR[j.date.getDay()]}
              </span>
            </div>
          );
        })}
      </div>
    </figure>
  );
}

function Releve({ label, valeur, appoint }: { label: string; valeur: string; appoint: string }) {
  return (
    <div>
      <div className="cpt-releve-lib">{label}</div>
      <div className="cpt-releve-val">{valeur}</div>
      <div className="cpt-releve-app">{appoint}</div>
    </div>
  );
}

/**
 * Dashboard commerçant : config du programme, carte, promo, caisses,
 * récompenses, clients. Lectures/écritures simples via Supabase (RLS
 * cloisonne au merchant du gérant) ; promo et appairage passent par
 * les API routes qui portent la logique métier (push, anti-spam).
 */
export default function DashboardPage() {
  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  const [merchant, setMerchant] = useState<Row.Merchant | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [reward, setReward] = useState<Reward | null>(null);
  const [rewardLabel, setRewardLabel] = useState("");
  const [rewardCost, setRewardCost] = useState("");
  const [savingReward, setSavingReward] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const [themes, setThemes] = useState<Row.CardTheme[]>([]);

  const [totalCards, setTotalCards] = useState(0);
  const [cardsThisMonth, setCardsThisMonth] = useState(0);
  const [txThisMonth, setTxThisMonth] = useState(0);
  const [txToday, setTxToday] = useState(0);
  const [jours, setJours] = useState<Journee[]>([]);
  const [promosThisWeek, setPromosThisWeek] = useState(0);

  const [name, setName] = useState("");
  const [themeId, setThemeId] = useState("marine");
  const [address, setAddress] = useState("");
  const [savingCard, setSavingCard] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [promoText, setPromoText] = useState("");
  const [sendingPromo, setSendingPromo] = useState(false);

  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [codeLeft, setCodeLeft] = useState(600);

  const [search, setSearch] = useState("");
  const [recu, setRecu] = useState<Recu | null>(null);
  const recuTimer = useRef<any>(null);
  const [previewPlatform, setPreviewPlatform] = useState<"apple" | "google">("apple");
  const [framed, setFramed] = useState(false);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);

  const [inscriptionUrl, setInscriptionUrl] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    (async () => {
      const { data: m } = await supabase.from("merchants").select("*").single();
      setMerchant(m);
      if (!m) return;
      setName(m.name);
      setThemeId(m.theme_id);
      setAddress(m.address ?? "");

      const debutJour = minuit();
      const debutFrise = minuit(JOURS_FRISE - 1);
      const debutMois = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
      // Une seule lecture des transactions couvre le mois ET la frise : au
      // début d'un mois c'est la frise qui remonte le plus loin, à la fin
      // c'est le mois. On prend la borne la plus ancienne des deux.
      const depuis = new Date(Math.min(debutFrise.getTime(), debutMois.getTime())).toISOString();

      const [
        { data: c },
        { data: r },
        { data: d },
        { data: th },
        { count: total },
        { count: newThisMonth },
        { data: earnRows },
        { count: promoWeek },
      ] = await Promise.all([
        supabase
          .from("customers")
          .select("id,first_name,email,points,updated_at")
          .order("updated_at", { ascending: false })
          .limit(20),
        supabase.from("rewards").select("*").eq("active", true).maybeSingle(),
        supabase
          .from("devices")
          .select("id,label,created_at")
          .is("revoked_at", null)
          .order("created_at"),
        supabase.from("card_themes").select("*").order("sort_order"),
        supabase.from("customers").select("*", { count: "exact", head: true }),
        supabase
          .from("customers")
          .select("*", { count: "exact", head: true })
          .gte("created_at", debutMois.toISOString()),
        supabase
          .from("transactions")
          .select("delta, created_at")
          .eq("type", "earn")
          .gte("created_at", depuis),
        supabase.from("promos").select("*", { count: "exact", head: true }).gte("sent_at", weekAgo),
      ]);

      setCustomers(c ?? []);
      setReward(r);
      setRewardLabel(r?.label ?? "");
      setRewardCost(r ? String(r.cost_points) : "");
      setDevices(d ?? []);
      setThemes(th ?? []);
      setTotalCards(total ?? 0);
      setCardsThisMonth(newThisMonth ?? 0);

      // Un « passage » se compte à la ligne, un point se somme.
      const rows = earnRows ?? [];
      const countEarn = (list: { delta: number }[]) =>
        m.program_type === "points" ? list.reduce((sum, row) => sum + row.delta, 0) : list.length;
      const entre = (debut: number, fin: number) =>
        rows.filter((row) => {
          const t = new Date(row.created_at).getTime();
          return t >= debut && t < fin;
        });

      const demain = Date.now() + 24 * 3600 * 1000;
      setTxThisMonth(countEarn(entre(debutMois.getTime(), demain)));
      setTxToday(countEarn(entre(debutJour.getTime(), demain)));
      setJours(
        Array.from({ length: JOURS_FRISE }, (_, i) => {
          const debut = minuit(JOURS_FRISE - 1 - i);
          const fin = minuit(JOURS_FRISE - 2 - i);
          return { date: debut, n: countEarn(entre(debut.getTime(), fin.getTime())) };
        })
      );
      setPromosThisWeek(promoWeek ?? 0);
    })();
  }, [session]);

  useEffect(() => {
    if (!pairingCode) return;
    const timer = setInterval(() => {
      setCodeLeft((left) => {
        if (left <= 1) {
          setPairingCode(null);
          return 600;
        }
        return left - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [pairingCode]);

  useEffect(() => {
    if (!merchant) return;
    let cancelled = false;
    const url = `${window.location.origin}/m/${merchant.slug}/inscription`;
    setInscriptionUrl(url);
    import("qrcode")
      .then((QR) => QR.toDataURL(url, { width: 1200 }))
      .then((d) => !cancelled && setQrDataUrl(d))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merchant?.slug]);

  function downloadQr() {
    if (!qrDataUrl || !merchant) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `fidelo-${merchant.slug}-qr.png`;
    a.click();
  }

  function accuser(texte: string, echec = false) {
    clearTimeout(recuTimer.current);
    setRecu({ texte, echec });
    recuTimer.current = setTimeout(() => setRecu(null), echec ? 5000 : 2800);
  }

  async function login() {
    setAuthError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setAuthError(error.message);
  }

  async function saveCard() {
    if (!session || !merchant) return;
    setSavingCard(true);
    const res = await fetch("/api/dashboard/profile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ name, themeId, address }),
    });
    setSavingCard(false);
    if (!res.ok) {
      accuser(await res.text(), true);
      return;
    }
    const data = await res.json();
    setMerchant(data.merchant);
    accuser("Carte enregistrée — vos clients la verront à leur prochain passage");
  }

  async function uploadLogo(file: File) {
    if (!session) return;
    // Aperçu instantané du fichier choisi, avant même la fin de l'upload —
    // l'aperçu de carte ne doit pas attendre l'aller-retour serveur.
    setLogoPreviewUrl(URL.createObjectURL(file));
    setUploadingLogo(true);
    const form = new FormData();
    form.append("logo", file);
    const res = await fetch("/api/dashboard/logo", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: form,
    });
    setUploadingLogo(false);
    if (!res.ok) {
      accuser(await res.text(), true);
      return;
    }
    const data = await res.json();
    setMerchant((m) => (m ? { ...m, logo_url: data.logoUrl } : m));
    setLogoPreviewUrl((url) => {
      if (url) URL.revokeObjectURL(url);
      return null;
    });
    accuser(
      data.warning ?? "Logo mis à jour — vos clients le verront à leur prochain passage",
      Boolean(data.warning)
    );
  }

  const promoMaxed = promosThisWeek >= 3;
  const promoEmpty = promoText.trim().length === 0;

  async function sendPromo() {
    if (!session || promoMaxed || promoEmpty) return;
    setSendingPromo(true);
    const res = await fetch("/api/dashboard/promo", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ title: null, message: promoText.trim() }),
    });
    setSendingPromo(false);
    if (!res.ok) {
      accuser(await res.text(), true);
      return;
    }
    setPromoText("");
    setPromosThisWeek((n) => n + 1);
    accuser(`Promo envoyée à ${totalCards} clients`);
  }

  async function genCode() {
    if (!session) return;
    const res = await fetch("/api/dashboard/pairing-code", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) {
      accuser("Impossible de générer un code — réessayez dans un instant", true);
      return;
    }
    const data = await res.json();
    setPairingCode(data.code);
    setCodeLeft(600);
  }

  async function revokeDevice(d: Device) {
    await supabase.from("devices").update({ revoked_at: new Date().toISOString() }).eq("id", d.id);
    setDevices((list) => list.filter((x) => x.id !== d.id));
    accuser(`${d.label} ne peut plus scanner vos cartes`);
  }

  /**
   * Le commerce n'a qu'une récompense : on met à jour la ligne existante, ou on
   * la crée à la première sauvegarde. L'index unique partiel en base garantit
   * qu'il ne peut jamais y en avoir deux actives.
   */
  async function saveReward() {
    if (!merchant) return;
    const label = rewardLabel.trim();
    const cost = Number(rewardCost);
    if (!label || !Number.isInteger(cost) || cost <= 0) {
      accuser("Indiquez un seuil entier positif et un libellé", true);
      return;
    }

    setSavingReward(true);
    const { data, error } = reward
      ? await supabase
          .from("rewards")
          .update({ label, cost_points: cost })
          .eq("id", reward.id)
          .select()
          .single()
      : await supabase
          .from("rewards")
          .insert({ merchant_id: merchant.id, label, cost_points: cost })
          .select()
          .single();
    setSavingReward(false);

    if (error || !data) {
      accuser("Enregistrement impossible — réessayez dans un instant", true);
      return;
    }
    setReward(data);
    accuser("Récompense enregistrée");
  }

  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) => c.first_name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
    );
  }, [customers, search]);

  /* Le filtre d'encre de la landing : il déforme le bord des tampons pour
     qu'ils gardent la trace du caoutchouc, et non celle du vecteur. */
  const encrier = (
    <svg className="cpt-defs" aria-hidden="true" focusable="false">
      <filter id="cpt-encre">
        <feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="2" seed="7" result="b" />
        <feDisplacementMap
          in="SourceGraphic"
          in2="b"
          scale="2.6"
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>
    </svg>
  );

  if (!session) {
    return (
      <div className="comptoir cpt-seuil">
        <main className="cpt-seuil-feuille">
          <div className="cpt-seuil-tete">
            <Logo height={30} />
            <span className="cpt-etiquette">Espace commerçant</span>
          </div>
          <h1 className="cpt-seuil-titre">Connexion</h1>
          <div className="cpt-pile">
            <Field
              type="email"
              label="Votre email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Field
              type="password"
              label="Mot de passe"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && login()}
            />
            <Button block onClick={login}>
              Se connecter
            </Button>
          </div>
          {authError && <p className="cpt-seuil-erreur">{authError}</p>}
          <a className="cpt-seuil-lien" href="/mot-de-passe-oublie">
            Mot de passe oublié
          </a>
        </main>
      </div>
    );
  }

  if (!merchant) {
    return (
      <div className="comptoir cpt-seuil">
        <main className="cpt-seuil-feuille">
          <div className="cpt-seuil-tete">
            <Logo height={30} />
            <span className="cpt-etiquette">Espace commerçant</span>
          </div>
          <h1 className="cpt-seuil-titre">Aucun commerce sur ce compte</h1>
          <p className="cpt-note">
            Les comptes commerçants sont créés par l&apos;équipe Fidelo. Si vous venez de recevoir
            votre invitation, contactez votre interlocuteur — il rattachera votre boutique à cette
            adresse.
          </p>
          <button className="cpt-seuil-lien" onClick={() => supabase.auth.signOut()}>
            Changer de compte
          </button>
        </main>
      </div>
    );
  }

  const isVisits = merchant.program_type === "visits";
  const unit = isVisits ? "passages" : "points";
  const theme = themes.find((t) => t.id === themeId);
  const activeTheme = theme ?? {
    bg_color: "#1A2E60",
    text_color: "#F3EFE3",
    label_color: "#F56C5A",
  };
  const previewPoints = isVisits ? Math.min(7, reward?.cost_points ?? 7) : 182;
  const previewThreshold = reward?.cost_points ?? (isVisits ? 10 : null);
  // Le texte vient du module partagé avec le générateur de pass : l'aperçu
  // affiche mot pour mot ce que le client lira sur sa carte.
  const previewSplit = separerRecompense(reward, previewPoints);
  const previewReward = texteRecompense(
    previewSplit.reachedReward,
    previewSplit.nextReward,
    previewPoints
  );
  const mm = Math.floor(codeLeft / 60),
    ss = String(codeLeft % 60).padStart(2, "0");
  const aujourdhui = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const pointe = jours.reduce<Journee | null>(
    (best, j) => (best === null || j.n > best.n ? j : best),
    null
  );

  return (
    <div className="comptoir">
      {encrier}

      <header className="cpt-barre">
        <div className="cpt-barre-inner">
          <Logo variant="symbol" height={26} />
          <span className="cpt-filet" />
          <span className="cpt-enseigne">{merchant.name}</span>
          <Statut status={merchant.subscription_status} />
          <div className="cpt-barre-fin">
            <span className="cpt-compte">{session.user.email}</span>
            <button className="cpt-sortir" onClick={() => supabase.auth.signOut()}>
              Se déconnecter
            </button>
          </div>
        </div>
      </header>

      <div className="cpt-corps">
        <nav className="cpt-nav" aria-label="Sections du tableau de bord">
          {SOMMAIRE.map((groupe) => (
            <div key={groupe.zone} className="cpt-nav-groupe">
              <span className="cpt-nav-titre">{groupe.zone}</span>
              {groupe.liens.map((l) => (
                <a key={l.href} href={l.href} className="cpt-nav-lien">
                  {l.label}
                </a>
              ))}
            </div>
          ))}
        </nav>

        <main>
          <section id="registre" className="cpt-registre">
            <div className="cpt-registre-tete">
              <h2 className="cpt-date">{aujourdhui}</h2>
            </div>

            <div className="cpt-releves">
              <Releve
                label="Aujourd'hui"
                valeur={txToday.toLocaleString("fr-FR")}
                appoint={isVisits ? "passages depuis minuit" : "points crédités depuis minuit"}
              />
              <Releve
                label="Ce mois-ci"
                valeur={txThisMonth.toLocaleString("fr-FR")}
                appoint={isVisits ? "passages depuis le 1er" : "points depuis le 1er"}
              />
              <Releve
                label="Cartes"
                valeur={totalCards.toLocaleString("fr-FR")}
                appoint={
                  cardsThisMonth > 0
                    ? `dont ${cardsThisMonth} créées ce mois`
                    : "aucune nouvelle ce mois"
                }
              />
            </div>

            <Frise jours={jours} unite={unit} />

            <div className="cpt-frise-pied">
              <span>Quatorze derniers jours</span>
              <span>
                {pointe && pointe.n > 0
                  ? `Pointe : ${pointe.n} le ${pointe.date.toLocaleDateString("fr-FR", {
                      weekday: "long",
                      day: "numeric",
                    })}`
                  : "Aucun passage sur la période"}
              </span>
            </div>
          </section>

          {/* ===== Clients ===== */}
          <section id="clients" className="cpt-panneau" style={{ marginTop: 18 }}>
            <div className="cpt-panneau-tete">
              <h2 className="cpt-panneau-titre">Mes clients</h2>
              {customers.length > 0 && (
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Chercher un prénom, un email…"
                  aria-label="Chercher un client"
                  className="cpt-saisie cpt-recherche"
                />
              )}
            </div>
            <p className="cpt-panneau-note">Les vingt clients passés le plus récemment.</p>

            {customers.length === 0 ? (
              <div className="cpt-vide">
                Personne n&apos;a encore scanné votre QR.
                <br />
                <a href="#inscription">Téléchargez-le</a> et posez-le près de la caisse.
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="cpt-vide">Aucun client ne correspond à « {search} ».</div>
            ) : (
              <div className="cpt-defile">
                <table className="cpt-table">
                  <thead>
                    <tr>
                      <th>Client</th>
                      <th>Email</th>
                      <th className="cpt-col-nombre">{isVisits ? "Passages" : "Points"}</th>
                      <th className="cpt-col-nombre">Dernier passage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClients.map((c) => (
                      <tr key={c.id}>
                        <td className="cpt-cel-prenom">{c.first_name}</td>
                        <td className="cpt-cel-terne">{c.email}</td>
                        <td className="cpt-col-nombre cpt-nombre">{c.points}</td>
                        <td className="cpt-col-nombre cpt-nombre cpt-cel-terne">
                          {new Date(c.updated_at).toLocaleString("fr-FR", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ===== FAIRE ===== */}
          <div className="cpt-zone">
            <span className="cpt-zone-titre">Faire</span>
          </div>

          <div className="cpt-duo">
            {/* ----- Promo ----- */}
            <section id="promo" className="cpt-panneau">
              <div className="cpt-panneau-tete">
                <h2 className="cpt-panneau-titre">Envoyer une promo</h2>
                <span className={`cpt-quota${promoMaxed ? " is-plein" : ""}`}>
                  {promosThisWeek}/3 cette semaine
                </span>
              </div>
              <p className="cpt-panneau-note">
                Le message s&apos;affiche sur la carte de vos {totalCards} clients, dans leur
                téléphone.
              </p>
              <label className="cpt-invisible" htmlFor="cpt-promo">
                Message de la promo
              </label>
              <textarea
                id="cpt-promo"
                rows={3}
                value={promoText}
                onChange={(e) => setPromoText(e.target.value.slice(0, 140))}
                placeholder="Ce samedi, la brioche est à −20 % dès 16 h."
                className="cpt-saisie cpt-promo-saisie"
              />
              <div className="cpt-promo-pied">
                <span className="cpt-compteur">{promoText.length}/140</span>
                <Button
                  variant="accent"
                  onClick={sendPromo}
                  disabled={promoMaxed || promoEmpty || sendingPromo}
                >
                  {sendingPromo ? "Envoi…" : "Envoyer à mes clients"}
                </Button>
              </div>
              {promoMaxed && (
                <p className="cpt-avis">
                  Trois envois par semaine, c&apos;est la limite. Le compteur repart lundi.
                </p>
              )}
            </section>

            {/* ----- QR d'inscription ----- */}
            <section id="inscription" className="cpt-panneau">
              <h2 className="cpt-panneau-titre">Le QR du comptoir</h2>
              <p className="cpt-panneau-note">
                Imprimez-le et posez-le près de la caisse. Vos clients le scannent, leur carte
                arrive dans leur téléphone.
              </p>
              <div className="cpt-feuille-rang">
                <div className="cpt-feuille">
                  {qrDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={qrDataUrl} alt="QR code d’inscription de votre boutique" />
                  ) : (
                    <div className="cpt-feuille-attente" />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 190 }}>
                  <span className="cpt-etiquette" style={{ marginBottom: 8 }}>
                    Adresse encodée
                  </span>
                  <div className="cpt-adresse-qr">{inscriptionUrl ?? "…"}</div>
                  <Button onClick={downloadQr} disabled={!qrDataUrl}>
                    Télécharger le QR
                  </Button>
                </div>
              </div>
            </section>
          </div>

          {/* ===== RÉGLAGES ===== */}
          <div className="cpt-zone">
            <span className="cpt-zone-titre">Réglages</span>
          </div>

          {/* ----- Ma carte ----- */}
          <section id="carte" className="cpt-panneau">
            <div className="cpt-panneau-tete">
              <h2 className="cpt-panneau-titre">Ma carte</h2>
              <span className="cpt-etiquette">Aperçu en direct</span>
            </div>
            <p className="cpt-panneau-note">
              C&apos;est exactement ce que vos clients voient dans leur téléphone.
            </p>

            <div className="cpt-carte-atelier">
              <div>
                <div className="cpt-bascules">
                  <Button
                    size="sm"
                    variant="secondary"
                    className={previewPlatform === "apple" ? "is-choisi" : undefined}
                    aria-pressed={previewPlatform === "apple"}
                    onClick={() => setPreviewPlatform("apple")}
                  >
                    Apple Wallet
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className={previewPlatform === "google" ? "is-choisi" : undefined}
                    aria-pressed={previewPlatform === "google"}
                    onClick={() => setPreviewPlatform("google")}
                  >
                    Google Wallet
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setFramed((f) => !f)}>
                    {framed ? "Voir la carte seule" : "Voir sur l’écran verrouillé"}
                  </Button>
                </div>
                <WalletPreview
                  platform={previewPlatform}
                  framed={framed}
                  theme={activeTheme}
                  merchantName={name || merchant.name}
                  logoUrl={logoPreviewUrl ?? merchant.logo_url}
                  programType={merchant.program_type}
                  points={previewPoints}
                  threshold={previewThreshold}
                  rewardLabel={previewReward}
                  firstName="Léa"
                />
              </div>

              <div className="cpt-pile">
                <div className="cpt-champ">
                  <label className="cpt-etiquette" htmlFor="cpt-nom">
                    Nom de l&apos;établissement
                  </label>
                  <input
                    id="cpt-nom"
                    className="cpt-saisie"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="cpt-champ">
                  <span className="cpt-etiquette">Logo</span>
                  <div className="cpt-logo-rang">
                    <div className="cpt-logo-vignette">
                      {merchant.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={merchant.logo_url} alt="" />
                      ) : (
                        (name || merchant.name).charAt(0).toUpperCase()
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={uploadingLogo}
                      onClick={() => logoInputRef.current?.click()}
                    >
                      {uploadingLogo ? "Envoi…" : "Changer le logo"}
                    </Button>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadLogo(f);
                        e.target.value = "";
                      }}
                    />
                  </div>
                  <span className="cpt-aide">
                    PNG ou JPG, 5 Mo au plus. Sert sur la carte et sur vos pages publiques.
                  </span>
                </div>

                <div className="cpt-champ">
                  <span className="cpt-etiquette">Couleur de la carte</span>
                  <div className="cpt-nuancier">
                    {themes.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        className={`cpt-teinte${t.id === themeId ? " is-choisi" : ""}`}
                        aria-label={t.label}
                        aria-pressed={t.id === themeId}
                        onClick={() => setThemeId(t.id)}
                        style={{ background: t.bg_color }}
                      />
                    ))}
                  </div>
                </div>

                <div className="cpt-champ">
                  <label className="cpt-etiquette" htmlFor="cpt-adresse">
                    Adresse du commerce
                  </label>
                  <input
                    id="cpt-adresse"
                    className="cpt-saisie"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                  <span className="cpt-aide">
                    Géocodée automatiquement. C&apos;est elle qui déclenche le rappel sur
                    l&apos;écran verrouillé, à moins de 300 m.
                  </span>
                </div>

                <div>
                  <Button onClick={saveCard} disabled={savingCard}>
                    {savingCard ? "Enregistrement…" : "Enregistrer ma carte"}
                  </Button>
                </div>
              </div>
            </div>
          </section>

          <div className="cpt-duo" style={{ marginTop: 18 }}>
            {/* ----- Récompense ----- */}
            <section id="recompense" className="cpt-panneau">
              <h2 className="cpt-panneau-titre">La récompense</h2>
              <p className="cpt-panneau-note">
                {isVisits
                  ? "Vos clients gagnent un tampon par visite. Au seuil atteint, la caisse propose la récompense et le compteur repart à zéro."
                  : "Vos clients gagnent un point par euro dépensé. Au seuil atteint, la caisse propose la récompense et le compteur repart à zéro."}
              </p>

              <div className="cpt-pile">
                <div className="cpt-champ">
                  <label className="cpt-etiquette" htmlFor="cpt-seuil">
                    Seuil en {unit}
                  </label>
                  <input
                    id="cpt-seuil"
                    type="number"
                    min={1}
                    step={1}
                    inputMode="numeric"
                    className="cpt-saisie cpt-saisie--nombre"
                    value={rewardCost}
                    onChange={(e) => setRewardCost(e.target.value)}
                    placeholder={isVisits ? "10" : "250"}
                  />
                </div>

                <div className="cpt-champ">
                  <label className="cpt-etiquette" htmlFor="cpt-libelle">
                    Ce que le client gagne
                  </label>
                  <input
                    id="cpt-libelle"
                    className="cpt-saisie"
                    value={rewardLabel}
                    onChange={(e) => setRewardLabel(e.target.value)}
                    placeholder="Un café offert"
                    maxLength={60}
                  />
                  <span className="cpt-aide">
                    {rewardLabel.trim() && Number(rewardCost) > 0
                      ? isVisits
                        ? `Sur la carte : « ${rewardLabel.trim()} » au ${rewardCost}e passage.`
                        : `Sur la carte : « ${rewardLabel.trim()} » à ${rewardCost} points.`
                      : "Renseignez un seuil et un libellé pour activer la récompense."}
                  </span>
                </div>

                <div>
                  <Button onClick={saveReward} disabled={savingReward}>
                    {savingReward ? "Enregistrement…" : "Enregistrer la récompense"}
                  </Button>
                </div>
              </div>
            </section>

            {/* ----- Caisses ----- */}
            <section id="caisses" className="cpt-panneau">
              <h2 className="cpt-panneau-titre">Mes caisses</h2>
              <p className="cpt-panneau-note">
                Les téléphones autorisés à scanner les cartes de vos clients.
              </p>

              {devices.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  {devices.map((d) => (
                    <div key={d.id} className="cpt-caisse">
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="cpt-caisse-nom">{d.label}</div>
                        <div className="cpt-caisse-date">
                          Appairé le {new Date(d.created_at).toLocaleDateString("fr-FR")}
                        </div>
                      </div>
                      <Button variant="destructive" size="sm" onClick={() => revokeDevice(d)}>
                        Retirer
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {!pairingCode ? (
                <button className="cpt-ajout" onClick={genCode}>
                  Appairer une caisse
                </button>
              ) : (
                <div className="cpt-code">
                  <div className="cpt-code-consigne">Saisissez ce code sur le téléphone</div>
                  <div className="cpt-code-valeur">{pairingCode}</div>
                  <div className="cpt-code-reste">
                    valable {mm} min {ss} s
                  </div>
                </div>
              )}

              <p className="cpt-aide" style={{ marginTop: 12, display: "block" }}>
                Sur le téléphone de caisse, ouvrez{" "}
                <a href="/scan" target="_blank" rel="noopener noreferrer">
                  fidelo.app/scan
                </a>{" "}
                et entrez le code.
              </p>
            </section>
          </div>

          <div className="cpt-pied">
            <PoweredByBadge />
          </div>
        </main>
      </div>

      {recu && (
        <div className={`cpt-recu${recu.echec ? " cpt-recu--echec" : ""}`} role="status">
          <span className="cpt-recu-marque">{recu.echec ? "Échec" : "OK"}</span>
          <span>{recu.texte}</span>
        </div>
      )}
    </div>
  );
}
