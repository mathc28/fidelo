"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { Button, Field, Logo, SubscriptionBadge, Badge, PoweredByBadge } from "@/components/ui";
import WalletPreview from "@/components/WalletPreview";

type Merchant = {
  id: string;
  name: string;
  slug: string;
  program_type: "visits" | "points";
  subscription_status: string;
  theme_id: string;
  address: string | null;
  logo_url: string | null;
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
type CardTheme = {
  id: string;
  label: string;
  bg_color: string;
  text_color: string;
  label_color: string;
  sort_order: number;
  is_light: boolean;
};

const NAV = [
  { href: "#stats", label: "Vue d'ensemble" },
  { href: "#carte", label: "Ma carte" },
  { href: "#inscription", label: "QR d'inscription" },
  { href: "#promo", label: "Promos" },
  { href: "#caisses", label: "Mes caisses" },
  { href: "#recompenses", label: "Récompenses" },
  { href: "#clients", label: "Clients" },
];

function initials(name: string): string {
  const words = name.trim().split(/\s+/);
  return words.length > 1
    ? (words[0][0] + words[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
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

  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [themes, setThemes] = useState<CardTheme[]>([]);

  const [totalCards, setTotalCards] = useState(0);
  const [cardsThisMonth, setCardsThisMonth] = useState(0);
  const [txThisMonth, setTxThisMonth] = useState(0);
  const [promosThisMonth, setPromosThisMonth] = useState(0);
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
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<any>(null);
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

      const startOfMonth = new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        1
      ).toISOString();
      const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

      const [
        { data: c },
        { data: r },
        { data: d },
        { data: th },
        { count: total },
        { count: newThisMonth },
        { data: earnRows },
        { count: promoMonth },
        { count: promoWeek },
      ] = await Promise.all([
        supabase
          .from("customers")
          .select("id,first_name,email,points,updated_at")
          .order("updated_at", { ascending: false })
          .limit(20),
        supabase.from("rewards").select("*").order("cost_points"),
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
          .gte("created_at", startOfMonth),
        supabase
          .from("transactions")
          .select("delta")
          .eq("type", "earn")
          .gte("created_at", startOfMonth),
        supabase
          .from("promos")
          .select("*", { count: "exact", head: true })
          .gte("sent_at", startOfMonth),
        supabase.from("promos").select("*", { count: "exact", head: true }).gte("sent_at", weekAgo),
      ]);

      setCustomers(c ?? []);
      setRewards(r ?? []);
      setDevices(d ?? []);
      setThemes(th ?? []);
      setTotalCards(total ?? 0);
      setCardsThisMonth(newThisMonth ?? 0);
      setTxThisMonth(
        m.program_type === "points"
          ? (earnRows ?? []).reduce((sum, row) => sum + row.delta, 0)
          : (earnRows ?? []).length
      );
      setPromosThisMonth(promoMonth ?? 0);
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

  function showToast(msg: string) {
    clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
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
      showToast(`❌ ${await res.text()}`);
      return;
    }
    const data = await res.json();
    setMerchant(data.merchant);
    showToast("Carte enregistrée — vos clients la verront à leur prochain passage");
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
      showToast(`❌ ${await res.text()}`);
      return;
    }
    const data = await res.json();
    setMerchant((m) => (m ? { ...m, logo_url: data.logoUrl } : m));
    setLogoPreviewUrl((url) => {
      if (url) URL.revokeObjectURL(url);
      return null;
    });
    showToast(
      data.warning
        ? `⚠️ ${data.warning}`
        : "Logo mis à jour — vos clients le verront à leur prochain passage"
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
      showToast(`❌ ${await res.text()}`);
      return;
    }
    setPromoText("");
    setPromosThisWeek((n) => n + 1);
    setPromosThisMonth((n) => n + 1);
    showToast(`Promo envoyée à ${totalCards} clients 🎉`);
  }

  async function genCode() {
    if (!session) return;
    const res = await fetch("/api/dashboard/pairing-code", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) return;
    const data = await res.json();
    setPairingCode(data.code);
    setCodeLeft(600);
  }

  async function revokeDevice(d: Device) {
    await supabase.from("devices").update({ revoked_at: new Date().toISOString() }).eq("id", d.id);
    setDevices((list) => list.filter((x) => x.id !== d.id));
    showToast(`${d.label} révoqué`);
  }

  async function toggleReward(r: Reward) {
    await supabase.from("rewards").update({ active: !r.active }).eq("id", r.id);
    setRewards((list) => list.map((x) => (x.id === r.id ? { ...x, active: !x.active } : x)));
  }

  async function addReward() {
    if (!merchant) return;
    const maxCost = Math.max(0, ...rewards.map((r) => r.cost_points));
    const cost = maxCost + (merchant.program_type === "points" ? 250 : 10);
    const { data } = await supabase
      .from("rewards")
      .insert({
        merchant_id: merchant.id,
        label: "Nouvelle récompense — à personnaliser",
        cost_points: cost,
      })
      .select()
      .single();
    if (data) setRewards((list) => [...list, data]);
    showToast("Palier ajouté — pensez à le personnaliser");
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
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <Logo height={34} />
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "var(--color-coral-hover)",
              background: "var(--color-cream)",
              borderRadius: 999,
              padding: "4px 10px",
              letterSpacing: ".05em",
            }}
          >
            ESPACE COMMERÇANT
          </span>
        </div>
        <h1 style={{ fontSize: 22, margin: "0 0 18px" }}>Connexion</h1>
        <Field
          type="email"
          placeholder="Votre email"
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
        <p style={{ color: "var(--color-text-secondary)", fontSize: 13, marginTop: 12 }}>
          <a href="/mot-de-passe-oublie" style={{ color: "var(--color-marine)", fontWeight: 600 }}>
            Mot de passe oublié ?
          </a>
        </p>
      </main>
    );
  }

  if (!merchant) {
    return (
      <main style={{ maxWidth: 560, margin: "0 auto", padding: "80px 20px" }}>
        <p style={{ color: "var(--color-text-secondary)" }}>
          Aucun commerce associé à ce compte. Les comptes commerçants sont créés par l’équipe de la
          plateforme (back-office /admin) — si vous venez de recevoir votre invitation, contactez
          votre interlocuteur.
        </p>
      </main>
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
  const bestReward = rewards
    .filter((r) => r.active)
    .sort((a, b) => a.cost_points - b.cost_points)[0];
  const previewPoints = isVisits
    ? bestReward?.cost_points
      ? Math.min(7, bestReward.cost_points)
      : 7
    : 182;
  const previewThreshold = isVisits ? (bestReward?.cost_points ?? 10) : null;
  const previewReward = bestReward
    ? `${bestReward.label} au ${bestReward.cost_points}e ${unit}`
    : undefined;
  const mm = Math.floor(codeLeft / 60),
    ss = String(codeLeft % 60).padStart(2, "0");
  const greeting = (session.user.email as string).split("@")[0];

  return (
    <div style={{ minHeight: "100vh" }}>
      <header
        style={{
          background: "#fff",
          borderBottom: "1px solid var(--color-border)",
          padding: "0 32px",
          height: 64,
          display: "flex",
          alignItems: "center",
          gap: 16,
          position: "sticky",
          top: 0,
          zIndex: 20,
        }}
      >
        <Logo variant="symbol" height={28} />
        <div style={{ width: 1, height: 24, background: "var(--color-border)" }} />
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 19 }}>
            {merchant.name}
          </span>
          <SubscriptionBadge status={merchant.subscription_status} />
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
            Bonjour, {greeting.charAt(0).toUpperCase() + greeting.slice(1)}
          </span>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "var(--color-cream)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            {initials(merchant.name)}
          </div>
          <Button variant="ghost" size="sm" onClick={() => supabase.auth.signOut()}>
            Se déconnecter
          </Button>
        </div>
      </header>

      <div
        style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 32px", display: "flex", gap: 24 }}
      >
        <nav
          style={{
            width: 200,
            flex: "none",
            padding: "24px 0",
            display: "flex",
            flexDirection: "column",
            gap: 2,
            position: "sticky",
            top: 88,
            alignSelf: "flex-start",
          }}
        >
          {NAV.map((n, i) => (
            <a key={n.href} href={n.href} className={`sidebar-link ${i === 0 ? "is-active" : ""}`}>
              {n.label}
            </a>
          ))}
        </nav>

        <main style={{ flex: 1, minWidth: 0 }}>
          {/* ===== Stats ===== */}
          <div
            id="stats"
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
                {totalCards.toLocaleString("fr-FR")}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--color-success)",
                  fontWeight: 700,
                  marginTop: 8,
                }}
              >
                +{cardsThisMonth} ce mois
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
                {txThisMonth.toLocaleString("fr-FR")}
              </div>
              <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 8 }}>
                ce mois-ci
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
                {promosThisMonth}
              </div>
              <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 8 }}>
                ce mois-ci
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
                Répartition iOS / Android
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 24, fontWeight: 800 }}>68 %</span>
                <span
                  style={{ fontSize: 13, color: "var(--color-text-secondary)", fontWeight: 600 }}
                >
                  / 32 %
                </span>
              </div>
              <div
                style={{ display: "flex", height: 8, borderRadius: 99, overflow: "hidden", gap: 2 }}
              >
                <div
                  style={{ width: "68%", background: "var(--color-marine)", borderRadius: 99 }}
                />
                <div style={{ flex: 1, background: "var(--color-coral)", borderRadius: 99 }} />
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 14,
                  marginTop: 8,
                  fontSize: 11,
                  color: "var(--color-text-secondary)",
                  fontWeight: 600,
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: "var(--color-marine)",
                    }}
                  />
                  Apple Wallet
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: "var(--color-coral)",
                    }}
                  />
                  Google Wallet
                </span>
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 20,
              alignItems: "start",
            }}
          >
            {/* ===== Ma carte ===== */}
            <section id="carte" className="card" style={{ padding: "24px 26px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  marginBottom: 4,
                }}
              >
                <h2 style={{ fontSize: 20 }}>Ma carte</h2>
                <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                  aperçu en direct
                </span>
              </div>
              <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 18px" }}>
                C’est la carte que vos clients voient dans leur téléphone.
              </p>
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                <div style={{ flex: "none" }}>
                  <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                    <Button
                      size="sm"
                      variant={previewPlatform === "apple" ? "primary" : "secondary"}
                      onClick={() => setPreviewPlatform("apple")}
                    >
                      Apple Wallet
                    </Button>
                    <Button
                      size="sm"
                      variant={previewPlatform === "google" ? "primary" : "secondary"}
                      onClick={() => setPreviewPlatform("google")}
                    >
                      Google Wallet
                    </Button>
                  </div>
                  <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
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

                <div
                  style={{
                    flex: 1,
                    minWidth: 220,
                    display: "flex",
                    flexDirection: "column",
                    gap: 18,
                  }}
                >
                  <div>
                    <label className="field-label">Nom de l’établissement</label>
                    <input
                      className="field-input"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Logo</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          flex: "none",
                          borderRadius: "var(--radius-md)",
                          overflow: "hidden",
                          background: "var(--color-cream)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700,
                          fontSize: 14,
                        }}
                      >
                        {merchant.logo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={merchant.logo_url}
                            alt=""
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
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
                    <div
                      style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 6 }}
                    >
                      PNG ou JPG, 5 Mo max. Utilisé sur la carte wallet et vos pages publiques.
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
                      Thème de la carte
                    </div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      {themes.map((t) => (
                        <button
                          key={t.id}
                          className="color-swatch"
                          title={t.label}
                          onClick={() => setThemeId(t.id)}
                          style={{
                            background: t.bg_color,
                            boxShadow:
                              t.id === themeId
                                ? `0 0 0 3px #fff, 0 0 0 6px ${t.bg_color}`
                                : "0 0 0 1px rgba(0,0,0,.08)",
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="field-label">Adresse du commerce</label>
                    <input
                      className="field-input"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 12,
                        color: "var(--color-success)",
                        fontWeight: 600,
                        marginTop: 6,
                      }}
                    >
                      <span>✓</span>
                      <span style={{ color: "var(--color-text-secondary)", fontWeight: 500 }}>
                        Géocodée automatiquement — la carte s’affiche à moins de 300 m
                      </span>
                    </div>
                  </div>
                  <Button
                    onClick={saveCard}
                    disabled={savingCard}
                    style={{ alignSelf: "flex-start" }}
                  >
                    {savingCard ? "Enregistrement…" : "Enregistrer ma carte"}
                  </Button>
                </div>
              </div>
            </section>

            {/* ===== QR d'inscription ===== */}
            <section id="inscription" className="card" style={{ padding: "24px 26px" }}>
              <h2 style={{ fontSize: 20, marginBottom: 4 }}>Mon QR code d’inscription</h2>
              <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 16px" }}>
                À poser sur le comptoir : vos clients le scannent pour recevoir leur carte de
                fidélité.
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
                <div
                  style={{
                    width: 180,
                    height: 180,
                    flex: "none",
                    borderRadius: "var(--radius-md)",
                    background: "#fff",
                    border: "1px solid var(--color-border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {qrDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={qrDataUrl}
                      alt="QR code d’inscription"
                      style={{ width: 160, height: 160 }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 160,
                        height: 160,
                        borderRadius: 8,
                        background: "var(--color-surface)",
                      }}
                    />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div
                    style={{
                      fontSize: 13,
                      color: "var(--color-text-secondary)",
                      marginBottom: 14,
                      wordBreak: "break-all",
                    }}
                  >
                    {inscriptionUrl ?? "…"}
                  </div>
                  <Button onClick={downloadQr} disabled={!qrDataUrl}>
                    Télécharger le QR
                  </Button>
                </div>
              </div>
            </section>

            {/* ===== Promo ===== */}
            <section
              id="promo"
              className="card"
              style={{ padding: "24px 26px", display: "flex", flexDirection: "column" }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  marginBottom: 4,
                }}
              >
                <h2 style={{ fontSize: 20 }}>Envoyer une promo</h2>
                <Badge variant={promoMaxed ? "error" : "warning"}>
                  {promosThisWeek}/3 cette semaine
                </Badge>
              </div>
              <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 14px" }}>
                Notification envoyée sur la carte de vos {totalCards} clients.
              </p>
              <textarea
                rows={3}
                value={promoText}
                onChange={(e) => setPromoText(e.target.value.slice(0, 140))}
                placeholder="Ex : Ce samedi, la brioche est à −20 % dès 16 h !"
                className="field-input"
                style={{ resize: "none", lineHeight: 1.5 }}
              />
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: 12,
                }}
              >
                <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                  {promoText.length}/140 caractères
                </span>
                <Button
                  variant="accent"
                  onClick={sendPromo}
                  disabled={promoMaxed || promoEmpty || sendingPromo}
                >
                  {sendingPromo ? "Envoi…" : "Envoyer à mes clients"}
                </Button>
              </div>
              {promoMaxed && (
                <div
                  style={{
                    marginTop: 10,
                    fontSize: 12,
                    color: "var(--color-warning-text)",
                    background: "var(--color-warning-bg)",
                    borderRadius: 10,
                    padding: "9px 12px",
                  }}
                >
                  Limite atteinte — vos clients vous remercient de ne pas trop les solliciter.
                  Prochain envoi possible la semaine prochaine.
                </div>
              )}
            </section>

            {/* ===== Caisses ===== */}
            <section id="caisses" className="card" style={{ padding: "24px 26px" }}>
              <h2 style={{ fontSize: 20, marginBottom: 4 }}>Mes caisses</h2>
              <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 16px" }}>
                Les téléphones autorisés à scanner les cartes de vos clients.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
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
                    <Button variant="destructive" size="sm" onClick={() => revokeDevice(d)}>
                      Révoquer
                    </Button>
                  </div>
                ))}
              </div>
              {!pairingCode ? (
                <button className="btn-dashed" onClick={genCode}>
                  + Appairer une nouvelle caisse
                </button>
              ) : (
                <div
                  style={{
                    background: "var(--color-marine)",
                    borderRadius: "var(--radius-lg)",
                    padding: 20,
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#B9C2DC", marginBottom: 6 }}>
                    Saisissez ce code sur le téléphone de caisse
                  </div>
                  <div
                    style={{
                      fontFamily: "ui-monospace, monospace",
                      fontSize: 52,
                      fontWeight: 700,
                      color: "#fff",
                      letterSpacing: ".18em",
                    }}
                  >
                    {pairingCode}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--color-cream)", marginTop: 6 }}>
                    Valable encore{" "}
                    <strong style={{ fontWeight: 800 }}>
                      {mm} min {ss} s
                    </strong>
                  </div>
                </div>
              )}
              <p
                style={{
                  fontSize: 12,
                  color: "var(--color-text-secondary)",
                  marginTop: 12,
                  textAlign: "center",
                }}
              >
                Sur le téléphone de caisse, rendez-vous sur{" "}
                <a href="/scan" target="_blank" rel="noopener noreferrer">
                  fidelo.app/scan
                </a>{" "}
                pour saisir le code.
              </p>
            </section>

            {/* ===== Récompenses ===== */}
            <section id="recompenses" className="card" style={{ padding: "24px 26px" }}>
              <h2 style={{ fontSize: 20, marginBottom: 4 }}>Récompenses</h2>
              <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 16px" }}>
                {isVisits
                  ? "Vos clients gagnent 1 tampon par visite."
                  : "Vos clients gagnent 1 point par euro dépensé."}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                {rewards.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      border: "1px solid #F0EDE2",
                      borderRadius: "var(--radius-md)",
                      padding: "12px 16px",
                      opacity: r.active ? 1 : 0.55,
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
                        {r.cost_points}
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
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{r.label}</div>
                      <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                        {r.active ? "Palier actif" : "Désactivé"}
                      </div>
                    </div>
                    <button
                      className="switch"
                      onClick={() => toggleReward(r)}
                      style={{
                        background: r.active
                          ? "var(--color-success)"
                          : "var(--color-border-strong)",
                      }}
                    >
                      <span className="switch-knob" style={{ left: r.active ? 21 : 3 }} />
                    </button>
                  </div>
                ))}
              </div>
              <button className="btn-dashed" onClick={addReward}>
                + Ajouter un palier
              </button>
            </section>

            {/* ===== Clients ===== */}
            <section
              id="clients"
              className="card"
              style={{ padding: "24px 26px", gridColumn: "1 / -1" }}
            >
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
                  <div style={{ color: "var(--color-text-secondary)", fontSize: 13 }}>
                    {c.email}
                  </div>
                  <div style={{ fontWeight: 700 }}>{c.points}</div>
                  <div
                    style={{
                      textAlign: "right",
                      color: "var(--color-text-secondary)",
                      fontSize: 13,
                    }}
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
                  Aucun client ne correspond à « {search} »
                </div>
              )}
            </section>
          </div>
        </main>
      </div>

      <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 32px" }}>
        <PoweredByBadge />
      </div>

      {toast && (
        <div className="toast">
          <span
            style={{
              width: 22,
              height: 22,
              flex: "none",
              borderRadius: "50%",
              background: "var(--color-success)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
            }}
          >
            ✓
          </span>
          {toast}
        </div>
      )}
    </div>
  );
}
