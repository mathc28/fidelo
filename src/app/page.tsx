"use client";

import { useEffect, useState } from "react";
import { Logo } from "@/components/ui";
import { IOSDevice } from "@/components/IOSFrame";
import { Reveal } from "@/components/Reveal";
import { useInView } from "@/lib/useInView";
import WalletPreview, { type Theme } from "@/components/WalletPreview";

const HERO_THEME: Theme = { bg_color: "#1A2E60", text_color: "#F3EFE3", label_color: "#F56C5A" };

const PAINS = [
  {
    icon: "🗑️",
    title: "Le carton se perd",
    desc: "Oublié, déchiré, jamais sur soi au bon moment. La moitié de vos cartes finissent au fond d’un sac ou à la poubelle.",
  },
  {
    icon: "🤷",
    title: "Aucun moyen de les recontacter",
    desc: "Un client fidèle disparaît un mois ? Vous n’avez aucun moyen de lui faire signe. Il vous a peut-être juste oublié.",
  },
  {
    icon: "💸",
    title: "Les autres outils sont hors de prix",
    desc: "Bornes, abonnements à rallonge, réglages incompréhensibles… Pensés pour les chaînes, pas pour votre commerce.",
  },
] as const;

const STEPS = [
  {
    num: "1",
    icon: "🏷️",
    title: "Le client scanne au comptoir",
    desc: "Un QR posé près de la caisse. Deux infos, un bouton, sa carte est dans son téléphone. Dix secondes chrono.",
  },
  {
    num: "2",
    icon: "📲",
    title: "Vous scannez sa carte en caisse",
    desc: "À chaque passage, vous scannez son téléphone avec le vôtre. Le compteur monte, la récompense approche.",
  },
  {
    num: "3",
    icon: "📍",
    title: "Sa carte lui fait signe",
    desc: "Quand il passe dans le quartier, sa carte s’affiche sur son écran verrouillé. Un petit rappel, et il pousse la porte.",
  },
] as const;

const TESTIMONIALS = [
  {
    quote:
      "Mes habitués adorent, et je vois enfin qui revient vraiment. Installé un mardi matin entre deux fournées.",
    initial: "C",
    name: "Claire",
    role: "Boulangère · Annecy",
  },
  {
    quote:
      "On a doublé les inscriptions à la carte en un mois. Zéro carton, zéro prise de tête au comptoir.",
    initial: "M",
    name: "Marco",
    role: "Restaurateur · Lyon",
  },
  {
    quote:
      "La notif quand le client passe devant, c’est bluffant. Ils reviennent pour le café sans qu’on demande rien.",
    initial: "S",
    name: "Sofia",
    role: "Caviste · Genève",
  },
] as const;

const STATS = [
  { num: "3×", label: "de clients fidèles inscrits vs carton" },
  { num: "10 min", label: "pour tout mettre en place" },
  { num: "0 €", label: "de matériel à acheter" },
] as const;

const PRICE_INCLUDES = [
  { text: "Cartes de fidélité illimitées" },
  { text: "Rappels de proximité automatiques" },
  { text: "Notifications promo à vos clients" },
  { text: "Accompagnement à la mise en route" },
] as const;

const FAQS = [
  {
    q: "Faut-il télécharger une appli ?",
    a: "Non, jamais. La carte s’ajoute directement dans Apple Wallet ou Google Wallet, déjà présents sur tous les téléphones. Vos clients scannent un QR, et c’est réglé.",
  },
  {
    q: "Ai-je besoin de matériel ?",
    a: "Aucun. Votre téléphone suffit pour scanner les cartes en caisse. Pas de terminal à acheter, pas de boîtier, rien à brancher.",
  },
  {
    q: "Ça marche sur iPhone ET Android ?",
    a: "Les deux, sans que vous ayez à y penser. Fidelo détecte le téléphone du client et lui propose Apple Wallet ou Google Wallet automatiquement.",
  },
  {
    q: "Combien de temps pour démarrer ?",
    a: "Une dizaine de minutes. On crée votre carte avec vous — vos couleurs, votre récompense — et vous imprimez le QR à poser sur le comptoir. C’est tout.",
  },
  {
    q: "Puis-je arrêter quand je veux ?",
    a: "Oui, sans engagement ni frais cachés. Vous testez 14 jours gratuitement, et vous continuez seulement si ça vous plaît.",
  },
  {
    q: "Et si je n’y connais rien en informatique ?",
    a: "C’est justement pour vous qu’on l’a fait. On vous accompagne à la mise en route, et au quotidien il n’y a qu’un geste : scanner la carte du client. Si vous savez encaisser, vous savez utiliser Fidelo.",
  },
] as const;

/** Mini-pass statique pour une des deux formules (visites ou points). */
function FormulaMiniCard({ isPass }: { isPass: boolean }) {
  const bg = isPass ? "#1A2E60" : "#0E1A3C";
  const label = isPass ? "PASSAGES" : "POINTS";
  const val = isPass ? "7 / 10" : "124 pts";
  return (
    <svg
      viewBox="0 0 320 120"
      style={{
        width: "100%",
        height: "auto",
        display: "block",
        borderRadius: 16,
        boxShadow: "0 10px 26px rgba(26,46,96,.25)",
      }}
    >
      <rect width="320" height="120" rx="16" fill={bg} />
      <text
        x="20"
        y="34"
        fontFamily="var(--font-heading)"
        fontSize="14"
        fontWeight="700"
        fill="#F3EFE3"
      >
        Fidelo
      </text>
      <text
        x="20"
        y="62"
        fontFamily="var(--font-body)"
        fontSize="9"
        letterSpacing="1.5"
        fill="#F56C5A"
        fontWeight="700"
      >
        {label}
      </text>
      <text
        x="20"
        y="94"
        fontFamily="var(--font-heading)"
        fontSize="34"
        fontWeight="800"
        fill="#F3EFE3"
      >
        {val}
      </text>
      <rect x="236" y="30" width="60" height="60" rx="8" fill="#F3EFE3" />
      <g transform="translate(248,42)" fill={bg}>
        <rect width="14" height="14" />
        <rect x="22" width="14" height="14" />
        <rect y="22" width="14" height="14" />
        <rect x="18" y="20" width="5" height="5" />
        <rect x="30" y="28" width="6" height="6" />
        <rect x="22" y="30" width="5" height="5" />
      </g>
    </svg>
  );
}

/** Chiffre de la section "Preuve sociale", compte de 0 jusqu'à sa valeur une fois visible. */
function Stat({ num, label }: { num: string; label: string }) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const match = /^(\d+)(.*)$/.exec(num);
  const target = match ? Number(match[1]) : null;
  const suffix = match ? match[2] : "";
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView || target === null) return;
    const duration = 900;
    const start = performance.now();
    let frame: number;
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      setValue(Math.round(target * progress));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, target]);

  return (
    <div ref={ref} style={{ textAlign: "center" }}>
      <div
        style={{
          fontFamily: "var(--font-heading)",
          fontWeight: 800,
          fontSize: 52,
          lineHeight: 1,
          color: "#fff",
        }}
      >
        {target === null ? num : `${value}${suffix}`}
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", opacity: 0.9, marginTop: 6 }}>
        {label}
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [filled, setFilled] = useState(6);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    const t = setInterval(() => {
      setFilled((f) => (f >= 10 ? 3 : f + 1));
    }, 700);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      style={{
        background: "#F3EFE3",
        fontFamily: "var(--font-body), sans-serif",
        color: "#1A2E60",
      }}
    >
      {/* ===== NAV ===== */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          background: "rgba(243,239,227,.82)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(26,46,96,.08)",
        }}
      >
        <div
          className="landing-wrap"
          style={{ height: 74, display: "flex", alignItems: "center", gap: 16 }}
        >
          <Logo variant="full" height={38} />
          <div style={{ flex: 1 }} />
          <nav style={{ display: "flex", alignItems: "center", gap: 30 }}>
            <a href="#marche" className="landing-nav-link">
              Comment ça marche
            </a>
            <a href="#formules" className="landing-nav-link">
              Formules
            </a>
            <a href="#tarif" className="landing-nav-link">
              Tarif
            </a>
            <a href="/dashboard" className="landing-nav-link">
              Se connecter
            </a>
            <a
              href="#cta"
              className="btn btn-accent landing-btn-lift"
              style={{ padding: "12px 22px", fontSize: 15 }}
            >
              Essayer gratuitement
            </a>
          </nav>
        </div>
      </header>

      {/* ===== HERO (crème) ===== */}
      <section style={{ background: "#F3EFE3", position: "relative", overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            top: -120,
            right: -80,
            width: 420,
            height: 420,
            borderRadius: "50%",
            background: "rgba(245,108,90,.14)",
            filter: "blur(10px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -160,
            left: -120,
            width: 340,
            height: 340,
            borderRadius: "50%",
            background: "rgba(26,46,96,.08)",
          }}
        />
        <div
          className="landing-wrap"
          style={{
            position: "relative",
            display: "grid",
            gridTemplateColumns: "2fr 1fr",
            gap: 24,
            alignItems: "center",
            paddingTop: 72,
            paddingBottom: 96,
          }}
        >
          <div>
            <h1 style={{ fontWeight: 800, fontSize: 66, lineHeight: 0.98, marginBottom: 24 }}>
              Vos clients reviennent.
              <br />
              <span style={{ color: "#F56C5A" }}>Leur carte est déjà</span>
              <br />
              dans leur téléphone.
            </h1>
            <p
              style={{
                fontSize: 20,
                lineHeight: 1.55,
                color: "#5C6478",
                maxWidth: 480,
                margin: "0 0 34px",
                fontWeight: 500,
              }}
            >
              Fini le carton tamponné qui finit à la poubelle. La carte de fidélité de votre
              commerce vit dans Apple Wallet et Google Wallet — et rappelle à vos clients de
              repasser vous voir.
            </p>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
              <a
                href="#cta"
                className="btn btn-accent landing-btn-lift"
                style={{ fontSize: 18, padding: "20px 34px" }}
              >
                Essayer 14 jours gratuitement
              </a>
              <a
                href="#marche"
                className="landing-link-marine"
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                Voir comment ça marche →
              </a>
            </div>
            <div style={{ display: "flex", gap: 26, marginTop: 32, flexWrap: "wrap" }}>
              {["Sans appli à installer", "Sans matériel", "Prêt en 10 min"].map((label) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#1A2E60",
                  }}
                >
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: "#1A2E60",
                      color: "#F3EFE3",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                    }}
                  >
                    ✓
                  </span>
                  {label}
                </div>
              ))}
            </div>
          </div>
          {/* iPhone incliné, en débord */}
          <div style={{ position: "relative", height: 600 }}>
            <div
              style={{
                position: "absolute",
                top: -40,
                left: "50%",
                marginLeft: -201,
                animation: "landing-floaty 6s ease-in-out infinite",
              }}
            >
              <div
                style={{
                  width: 402,
                  height: 874,
                  transform: "scale(0.65)",
                  transformOrigin: "top center",
                }}
              >
                <IOSDevice width={402} height={874}>
                  <div
                    style={{
                      height: "100%",
                      background: "#DEDBD4",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <div
                      style={{
                        padding: "64px 26px 16px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: "50%",
                          background: "rgba(120,120,128,.18)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#5C6478",
                          fontSize: 16,
                        }}
                      >
                        ✕
                      </div>
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 800,
                          letterSpacing: 0.5,
                          color: "#5C6478",
                        }}
                      >
                        Wallet
                      </div>
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: "50%",
                          background: "rgba(120,120,128,.18)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#5C6478",
                          fontSize: 15,
                        }}
                      >
                        ···
                      </div>
                    </div>
                    <div
                      style={{
                        margin: "8px 18px 0",
                        display: "flex",
                        justifyContent: "center",
                        filter: "drop-shadow(0 22px 50px rgba(26,46,96,.4))",
                      }}
                    >
                      <WalletPreview
                        theme={HERO_THEME}
                        merchantName="Boulangerie Martin"
                        programType="visits"
                        points={7}
                        threshold={10}
                        rewardLabel="Plus que 3 !"
                        firstName="Léa"
                        platform="apple"
                      />
                    </div>
                    <div style={{ flex: 1 }} />
                    <div
                      style={{
                        padding: "0 26px 30px",
                        textAlign: "center",
                        color: "#8A8A8F",
                        fontSize: 14,
                        fontWeight: 600,
                      }}
                    >
                      Passe le téléphone au commerçant pour cumuler
                    </div>
                  </div>
                </IOSDevice>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== LA DOULEUR (marine) ===== */}
      <section style={{ background: "#1A2E60", color: "#fff", position: "relative" }}>
        <div className="landing-wrap" style={{ paddingTop: 90, paddingBottom: 90 }}>
          <div className="landing-eyebrow" style={{ color: "#F56C5A", marginBottom: 18 }}>
            Soyons honnêtes
          </div>
          <h2
            style={{
              fontWeight: 800,
              fontSize: 46,
              lineHeight: 1.05,
              maxWidth: 720,
              marginBottom: 52,
            }}
          >
            La fidélité au comptoir, aujourd’hui, c’est compliqué.
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24 }}>
            {PAINS.map((p, i) => (
              <Reveal key={p.title} delay={i * 60}>
                <div
                  style={{
                    background: "rgba(255,255,255,.06)",
                    border: "1px solid rgba(255,255,255,.1)",
                    borderRadius: 24,
                    padding: "32px 28px",
                  }}
                >
                  <div style={{ fontSize: 40, marginBottom: 18 }}>{p.icon}</div>
                  <h3 style={{ fontWeight: 700, fontSize: 23, color: "#fff", marginBottom: 10 }}>
                    {p.title}
                  </h3>
                  <p
                    style={{
                      fontSize: 15.5,
                      lineHeight: 1.6,
                      color: "#B9C2DC",
                      margin: 0,
                      fontWeight: 500,
                    }}
                  >
                    {p.desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== COMMENT ÇA MARCHE (crème) ===== */}
      <section id="marche" style={{ background: "#F3EFE3" }}>
        <div className="landing-wrap" style={{ paddingTop: 90, paddingBottom: 90 }}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div className="landing-eyebrow" style={{ color: "#F56C5A", marginBottom: 16 }}>
              Simple, promis
            </div>
            <h2
              style={{
                fontWeight: 800,
                fontSize: 52,
                lineHeight: 1,
                maxWidth: 640,
                margin: "0 auto",
              }}
            >
              Trois gestes, et c’est parti.
            </h2>
          </div>
          <div
            style={{ display: "flex", justifyContent: "center", gap: 12, margin: "34px 0 54px" }}
          >
            {Array.from({ length: 10 }, (_, i) => (
              <div
                key={i}
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  background: i < filled ? "#F56C5A" : "transparent",
                  border: "2px solid #1A2E60",
                  transition: "background .4s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  color: "#fff",
                }}
              >
                {i < filled && i === filled - 1 ? "♥" : ""}
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 26 }}>
            {STEPS.map((s, i) => (
              <Reveal key={s.num} delay={i * 60}>
                <div
                  style={{
                    background: "#fff",
                    borderRadius: 26,
                    padding: "34px 30px",
                    position: "relative",
                    boxShadow: "0 8px 26px rgba(26,46,96,.06)",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: -20,
                      left: 30,
                      width: 52,
                      height: 52,
                      borderRadius: "50%",
                      background: "#F56C5A",
                      color: "#fff",
                      fontFamily: "var(--font-heading)",
                      fontWeight: 800,
                      fontSize: 24,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 8px 18px rgba(245,108,90,.4)",
                    }}
                  >
                    {s.num}
                  </div>
                  <div style={{ fontSize: 38, margin: "18px 0 14px" }}>{s.icon}</div>
                  <h3 style={{ fontWeight: 700, fontSize: 22, marginBottom: 10 }}>{s.title}</h3>
                  <p
                    style={{
                      fontSize: 15.5,
                      lineHeight: 1.6,
                      color: "#5C6478",
                      margin: 0,
                      fontWeight: 500,
                    }}
                  >
                    {s.desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== LES 2 FORMULES (blanc) ===== */}
      <section id="formules" style={{ background: "#fff" }}>
        <div className="landing-wrap" style={{ paddingTop: 90, paddingBottom: 90 }}>
          <div style={{ textAlign: "center", marginBottom: 52 }}>
            <div className="landing-eyebrow" style={{ color: "#F56C5A", marginBottom: 16 }}>
              À vous de choisir
            </div>
            <h2 style={{ fontWeight: 800, fontSize: 52, lineHeight: 1, marginBottom: 14 }}>
              Deux façons de fidéliser.
            </h2>
            <p
              style={{
                fontSize: 18,
                color: "#5C6478",
                fontWeight: 500,
                maxWidth: 560,
                margin: "0 auto",
              }}
            >
              Celle qui colle à votre commerce. On configure tout avec vous, en direct.
            </p>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 28,
              maxWidth: 900,
              margin: "0 auto",
            }}
          >
            <div
              style={{
                background: "#F3EFE3",
                borderRadius: 28,
                padding: "36px 32px",
                display: "flex",
                flexDirection: "column",
                gap: 20,
              }}
            >
              <div>
                <div
                  style={{
                    display: "inline-block",
                    background: "#1A2E60",
                    color: "#fff",
                    borderRadius: 999,
                    padding: "7px 16px",
                    fontSize: 13,
                    fontWeight: 800,
                    marginBottom: 14,
                  }}
                >
                  🥖 À la visite
                </div>
                <h3 style={{ fontWeight: 800, fontSize: 30, marginBottom: 8 }}>
                  10 passages = récompense
                </h3>
                <p
                  style={{
                    fontSize: 15.5,
                    color: "#5C6478",
                    fontWeight: 500,
                    lineHeight: 1.55,
                    margin: 0,
                  }}
                >
                  Une visite, un tampon. La carte à tampons que vos clients connaissent déjà — sans
                  le carton. Parfait pour boulangeries, cafés, restos.
                </p>
              </div>
              <div style={{ marginTop: "auto" }}>
                <FormulaMiniCard isPass />
              </div>
            </div>
            <div
              style={{
                background: "#1A2E60",
                borderRadius: 28,
                padding: "36px 32px",
                display: "flex",
                flexDirection: "column",
                gap: 20,
                color: "#fff",
              }}
            >
              <div>
                <div
                  style={{
                    display: "inline-block",
                    background: "#F56C5A",
                    color: "#fff",
                    borderRadius: 999,
                    padding: "7px 16px",
                    fontSize: 13,
                    fontWeight: 800,
                    marginBottom: 14,
                  }}
                >
                  🧾 Aux points
                </div>
                <h3 style={{ fontWeight: 800, fontSize: 30, marginBottom: 8, color: "#fff" }}>
                  1 € dépensé = 1 point
                </h3>
                <p
                  style={{
                    fontSize: 15.5,
                    color: "#B9C2DC",
                    fontWeight: 500,
                    lineHeight: 1.55,
                    margin: 0,
                  }}
                >
                  Des paliers de récompenses à votre main. Idéal caviste, épicerie fine, primeur —
                  quand le panier compte.
                </p>
              </div>
              <div style={{ marginTop: "auto" }}>
                <FormulaMiniCard isPass={false} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== RAPPEL DE PROXIMITÉ (marine) ===== */}
      <section
        style={{ background: "#1A2E60", color: "#fff", overflow: "hidden", position: "relative" }}
      >
        <div
          style={{
            position: "absolute",
            top: -100,
            right: -60,
            width: 360,
            height: 360,
            borderRadius: "50%",
            background: "rgba(245,108,90,.12)",
          }}
        />
        <div
          className="landing-wrap"
          style={{
            position: "relative",
            display: "grid",
            gridTemplateColumns: "1fr .8fr",
            gap: 40,
            alignItems: "center",
            paddingTop: 90,
            paddingBottom: 90,
          }}
        >
          <div>
            <div className="landing-eyebrow" style={{ color: "#F56C5A", marginBottom: 18 }}>
              La magie de la géoloc
            </div>
            <h2 style={{ fontWeight: 800, fontSize: 56, lineHeight: 1, marginBottom: 22 }}>
              Votre vitrine,
              <br />
              dans leur poche.
            </h2>
            <p
              style={{
                fontSize: 19,
                lineHeight: 1.55,
                color: "#B9C2DC",
                fontWeight: 500,
                maxWidth: 460,
                margin: "0 0 28px",
              }}
            >
              Quand un client passe à moins de 300 m de chez vous, sa carte s’affiche toute seule
              sur son écran verrouillé. Un petit rappel, pile au bon moment. Pas d’appli, pas de pub
              — juste vous, au bon endroit.
            </p>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <div
                style={{
                  background: "rgba(255,255,255,.08)",
                  borderRadius: 16,
                  padding: "16px 22px",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-heading)",
                    fontWeight: 800,
                    fontSize: 30,
                    color: "#F56C5A",
                  }}
                >
                  300 m
                </div>
                <div style={{ fontSize: 13, color: "#B9C2DC", fontWeight: 600 }}>
                  rayon de rappel
                </div>
              </div>
              <div
                style={{
                  background: "rgba(255,255,255,.08)",
                  borderRadius: 16,
                  padding: "16px 22px",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-heading)",
                    fontWeight: 800,
                    fontSize: 30,
                    color: "#F56C5A",
                  }}
                >
                  0
                </div>
                <div style={{ fontSize: 13, color: "#B9C2DC", fontWeight: 600 }}>
                  appli à installer
                </div>
              </div>
            </div>
          </div>
          <div
            style={{ display: "flex", justifyContent: "center", position: "relative", height: 560 }}
          >
            <div style={{ position: "absolute", top: -30 }}>
              <div
                style={{
                  width: 402,
                  height: 874,
                  transform: "scale(.72)",
                  transformOrigin: "top center",
                }}
              >
                <IOSDevice width={402} height={874} dark>
                  <div
                    style={{
                      height: "100%",
                      background: "linear-gradient(165deg,#24346B 0%,#0E1A3C 60%,#1A2E60 100%)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      position: "relative",
                    }}
                  >
                    <div style={{ marginTop: 120, textAlign: "center", color: "#fff" }}>
                      <div
                        style={{ fontSize: 22, fontWeight: 600, opacity: 0.85, letterSpacing: 0.5 }}
                      >
                        lundi 28 juillet
                      </div>
                      <div
                        style={{
                          fontSize: 96,
                          fontWeight: 700,
                          lineHeight: 1,
                          letterSpacing: -2,
                          marginTop: 2,
                        }}
                      >
                        8:12
                      </div>
                    </div>
                    <div
                      style={{
                        marginTop: 56,
                        width: 340,
                        background: "rgba(255,255,255,.16)",
                        backdropFilter: "blur(20px)",
                        borderRadius: 24,
                        padding: "16px 18px",
                        display: "flex",
                        gap: 14,
                        alignItems: "flex-start",
                        animation: "landing-slidein .8s ease-out",
                        boxShadow: "0 12px 40px rgba(0,0,0,.3)",
                      }}
                    >
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          flex: "none",
                          borderRadius: 12,
                          background: "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Logo variant="symbol" height={26} />
                      </div>
                      <div style={{ flex: 1, color: "#fff" }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "baseline",
                          }}
                        >
                          <span style={{ fontWeight: 800, fontSize: 15 }}>Boulangerie Martin</span>
                          <span style={{ fontSize: 12, opacity: 0.7 }}>maintenant</span>
                        </div>
                        <div
                          style={{ fontSize: 14.5, lineHeight: 1.4, marginTop: 3, fontWeight: 500 }}
                        >
                          Votre boulangerie est juste à côté ! 🥖 Plus que 3 passages avant votre
                          récompense.
                        </div>
                      </div>
                    </div>
                    <div style={{ flex: 1 }} />
                    <div
                      style={{
                        marginBottom: 40,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        color: "rgba(255,255,255,.6)",
                        fontSize: 14,
                        fontWeight: 600,
                      }}
                    >
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: "#F56C5A",
                          position: "relative",
                        }}
                      >
                        <span
                          style={{
                            position: "absolute",
                            inset: 0,
                            borderRadius: "50%",
                            background: "#F56C5A",
                            animation: "landing-ping 1.8s ease-out infinite",
                          }}
                        />
                      </span>
                      à 280 m de vous
                    </div>
                  </div>
                </IOSDevice>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== PREUVE SOCIALE (corail) ===== */}
      <section style={{ background: "#F56C5A", color: "#fff" }}>
        <div className="landing-wrap" style={{ paddingTop: 84, paddingBottom: 84 }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div
              className="landing-eyebrow"
              style={{ color: "#fff", opacity: 0.85, marginBottom: 14 }}
            >
              Ils l’ont adoptée
            </div>
            <h2 style={{ fontWeight: 800, fontSize: 48, lineHeight: 1, color: "#fff" }}>
              Vos voisins de quartier
              <br />
              ne reviendraient pas en arrière.
            </h2>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3,1fr)",
              gap: 22,
              marginBottom: 52,
            }}
          >
            {TESTIMONIALS.map((t, i) => (
              <Reveal key={t.name} delay={i * 60}>
                <div
                  style={{
                    background: "#fff",
                    borderRadius: 24,
                    padding: "30px 28px",
                    color: "#1A2E60",
                  }}
                >
                  <div
                    style={{
                      fontSize: 34,
                      color: "#F56C5A",
                      lineHeight: 0.6,
                      fontFamily: "var(--font-heading)",
                      fontWeight: 800,
                    }}
                  >
                    &ldquo;
                  </div>
                  <p
                    style={{
                      fontSize: 16,
                      lineHeight: 1.55,
                      fontWeight: 600,
                      margin: "8px 0 22px",
                    }}
                  >
                    {t.quote}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                      style={{
                        width: 46,
                        height: 46,
                        borderRadius: "50%",
                        background: "#F3EFE3",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: "var(--font-heading)",
                        fontWeight: 800,
                        fontSize: 18,
                      }}
                    >
                      {t.initial}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 15 }}>{t.name}</div>
                      <div style={{ fontSize: 13, color: "#5C6478", fontWeight: 600 }}>
                        {t.role}
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3,1fr)",
              gap: 20,
              borderTop: "1px solid rgba(255,255,255,.3)",
              paddingTop: 40,
            }}
          >
            {STATS.map((st) => (
              <Stat key={st.label} num={st.num} label={st.label} />
            ))}
          </div>
        </div>
      </section>

      {/* ===== TARIF (crème) ===== */}
      <section id="tarif" style={{ background: "#F3EFE3" }}>
        <div className="landing-wrap" style={{ paddingTop: 90, paddingBottom: 90 }}>
          <div style={{ textAlign: "center", marginBottom: 44 }}>
            <div className="landing-eyebrow" style={{ color: "#F56C5A", marginBottom: 16 }}>
              Un seul prix, tout compris
            </div>
            <h2 style={{ fontWeight: 800, fontSize: 52, lineHeight: 1 }}>
              Pas de surprise, jamais.
            </h2>
          </div>
          <div
            style={{
              maxWidth: 460,
              margin: "0 auto",
              background: "#1A2E60",
              borderRadius: 32,
              padding: "44px 40px",
              color: "#fff",
              position: "relative",
              overflow: "hidden",
              boxShadow: "0 24px 60px rgba(26,46,96,.3)",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -60,
                right: -40,
                width: 200,
                height: 200,
                borderRadius: "50%",
                background: "rgba(245,108,90,.2)",
              }}
            />
            <div style={{ position: "relative" }}>
              <div className="landing-eyebrow" style={{ color: "#F56C5A", marginBottom: 10 }}>
                Abonnement Fidelo
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
                <span
                  style={{
                    fontFamily: "var(--font-heading)",
                    fontWeight: 800,
                    fontSize: 74,
                    lineHeight: 0.9,
                  }}
                >
                  XX €
                </span>
                <span style={{ fontSize: 18, color: "#B9C2DC", fontWeight: 700 }}>/ mois</span>
              </div>
              <div style={{ fontSize: 16, color: "#B9C2DC", fontWeight: 600, marginBottom: 26 }}>
                Cartes illimitées · rappels de proximité · promos
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 30 }}>
                {PRICE_INCLUDES.map((i) => (
                  <div
                    key={i.text}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      fontSize: 16,
                      fontWeight: 600,
                    }}
                  >
                    <span
                      style={{
                        width: 24,
                        height: 24,
                        flex: "none",
                        borderRadius: "50%",
                        background: "#F56C5A",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 13,
                      }}
                    >
                      ✓
                    </span>
                    {i.text}
                  </div>
                ))}
              </div>
              <a
                href="#cta"
                className="btn btn-accent landing-btn-lift"
                style={{ width: "100%", justifyContent: "center", fontSize: 18 }}
              >
                Commencer mes 14 jours gratuits
              </a>
              <div
                style={{
                  textAlign: "center",
                  fontSize: 13,
                  color: "#8A93B5",
                  fontWeight: 600,
                  marginTop: 14,
                }}
              >
                Sans carte bancaire · sans engagement
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FAQ (blanc) ===== */}
      <section style={{ background: "#fff" }}>
        <div className="landing-wrap" style={{ paddingTop: 90, paddingBottom: 90, maxWidth: 760 }}>
          <div style={{ textAlign: "center", marginBottom: 44 }}>
            <div className="landing-eyebrow" style={{ color: "#F56C5A", marginBottom: 16 }}>
              Les vraies questions
            </div>
            <h2 style={{ fontWeight: 800, fontSize: 48, lineHeight: 1 }}>On vous dit tout.</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {FAQS.map((f, i) => {
              const open = openFaq === i;
              return (
                <Reveal key={f.q} delay={i * 60}>
                  <div
                    style={{
                      background: "#F3EFE3",
                      borderRadius: 20,
                      overflow: "hidden",
                      transition: "background .2s",
                    }}
                  >
                    <button
                      onClick={() => setOpenFaq(open ? null : i)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: "22px 26px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 16,
                        fontFamily: "var(--font-body), sans-serif",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "var(--font-heading)",
                          fontWeight: 700,
                          fontSize: 19,
                          color: "#1A2E60",
                        }}
                      >
                        {f.q}
                      </span>
                      <span
                        style={{
                          width: 32,
                          height: 32,
                          flex: "none",
                          borderRadius: "50%",
                          background: open ? "#F56C5A" : "rgba(26,46,96,.1)",
                          color: open ? "#fff" : "#1A2E60",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 18,
                          fontWeight: 700,
                          transition: "transform .25s ease",
                          transform: open ? "rotate(45deg)" : "rotate(0deg)",
                        }}
                      >
                        +
                      </span>
                    </button>
                    <div
                      style={{
                        maxHeight: open ? 200 : 0,
                        overflow: "hidden",
                        transition: "max-height .3s ease",
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          padding: "0 26px 24px",
                          fontSize: 16,
                          lineHeight: 1.6,
                          color: "#5C6478",
                          fontWeight: 500,
                        }}
                      >
                        {f.a}
                      </p>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== CTA FINAL (corail) ===== */}
      <section
        id="cta"
        style={{ background: "#F56C5A", color: "#fff", position: "relative", overflow: "hidden" }}
      >
        <div
          style={{
            position: "absolute",
            bottom: -140,
            left: -80,
            width: 360,
            height: 360,
            borderRadius: "50%",
            background: "rgba(255,255,255,.12)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: -100,
            right: -60,
            width: 280,
            height: 280,
            borderRadius: "50%",
            background: "rgba(26,46,96,.18)",
          }}
        />
        <div
          className="landing-wrap"
          style={{ position: "relative", textAlign: "center", paddingTop: 100, paddingBottom: 100 }}
        >
          <h2
            style={{
              fontWeight: 800,
              fontSize: 60,
              lineHeight: 1,
              color: "#fff",
              maxWidth: 760,
              margin: "0 auto 22px",
            }}
          >
            Vos clients ont déjà tout dans leur poche.
          </h2>
          <p
            style={{
              fontSize: 20,
              color: "rgba(255,255,255,.92)",
              fontWeight: 500,
              maxWidth: 520,
              margin: "0 auto 38px",
            }}
          >
            Ajoutez-y leur fidélité. En 10 minutes, sans matériel, sans vous prendre la tête.
          </p>
          <a
            href="mailto:bonjour@fidelo.app"
            className="btn btn-primary landing-btn-lift"
            style={{
              fontSize: 19,
              padding: "22px 40px",
              boxShadow: "0 16px 40px rgba(26,46,96,.35)",
            }}
          >
            Essayer 14 jours gratuitement
          </a>
          <div style={{ marginTop: 44, display: "flex", justifyContent: "center", opacity: 0.95 }}>
            <Logo variant="full" theme="white" height={44} />
          </div>
        </div>
      </section>

      {/* ===== FOOTER (marine) ===== */}
      <footer style={{ background: "#1A2E60", color: "#fff" }}>
        <div
          className="landing-wrap"
          style={{
            paddingTop: 44,
            paddingBottom: 30,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 24,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Logo variant="symbol" theme="white" height={26} />
            <span style={{ fontSize: 14, color: "#8A93B5", fontWeight: 600 }}>
              © 2026 Fidelo · Fabriqué à Lyon 🦁
            </span>
          </div>
          <div style={{ display: "flex", gap: 26, fontSize: 14, fontWeight: 600 }}>
            <a href="#" className="landing-footer-link">
              Mentions légales
            </a>
            <a href="#" className="landing-footer-link">
              Confidentialité
            </a>
            <a href="mailto:bonjour@fidelo.app" className="landing-footer-link">
              bonjour@fidelo.app
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
