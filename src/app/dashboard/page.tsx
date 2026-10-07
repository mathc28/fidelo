"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseBrowser";
import type * as Row from "@/lib/types";
import {
  Button,
  ConfirmButton,
  Field,
  Logo,
  PoweredByBadge,
  subscriptionStatus,
} from "@/components/ui";
import WalletPreview from "@/components/WalletPreview";
import { separerRecompense, texteRecompense } from "@/lib/wallet/rewardText";
import { EMAIL_CONTACT } from "@/lib/site";
import {
  DUREES_PROMO,
  DUREE_PROMO_DEFAUT,
  MAX_PROMOS,
  PROMO_WINDOW_MS,
  dernierJourVisible,
  finAffichage,
  prochainEnvoiPossible,
  promoActive,
  type DureePromo,
} from "@/lib/promo";
import { authErrorFr, pluriel } from "@/lib/uiText";
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
      { id: "registre", label: "Relevé du jour" },
      { id: "clients", label: "Mes clients" },
    ],
  },
  {
    zone: "Faire",
    liens: [
      { id: "promo", label: "Envoyer une promo" },
      { id: "inscription", label: "QR d'inscription" },
    ],
  },
  {
    zone: "Réglages",
    liens: [
      { id: "carte", label: "Ma carte" },
      { id: "recompense", label: "Récompense" },
      { id: "caisses", label: "Mes caisses" },
    ],
  },
] as const;

const LETTRES_JOUR = ["D", "L", "M", "M", "J", "V", "S"] as const;

const JOURS_FRISE = 14;
const DUREE_CODE = 600;

/** Le thème « Marine Fiduo » de card_themes, tant que la liste n'est pas chargée. */
const THEME_PAR_DEFAUT = { bg_color: "#1A2E60", text_color: "#F3EFE3", label_color: "#F56C5A" };

const STATUT_CLASSE = {
  success: "cpt-statut--actif",
  warning: "cpt-statut--essai",
  error: "cpt-statut--retard",
} as Record<string, string>;

function Statut({ status }: { status: string }) {
  const { variant, label } = subscriptionStatus(status);
  return <span className={`cpt-statut ${STATUT_CLASSE[variant] ?? ""}`}>{label}</span>;
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
              title={`${jourCourt(j.date)} : ${j.n} ${unite}`}
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
      <div className="stat-label">{label}</div>
      <div className="stat-value">{valeur}</div>
      <div className="stat-delta">{appoint}</div>
    </div>
  );
}

/** « +12 % par rapport aux 7 jours d'avant » : un chiffre seul ne dit pas s'il est bon. */
function ecart(recent: number, avant: number): string {
  if (avant === 0) return recent === 0 ? "rien sur quatorze jours" : "rien les 7 jours d'avant";
  const pct = Math.round(((recent - avant) / avant) * 100);
  if (pct === 0) return "autant que les 7 jours d'avant";
  return `${pct > 0 ? "+" : "−"}${Math.abs(pct)} % par rapport aux 7 jours d'avant`;
}

/**
 * Dashboard commerçant : config du programme, carte, promo, caisses,
 * récompenses, clients. Lectures/écritures simples via Supabase (RLS
 * cloisonne au merchant du gérant) ; promo et appairage passent par
 * les API routes qui portent la logique métier (push, anti-spam).
 */
export default function DashboardPage() {
  // undefined = en cours de lecture ; null = pas de session / pas de commerce.
  // Sans ce troisième état, l'écran de connexion puis « Aucun commerce »
  // clignotaient à chaque chargement.
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const [merchant, setMerchant] = useState<Row.Merchant | null | undefined>(undefined);
  const [loadError, setLoadError] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [reward, setReward] = useState<Reward | null>(null);
  const [rewardLabel, setRewardLabel] = useState("");
  const [rewardCost, setRewardCost] = useState("");
  const [rewardError, setRewardError] = useState("");
  const [savingReward, setSavingReward] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const [themes, setThemes] = useState<Row.CardTheme[]>([]);

  const [totalCards, setTotalCards] = useState(0);
  const [cardsThisMonth, setCardsThisMonth] = useState(0);
  const [txToday, setTxToday] = useState(0);
  const [jours, setJours] = useState<Journee[]>([]);
  const [promoDates, setPromoDates] = useState<string[]>([]);

  const [name, setName] = useState("");
  const [themeId, setThemeId] = useState("marine");
  const [address, setAddress] = useState("");
  const [savingCard, setSavingCard] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [promoText, setPromoText] = useState("");
  // Dernière promo envoyée : affichée tant qu'elle est visible, et comparée au
  // nouveau texte (un envoi identique ne notifie pas les iPhone).
  const [dernierePromo, setDernierePromo] = useState<{
    message: string;
    expires_at: string;
  } | null>(null);
  const [promoDuree, setPromoDuree] = useState<DureePromo>(DUREE_PROMO_DEFAUT);
  const [sendingPromo, setSendingPromo] = useState(false);

  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [codeLeft, setCodeLeft] = useState(DUREE_CODE);
  const [codeExpired, setCodeExpired] = useState(false);
  const [genPending, setGenPending] = useState(false);
  const devicesAtCode = useRef(0);

  const [search, setSearch] = useState("");
  const [recu, setRecu] = useState<Recu | null>(null);
  const recuTimer = useRef<ReturnType<typeof setTimeout>>();
  const [previewPlatform, setPreviewPlatform] = useState<"apple" | "google">("apple");
  const [framed, setFramed] = useState(false);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);

  const [inscriptionUrl, setInscriptionUrl] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrFailed, setQrFailed] = useState(false);

  const [activeSection, setActiveSection] = useState<string>("registre");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const charger = useCallback(async () => {
    setLoadError(false);
    const { data: m, error: mErr } = await supabase.from("merchants").select("*").maybeSingle();
    if (mErr) {
      setLoadError(true);
      return;
    }
    setMerchant(m);
    if (!m) return;
    setName(m.name);
    setThemeId(m.theme_id);
    setAddress(m.address ?? "");

    const debutJour = minuit();
    const debutFrise = minuit(JOURS_FRISE - 1);
    const debutMois = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const fenetrePromo = new Date(Date.now() - PROMO_WINDOW_MS).toISOString();

    const resultats = await Promise.all([
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
        .gte("created_at", debutFrise.toISOString()),
      supabase.from("promos").select("sent_at").gte("sent_at", fenetrePromo),
      supabase
        .from("promos")
        .select("message, expires_at")
        .order("sent_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ] as const);

    // Une lecture en échec ne doit pas se déguiser en état vide (« personne
    // n'a encore scanné ») : on le dit, et on propose de recommencer.
    if (resultats.some((r) => r.error)) {
      setLoadError(true);
      return;
    }
    const [
      { data: c },
      { data: r },
      { data: d },
      { data: th },
      { count: total },
      { count: newThisMonth },
      { data: earnRows },
      { data: promos },
      { data: derniere },
    ] = resultats;

    setCustomers(c ?? []);
    setReward(r);
    setRewardLabel(r?.label ?? "");
    setRewardCost(r ? String(r.cost_points) : "");
    setDevices(d ?? []);
    setThemes(th ?? []);
    setTotalCards(total ?? 0);
    setCardsThisMonth(newThisMonth ?? 0);
    setPromoDates((promos ?? []).map((p) => p.sent_at));
    setDernierePromo(derniere ?? null);

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
    setTxToday(countEarn(entre(debutJour.getTime(), demain)));
    setJours(
      Array.from({ length: JOURS_FRISE }, (_, i) => {
        const debut = minuit(JOURS_FRISE - 1 - i);
        const fin = minuit(JOURS_FRISE - 2 - i);
        return { date: debut, n: countEarn(entre(debut.getTime(), fin.getTime())) };
      })
    );
  }, []);

  useEffect(() => {
    if (session) charger();
  }, [session, charger]);

  // Compte à rebours du code d'appairage ; à l'échéance, on le dit.
  useEffect(() => {
    if (!pairingCode) return;
    const timer = setInterval(() => {
      setCodeLeft((left) => {
        if (left <= 1) {
          setPairingCode(null);
          setCodeExpired(true);
          return DUREE_CODE;
        }
        return left - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [pairingCode]);

  // Tant qu'un code est affiché, on guette l'arrivée de la nouvelle caisse
  // pour confirmer l'appairage sans que le commerçant recharge la page.
  useEffect(() => {
    if (!pairingCode) return;
    const poll = setInterval(async () => {
      const { data } = await supabase
        .from("devices")
        .select("id,label,created_at")
        .is("revoked_at", null)
        .order("created_at");
      if (data && data.length > devicesAtCode.current) {
        setDevices(data);
        setPairingCode(null);
        accuser("Caisse appairée : elle peut scanner les cartes.");
      }
    }, 4000);
    return () => clearInterval(poll);
  }, [pairingCode]);

  useEffect(() => {
    if (!merchant) return;
    let cancelled = false;
    const url = `${window.location.origin}/m/${merchant.slug}/inscription`;
    setInscriptionUrl(url);
    setQrFailed(false);
    import("qrcode")
      .then((QR) => QR.toDataURL(url, { width: 1200 }))
      .then((d) => !cancelled && setQrDataUrl(d))
      .catch(() => !cancelled && setQrFailed(true));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merchant?.slug]);

  // Sommaire : la section lue est signalée (aria-current).
  useEffect(() => {
    if (!merchant) return;
    const ids = SOMMAIRE.flatMap((g) => g.liens.map((l) => l.id));
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) setActiveSection(visible[0].target.id);
      },
      { rootMargin: "-90px 0px -60% 0px" }
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [merchant]);

  function downloadQr() {
    if (!qrDataUrl || !merchant) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `fiduo-${merchant.slug}-qr.png`;
    a.click();
  }

  /** Une confirmation s'efface seule ; un échec reste jusqu'à ce qu'on le ferme. */
  function accuser(texte: string, echec = false) {
    clearTimeout(recuTimer.current);
    setRecu({ texte, echec });
    if (!echec) recuTimer.current = setTimeout(() => setRecu(null), 3500);
  }

  async function login(e: FormEvent) {
    e.preventDefault();
    setAuthError("");
    setLoggingIn(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoggingIn(false);
    if (error) setAuthError(authErrorFr(error));
  }

  async function saveCard() {
    if (!session || !merchant) return;
    setSavingCard(true);
    try {
      const res = await fetch("/api/dashboard/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ name, themeId, address }),
      });
      if (!res.ok) {
        accuser(await res.text(), true);
        return;
      }
      const data = await res.json();
      setMerchant(data.merchant);
      accuser("Carte enregistrée. Vos clients la verront à leur prochain passage.");
    } catch {
      accuser("Pas de connexion : la carte n'a pas été enregistrée.", true);
    } finally {
      setSavingCard(false);
    }
  }

  function clearLogoPreview() {
    setLogoPreviewUrl((url) => {
      if (url) URL.revokeObjectURL(url);
      return null;
    });
  }

  async function uploadLogo(file: File) {
    if (!session) return;
    // Aperçu instantané du fichier choisi, avant même la fin de l'upload —
    // l'aperçu de carte ne doit pas attendre l'aller-retour serveur.
    clearLogoPreview();
    setLogoPreviewUrl(URL.createObjectURL(file));
    setUploadingLogo(true);
    const form = new FormData();
    form.append("logo", file);
    try {
      const res = await fetch("/api/dashboard/logo", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: form,
      });
      if (!res.ok) {
        // Le logo refusé ne doit pas rester affiché sur l'aperçu.
        clearLogoPreview();
        accuser(await res.text(), true);
        return;
      }
      const data = await res.json();
      setMerchant((m) => (m ? { ...m, logo_url: data.logoUrl } : m));
      clearLogoPreview();
      accuser(
        data.warning ?? "Logo mis à jour. Vos clients le verront à leur prochain passage.",
        Boolean(data.warning)
      );
    } catch {
      clearLogoPreview();
      accuser("Pas de connexion : le logo n'a pas été envoyé.", true);
    } finally {
      setUploadingLogo(false);
    }
  }

  const prochainEnvoi = prochainEnvoiPossible(promoDates);
  const promosRecentes = promoDates.filter(
    (d) => Date.now() - new Date(d).getTime() < PROMO_WINDOW_MS
  ).length;
  const promoMaxed = prochainEnvoi !== null;
  const promoEmpty = promoText.trim().length === 0;
  // Le message en cours sur les cartes, s'il n'a pas encore expiré.
  const promoEnCours =
    dernierePromo && promoActive(dernierePromo.expires_at) ? dernierePromo : null;
  // Identique seulement si l'ancien message est encore sur les cartes : une fois
  // retiré, le même texte redevient une nouveauté.
  const promoIdentique = !promoEmpty && promoText.trim() === promoEnCours?.message;
  const sansClients = totalCards === 0;

  async function sendPromo() {
    if (!session || promoMaxed || promoEmpty || sansClients) return;
    setSendingPromo(true);
    try {
      const res = await fetch("/api/dashboard/promo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ title: null, message: promoText.trim(), dureeJours: promoDuree }),
      });
      if (!res.ok) {
        accuser(await res.text(), true);
        return;
      }
      const data: { apple_devices_notified: number; expires_at: string } = await res.json();
      setDernierePromo({ message: promoText.trim(), expires_at: data.expires_at });
      setPromoText("");
      setPromoDates((list) => [...list, new Date().toISOString()]);
      accuser(
        `Promo envoyée, visible jusqu'au ${dernierJourVisible(data.expires_at)}. ${pluriel(data.apple_devices_notified, "iPhone prévenu", "iPhone prévenus")} ; les cartes Google Wallet se mettent à jour d'elles-mêmes.`
      );
    } catch {
      accuser("Pas de connexion : la promo n'est pas partie.", true);
    } finally {
      setSendingPromo(false);
    }
  }

  async function genCode() {
    if (!session) return;
    setGenPending(true);
    setCodeExpired(false);
    try {
      const res = await fetch("/api/dashboard/pairing-code", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      devicesAtCode.current = devices.length;
      setPairingCode(data.code);
      setCodeLeft(DUREE_CODE);
    } catch {
      accuser("Impossible de générer un code. Réessayez dans un instant.", true);
    } finally {
      setGenPending(false);
    }
  }

  async function revokeDevice(d: Device) {
    const { error } = await supabase
      .from("devices")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", d.id);
    if (error) {
      accuser(`${d.label} n'a pas pu être retirée. Réessayez.`, true);
      return;
    }
    setDevices((list) => list.filter((x) => x.id !== d.id));
    accuser(`${d.label} ne peut plus scanner vos cartes.`);
  }

  /**
   * Le commerce n'a qu'une récompense : on met à jour la ligne existante, ou on
   * la crée à la première sauvegarde. L'index unique partiel en base garantit
   * qu'il ne peut jamais y en avoir deux actives.
   */
  async function saveReward(e: FormEvent) {
    e.preventDefault();
    if (!merchant) return;
    setRewardError("");
    const label = rewardLabel.trim();
    const cost = Number(rewardCost);
    if (!Number.isInteger(cost) || cost <= 0) {
      setRewardError("Le seuil doit être un nombre entier, 1 ou plus.");
      return;
    }
    if (!label) {
      setRewardError("Indiquez ce que le client gagne.");
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
      accuser("Enregistrement impossible. Réessayez dans un instant.", true);
      return;
    }
    setReward(data);
    accuser("Récompense enregistrée.");
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

  const seuilTete = (
    <div className="cpt-seuil-tete">
      <Logo height={30} />
      <span className="cpt-etiquette">Espace commerçant</span>
    </div>
  );

  // Lecture de session ou du commerce en cours : une feuille neutre, pas un
  // écran de connexion ni un faux état vide.
  if (session === undefined || (session && merchant === undefined && !loadError)) {
    return (
      <div className="comptoir cpt-seuil" aria-busy="true">
        <main className="cpt-seuil-feuille cpt-attente">
          {seuilTete}
          <p className="cpt-note">Ouverture du registre…</p>
        </main>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="comptoir cpt-seuil">
        <main className="cpt-seuil-feuille">
          {seuilTete}
          <h1 className="cpt-seuil-titre">Connexion</h1>
          <form onSubmit={login}>
            <Field
              type="email"
              label="Votre email"
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
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button type="submit" block disabled={loggingIn || !email || !password}>
              {loggingIn ? "Connexion…" : "Se connecter"}
            </Button>
          </form>
          {authError && (
            <p className="cpt-seuil-erreur" role="alert">
              {authError}
            </p>
          )}
          <a className="cpt-seuil-lien" href="/mot-de-passe-oublie">
            Mot de passe oublié
          </a>
        </main>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="comptoir cpt-seuil">
        <main className="cpt-seuil-feuille">
          {seuilTete}
          <h1 className="cpt-seuil-titre">Le registre n&apos;a pas pu être lu</h1>
          <p className="cpt-note" role="alert">
            La connexion avec nos serveurs a échoué. Vos données sont intactes.
          </p>
          <div style={{ marginTop: 18 }}>
            <Button onClick={() => charger()}>Réessayer</Button>
          </div>
        </main>
      </div>
    );
  }

  if (!merchant) {
    return (
      <div className="comptoir cpt-seuil">
        <main className="cpt-seuil-feuille">
          {seuilTete}
          <h1 className="cpt-seuil-titre">Aucun commerce sur ce compte</h1>
          <p className="cpt-note">
            Les comptes commerçants sont créés par l&apos;équipe Fiduo. Si vous venez de recevoir
            votre invitation, contactez votre interlocuteur : il rattachera votre boutique à cette
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
  const activeTheme = theme ?? THEME_PAR_DEFAUT;
  const cardDirty =
    name !== merchant.name || themeId !== merchant.theme_id || address !== (merchant.address ?? "");
  const logoAffiche = logoPreviewUrl ?? merchant.logo_url;
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
  const septDerniers = jours.slice(-7).reduce((s, j) => s + j.n, 0);
  const septAvant = jours.slice(0, 7).reduce((s, j) => s + j.n, 0);
  const statut = subscriptionStatus(merchant.subscription_status);

  return (
    <div className="comptoir">
      {encrier}

      <header className="cpt-barre">
        <div className="cpt-barre-inner">
          <Logo variant="symbol" height={26} />
          <span className="cpt-filet" />
          <span className="cpt-enseigne">{merchant.name}</span>
          <Statut status={merchant.subscription_status} />
          {statut.variant === "error" && (
            <a
              className="cpt-regulariser"
              href={`mailto:${EMAIL_CONTACT}?subject=Mon%20abonnement`}
            >
              Régulariser le paiement
            </a>
          )}
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
                <a
                  key={l.id}
                  href={`#${l.id}`}
                  className="cpt-nav-lien"
                  aria-current={activeSection === l.id ? "location" : undefined}
                >
                  {l.label}
                </a>
              ))}
            </div>
          ))}
        </nav>

        <main>
          <section id="registre" className="cpt-registre" aria-labelledby="registre-titre">
            <div className="cpt-registre-tete">
              <h2 id="registre-titre" className="cpt-date">
                {aujourdhui}
              </h2>
            </div>

            <div className="cpt-releves">
              <Releve
                label="Aujourd'hui"
                valeur={txToday.toLocaleString("fr-FR")}
                appoint={isVisits ? "passages depuis minuit" : "points crédités depuis minuit"}
              />
              <Releve
                label="7 derniers jours"
                valeur={septDerniers.toLocaleString("fr-FR")}
                appoint={ecart(septDerniers, septAvant)}
              />
              <Releve
                label="Cartes"
                valeur={totalCards.toLocaleString("fr-FR")}
                appoint={
                  cardsThisMonth > 0
                    ? `dont ${pluriel(cardsThisMonth, "créée", "créées")} ce mois`
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
                  : `Aucun ${isVisits ? "passage" : "point"} sur la période`}
              </span>
            </div>
          </section>

          {/* ===== Clients ===== */}
          <section id="clients" className="cpt-panneau cpt-suite">
            <div className="cpt-panneau-tete">
              <h2 className="cpt-panneau-titre">Mes clients</h2>
              {customers.length > 0 && (
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={`Filtrer ces ${customers.length} clients`}
                  aria-label="Filtrer les clients affichés"
                  className="field-input field-input--sm cpt-recherche"
                />
              )}
            </div>
            <p className="cpt-panneau-note">
              Les {customers.length > 1 ? `${customers.length} clients` : "clients"} dont la carte a
              bougé le plus récemment.
            </p>

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
                      <th className="cpt-col-nombre">Dernière activité</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClients.map((c) => (
                      <tr key={c.id}>
                        <td className="cpt-cel-prenom">{c.first_name}</td>
                        <td className="cpt-cel-terne">{c.email}</td>
                        <td className="cpt-col-nombre mono">{c.points}</td>
                        <td className="cpt-col-nombre mono cpt-cel-terne">
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
                <span
                  className={`cpt-quota${promoMaxed ? " is-plein" : ""}`}
                  title="Sur les 7 derniers jours"
                >
                  {promosRecentes}/{MAX_PROMOS} sur 7 jours
                </span>
              </div>
              <p className="cpt-panneau-note">
                {sansClients
                  ? "Dès qu'un client aura sa carte, le message s'affichera dessus, dans son téléphone."
                  : `Le message s'affiche sur la carte de vos ${pluriel(totalCards, "client")}, dans leur téléphone.`}
              </p>
              {promoEnCours && (
                <p className="cpt-promo-en-cours">
                  <span className="cpt-promo-en-cours-texte">
                    En ce moment sur les cartes : « {promoEnCours.message} »
                  </span>
                  <span className="cpt-promo-en-cours-fin">
                    Visible jusqu&apos;au {dernierJourVisible(promoEnCours.expires_at)}
                  </span>
                </p>
              )}
              <label className="field-label" htmlFor="cpt-promo">
                Message
              </label>
              <textarea
                id="cpt-promo"
                rows={3}
                value={promoText}
                onChange={(e) => setPromoText(e.target.value.slice(0, 140))}
                placeholder="Ce samedi, la brioche est à −20 % dès 16 h."
                className="field-input cpt-promo-saisie"
                aria-describedby={`cpt-promo-compteur${promoIdentique ? " cpt-promo-identique" : ""}`}
              />
              <fieldset className="cpt-promo-duree">
                <legend className="field-label">Durée d&apos;affichage sur la carte</legend>
                <div className="cpt-bascules">
                  {DUREES_PROMO.map((d) => (
                    <Button
                      key={d}
                      size="sm"
                      variant="secondary"
                      className={promoDuree === d ? "is-selected" : undefined}
                      aria-pressed={promoDuree === d}
                      onClick={() => setPromoDuree(d)}
                    >
                      {pluriel(d, "jour")}
                    </Button>
                  ))}
                </div>
                <p className="cpt-promo-fin" aria-live="polite">
                  Visible jusqu&apos;au {dernierJourVisible(finAffichage(promoDuree))}
                </p>
              </fieldset>
              <div className="cpt-promo-pied">
                <span id="cpt-promo-compteur" className="cpt-compteur">
                  {promoText.length}/140
                </span>
                <ConfirmButton
                  variant="accent"
                  size="md"
                  disabled={promoMaxed || promoEmpty || sansClients || sendingPromo}
                  question={`Envoyer à ${pluriel(totalCards, "client")} ?`}
                  confirmLabel={sendingPromo ? "Envoi…" : "Envoyer"}
                  onConfirm={sendPromo}
                >
                  Envoyer à mes clients
                </ConfirmButton>
              </div>
              {/* Avertissement, pas un blocage : Android notifie quand même,
                  et le commerçant peut vouloir relancer le même message. */}
              {promoIdentique && (
                <p id="cpt-promo-identique" className="cpt-avis" role="status">
                  C&apos;est le même texte que votre promo précédente. Sur iPhone, un message
                  identique ne déclenche pas de notification : vos clients ne seront prévenus que
                  sur Android. Changez quelques mots pour prévenir tout le monde.
                </p>
              )}
              {promoMaxed && prochainEnvoi && (
                <p className="cpt-avis">
                  {MAX_PROMOS} envois sur 7 jours glissants, c&apos;est la limite. Prochain envoi
                  possible le{" "}
                  {prochainEnvoi.toLocaleDateString("fr-FR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}{" "}
                  à{" "}
                  {prochainEnvoi.toLocaleTimeString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  .
                </p>
              )}
            </section>

            {/* ----- QR d'inscription ----- */}
            <section id="inscription" className="cpt-panneau">
              <h2 className="cpt-panneau-titre">QR d&apos;inscription</h2>
              <p className="cpt-panneau-note">
                Imprimez-le et posez-le près de la caisse. Vos clients le scannent, leur carte
                arrive dans leur téléphone.
              </p>
              <div className="cpt-feuille-rang">
                <div className="cpt-feuille">
                  {qrDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={qrDataUrl} alt="QR code d’inscription de votre boutique" />
                  ) : qrFailed ? (
                    <p className="cpt-feuille-echec">QR indisponible. Rechargez la page.</p>
                  ) : (
                    <div className="cpt-feuille-attente" />
                  )}
                </div>
                <div className="cpt-feuille-infos">
                  <span className="cpt-etiquette">Adresse encodée</span>
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
                    className={previewPlatform === "apple" ? "is-selected" : undefined}
                    aria-pressed={previewPlatform === "apple"}
                    onClick={() => setPreviewPlatform("apple")}
                  >
                    Apple Wallet
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className={previewPlatform === "google" ? "is-selected" : undefined}
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
                  logoUrl={logoAffiche}
                  programType={merchant.program_type}
                  points={previewPoints}
                  threshold={previewThreshold}
                  rewardLabel={previewReward}
                  firstName="Léa"
                />
              </div>

              <div>
                <Field
                  label="Nom de l'établissement"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />

                <div className="field">
                  <span className="field-label" id="cpt-logo-label">
                    Logo
                  </span>
                  <div className="cpt-logo-rang">
                    <div className="cpt-logo-vignette">
                      {logoAffiche ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={logoAffiche} alt="" />
                      ) : (
                        (name || merchant.name).charAt(0).toUpperCase()
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={uploadingLogo}
                      aria-describedby="cpt-logo-label cpt-logo-aide"
                      onClick={() => logoInputRef.current?.click()}
                    >
                      {uploadingLogo ? "Envoi…" : "Changer le logo"}
                    </Button>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/png,image/jpeg"
                      hidden
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadLogo(f);
                        e.target.value = "";
                      }}
                    />
                  </div>
                  <div className="field-hint" id="cpt-logo-aide">
                    PNG ou JPG, 5 Mo au plus. Sert sur la carte et sur vos pages publiques.
                  </div>
                </div>

                <fieldset className="field cpt-nuancier-groupe">
                  <legend className="field-label">
                    Couleur de la carte
                    {theme && <span className="cpt-nuancier-nom"> : {theme.label}</span>}
                  </legend>
                  <div className="cpt-nuancier" role="radiogroup" aria-label="Couleur de la carte">
                    {themes.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        role="radio"
                        className={`cpt-teinte${t.id === themeId ? " is-choisi" : ""}`}
                        aria-label={t.label}
                        aria-checked={t.id === themeId}
                        title={t.label}
                        onClick={() => setThemeId(t.id)}
                        style={{ background: t.bg_color }}
                      />
                    ))}
                  </div>
                </fieldset>

                <Field
                  label="Adresse du commerce"
                  autoComplete="street-address"
                  hint="Géocodée automatiquement. La carte peut apparaître sur l'écran verrouillé de vos clients quand ils passent près de la boutique."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />

                <div className="cpt-enregistrer">
                  <Button onClick={saveCard} disabled={savingCard || !cardDirty}>
                    {savingCard ? "Enregistrement…" : "Enregistrer ma carte"}
                  </Button>
                  {cardDirty && !savingCard && (
                    <span className="cpt-modifie">Modifications non enregistrées</span>
                  )}
                </div>
              </div>
            </div>
          </section>

          <div className="cpt-duo cpt-suite">
            {/* ----- Récompense ----- */}
            <section id="recompense" className="cpt-panneau">
              <h2 className="cpt-panneau-titre">Récompense</h2>
              <p className="cpt-panneau-note">
                {isVisits
                  ? "Vos clients gagnent un tampon par visite. Au seuil atteint, la caisse propose la récompense et le compteur repart à zéro."
                  : "Vos clients gagnent un point par euro dépensé. Au seuil atteint, la caisse propose la récompense et le compteur repart à zéro."}
              </p>

              <form onSubmit={saveReward} noValidate>
                <Field
                  label={`Seuil en ${unit}`}
                  type="number"
                  min={1}
                  step={1}
                  inputMode="numeric"
                  className="field-input--number"
                  value={rewardCost}
                  onChange={(e) => setRewardCost(e.target.value)}
                  placeholder={isVisits ? "10" : "250"}
                />
                <Field
                  label="Ce que le client gagne"
                  value={rewardLabel}
                  onChange={(e) => setRewardLabel(e.target.value)}
                  placeholder="Un café offert"
                  maxLength={60}
                  error={rewardError || undefined}
                  hint={
                    rewardLabel.trim() && Number(rewardCost) > 0
                      ? isVisits
                        ? `Sur la carte : « ${rewardLabel.trim()} » au ${rewardCost}e passage.`
                        : `Sur la carte : « ${rewardLabel.trim()} » à ${rewardCost} points.`
                      : "Renseignez un seuil et un libellé pour activer la récompense."
                  }
                />
                <Button type="submit" disabled={savingReward}>
                  {savingReward ? "Enregistrement…" : "Enregistrer la récompense"}
                </Button>
              </form>
            </section>

            {/* ----- Caisses ----- */}
            <section id="caisses" className="cpt-panneau">
              <h2 className="cpt-panneau-titre">Mes caisses</h2>
              <p className="cpt-panneau-note">
                Les téléphones autorisés à scanner les cartes de vos clients.
              </p>

              {devices.length > 0 && (
                <div className="cpt-caisses">
                  {devices.map((d) => (
                    <div key={d.id} className="cpt-caisse">
                      <div className="cpt-caisse-infos">
                        <div className="cpt-caisse-nom">{d.label}</div>
                        <div className="cpt-caisse-date">
                          Appairée le {new Date(d.created_at).toLocaleDateString("fr-FR")}
                        </div>
                      </div>
                      <ConfirmButton
                        question={`Retirer « ${d.label} » ?`}
                        confirmLabel="Retirer"
                        onConfirm={() => revokeDevice(d)}
                      >
                        Retirer
                      </ConfirmButton>
                    </div>
                  ))}
                </div>
              )}

              {pairingCode ? (
                <div className="cpt-code" aria-live="polite">
                  <div className="cpt-code-consigne">Saisissez ce code sur le téléphone</div>
                  <div className="cpt-code-valeur">{pairingCode}</div>
                  <div className="cpt-code-reste">
                    valable {mm} min {ss} s · en attente de la caisse
                  </div>
                </div>
              ) : (
                <>
                  {codeExpired && (
                    <p className="cpt-avis" role="status">
                      Code expiré sans être utilisé. Générez-en un nouveau.
                    </p>
                  )}
                  <button className="cpt-ajout" onClick={genCode} disabled={genPending}>
                    {genPending
                      ? "Génération du code…"
                      : codeExpired
                        ? "Nouveau code"
                        : "Appairer une caisse"}
                  </button>
                </>
              )}

              <p className="field-hint cpt-caisses-aide">
                Sur le téléphone de caisse, ouvrez{" "}
                <a href="/scan" target="_blank" rel="noopener noreferrer">
                  fiduo.app/scan
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
        <div
          className={`cpt-recu${recu.echec ? " cpt-recu--echec" : ""}`}
          role={recu.echec ? "alert" : "status"}
        >
          <span className="cpt-recu-marque">{recu.echec ? "Échec" : "OK"}</span>
          <span className="cpt-recu-texte">{recu.texte}</span>
          {recu.echec && (
            <button className="cpt-recu-fermer" onClick={() => setRecu(null)}>
              Fermer
            </button>
          )}
        </div>
      )}
    </div>
  );
}
