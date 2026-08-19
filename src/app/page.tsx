"use client";

import { useEffect, useState } from "react";
import { Logo } from "@/components/ui";
import { IOSDevice } from "@/components/IOSFrame";
import { Reveal } from "@/components/Reveal";
import { useInView } from "@/lib/useInView";
import WalletPreview, { type Theme } from "@/components/WalletPreview";
import "./landing.css";

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
    <svg viewBox="0 0 320 120" className="landing-formula-svg">
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
    <div ref={ref} className="landing-stat">
      <div className="landing-stat-num">{target === null ? num : `${value}${suffix}`}</div>
      <div className="landing-stat-label">{label}</div>
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
    <div className="landing-page">
      {/* ===== NAV ===== */}
      <header className="landing-header">
        <div className="landing-wrap landing-header-inner">
          <Logo variant="full" height={38} />
          <div className="landing-spacer" />
          <nav className="landing-nav">
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
            <a href="#cta" className="btn btn-accent landing-btn-lift landing-nav-cta">
              Essayer gratuitement
            </a>
          </nav>
        </div>
      </header>

      {/* ===== HERO (crème) ===== */}
      <section className="landing-section--cream landing-section--overflow">
        <div className="landing-hero-blob-1" />
        <div className="landing-hero-blob-2" />
        <div className="landing-wrap landing-hero-inner">
          <div>
            <h1 className="landing-hero-title">
              Vos clients reviennent.
              <br />
              <span className="landing-hero-title-accent">Leur carte est déjà</span>
              <br />
              dans leur téléphone.
            </h1>
            <p className="landing-hero-desc">
              Fini le carton tamponné qui finit à la poubelle. La carte de fidélité de votre
              commerce vit dans Apple Wallet et Google Wallet — et rappelle à vos clients de
              repasser vous voir.
            </p>
            <div className="landing-hero-actions">
              <a href="#cta" className="btn btn-accent landing-btn-lift landing-hero-cta">
                Essayer 14 jours gratuitement
              </a>
              <a href="#marche" className="btn btn-primary landing-btn-lift landing-cta-btn">
                Comment ça marche ?
              </a>
            </div>
            <div className="landing-hero-badges">
              {["Sans appli à installer", "Sans matériel", "Prêt en 10 min"].map((label) => (
                <div key={label} className="landing-hero-badge">
                  <span className="landing-hero-badge-icon">✓</span>
                  {label}
                </div>
              ))}
            </div>
          </div>
          {/* iPhone incliné, en débord */}
          <div className="landing-hero-phone">
            <div className="landing-hero-phone-float">
              <div className="landing-hero-phone-scale">
                <IOSDevice width={402} height={874}>
                  <div className="landing-wallet-screen">
                    <div className="landing-wallet-topbar">
                      <div className="landing-wallet-icon-btn">✕</div>
                      <div className="landing-wallet-title">Wallet</div>
                      <div className="landing-wallet-icon-btn landing-wallet-icon-btn--sm">···</div>
                    </div>
                    <div className="landing-wallet-preview-wrap">
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
                    <div className="landing-spacer" />
                    <div className="landing-wallet-hint">
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
      <section className="landing-section--marine">
        <div className="landing-wrap landing-section-pad">
          <div className="landing-eyebrow landing-eyebrow--loose">Soyons honnêtes</div>
          <h2 className="landing-pains-title">
            La fidélité au comptoir, aujourd’hui, c’est compliqué.
          </h2>
          <div className="landing-pains-grid">
            {PAINS.map((p, i) => (
              <Reveal key={p.title} delay={i * 60}>
                <div className="landing-pain-card">
                  <div className="landing-pain-icon">{p.icon}</div>
                  <h3 className="landing-pain-title">{p.title}</h3>
                  <p className="landing-pain-desc">{p.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== COMMENT ÇA MARCHE (crème) ===== */}
      <section id="marche" className="landing-section--cream">
        <div className="landing-wrap landing-section-pad">
          <div className="landing-steps-header">
            <div className="landing-eyebrow">Simple, promis</div>
            <h2 className="landing-steps-title">Trois gestes, et c’est parti.</h2>
          </div>
          <div className="landing-steps-dots">
            {Array.from({ length: 10 }, (_, i) => (
              <div key={i} className={`landing-steps-dot${i < filled ? " is-filled" : ""}`}>
                {i < filled && i === filled - 1 ? "♥" : ""}
              </div>
            ))}
          </div>
          <div className="landing-steps-grid">
            {STEPS.map((s, i) => (
              <Reveal key={s.num} delay={i * 60}>
                <div className="landing-step-card">
                  <div className="landing-step-num">{s.num}</div>
                  <div className="landing-step-icon">{s.icon}</div>
                  <h3 className="landing-step-title">{s.title}</h3>
                  <p className="landing-step-desc">{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== LES 2 FORMULES (blanc) ===== */}
      <section id="formules" className="landing-section--white">
        <div className="landing-wrap landing-section-pad">
          <div className="landing-formulas-header">
            <div className="landing-eyebrow">À vous de choisir</div>
            <h2 className="landing-formulas-title">Deux façons de fidéliser.</h2>
            <p className="landing-formulas-desc">
              Celle qui colle à votre commerce. On configure tout avec vous, en direct.
            </p>
          </div>
          <div className="landing-formulas-grid">
            <div className="landing-formula-card landing-formula-card--light">
              <div>
                <div className="landing-formula-badge landing-formula-badge--dark">
                  🥖 À la visite
                </div>
                <h3 className="landing-formula-title">10 passages = récompense</h3>
                <p className="landing-formula-desc">
                  Une visite, un tampon. La carte à tampons que vos clients connaissent déjà — sans
                  le carton. Parfait pour boulangeries, cafés, restos.
                </p>
              </div>
              <div className="landing-formula-mini-wrap">
                <FormulaMiniCard isPass />
              </div>
            </div>
            <div className="landing-formula-card landing-formula-card--dark">
              <div>
                <div className="landing-formula-badge landing-formula-badge--coral">
                  🧾 Aux points
                </div>
                <h3 className="landing-formula-title">1 € dépensé = 1 point</h3>
                <p className="landing-formula-desc landing-formula-desc--light">
                  Des paliers de récompenses à votre main. Idéal caviste, épicerie fine, primeur —
                  quand le panier compte.
                </p>
              </div>
              <div className="landing-formula-mini-wrap">
                <FormulaMiniCard isPass={false} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== RAPPEL DE PROXIMITÉ (marine) ===== */}
      <section className="landing-section--marine landing-section--overflow">
        <div className="landing-proximity-blob" />
        <div className="landing-wrap landing-proximity-inner">
          <div>
            <div className="landing-eyebrow landing-eyebrow--loose">La magie de la géoloc</div>
            <h2 className="landing-proximity-title">
              Votre vitrine,
              <br />
              dans leur poche.
            </h2>
            <p className="landing-proximity-desc">
              Quand un client passe à moins de 300 m de chez vous, sa carte s’affiche toute seule
              sur son écran verrouillé. Un petit rappel, pile au bon moment. Pas d’appli, pas de pub
              — juste vous, au bon endroit.
            </p>
            <div className="landing-proximity-stats">
              <div className="landing-proximity-stat">
                <div className="landing-proximity-stat-num">300 m</div>
                <div className="landing-proximity-stat-label">rayon de rappel</div>
              </div>
              <div className="landing-proximity-stat">
                <div className="landing-proximity-stat-num">0</div>
                <div className="landing-proximity-stat-label">appli à installer</div>
              </div>
            </div>
          </div>
          <div className="landing-proximity-phone">
            <div className="landing-proximity-phone-inner">
              <div className="landing-proximity-phone-scale">
                <IOSDevice width={402} height={874} dark>
                  <div className="landing-lockscreen">
                    <div className="landing-lockscreen-time-wrap">
                      <div className="landing-lockscreen-date">lundi 28 juillet</div>
                      <div className="landing-lockscreen-clock">8:12</div>
                    </div>
                    <div className="landing-lockscreen-notif">
                      <div className="landing-lockscreen-notif-icon">
                        <Logo variant="symbol" height={26} />
                      </div>
                      <div className="landing-lockscreen-notif-body">
                        <div className="landing-lockscreen-notif-head">
                          <span className="landing-lockscreen-notif-app">Boulangerie Martin</span>
                          <span className="landing-lockscreen-notif-time">maintenant</span>
                        </div>
                        <div className="landing-lockscreen-notif-text">
                          Votre boulangerie est juste à côté ! 🥖 Plus que 3 passages avant votre
                          récompense.
                        </div>
                      </div>
                    </div>
                    <div className="landing-spacer" />
                    <div className="landing-lockscreen-distance">
                      <span className="landing-ping-dot">
                        <span className="landing-ping-dot-pulse" />
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
      <section className="landing-section--coral">
        <div className="landing-wrap landing-section-pad--tight">
          <div className="landing-testimonials-header">
            <div className="landing-eyebrow landing-eyebrow--white">Ils l’ont adoptée</div>
            <h2 className="landing-testimonials-title">
              Vos voisins de quartier
              <br />
              ne reviendraient pas en arrière.
            </h2>
          </div>
          <div className="landing-testimonials-grid">
            {TESTIMONIALS.map((t, i) => (
              <Reveal key={t.name} delay={i * 60}>
                <div className="landing-testimonial-card">
                  <div className="landing-testimonial-quote-mark">&ldquo;</div>
                  <p className="landing-testimonial-text">{t.quote}</p>
                  <div className="landing-testimonial-author">
                    <div className="landing-testimonial-avatar">{t.initial}</div>
                    <div>
                      <div className="landing-testimonial-name">{t.name}</div>
                      <div className="landing-testimonial-role">{t.role}</div>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
          <div className="landing-stats-grid">
            {STATS.map((st) => (
              <Stat key={st.label} num={st.num} label={st.label} />
            ))}
          </div>
        </div>
      </section>

      {/* ===== TARIF (crème) ===== */}
      <section id="tarif" className="landing-section--cream">
        <div className="landing-wrap landing-section-pad">
          <div className="landing-pricing-header">
            <div className="landing-eyebrow">Un seul prix, tout compris</div>
            <h2 className="landing-pricing-title">Pas de surprise, jamais.</h2>
          </div>
          <div className="landing-pricing-card">
            <div className="landing-pricing-blob" />
            <div className="landing-pricing-content">
              <div className="landing-eyebrow landing-eyebrow--tight">Abonnement Fidelo</div>
              <div className="landing-pricing-amount-row">
                <span className="landing-pricing-amount">XX €</span>
                <span className="landing-pricing-period">/ mois</span>
              </div>
              <div className="landing-pricing-subtitle">
                Cartes illimitées · rappels de proximité · promos
              </div>
              <div className="landing-pricing-includes">
                {PRICE_INCLUDES.map((i) => (
                  <div key={i.text} className="landing-pricing-include-item">
                    <span className="landing-pricing-check">✓</span>
                    {i.text}
                  </div>
                ))}
              </div>
              <a href="#cta" className="btn btn-accent landing-btn-lift landing-pricing-cta">
                Commencer mes 14 jours gratuits
              </a>
              <div className="landing-pricing-footnote">Sans carte bancaire · sans engagement</div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FAQ (blanc) ===== */}
      <section className="landing-section--white">
        <div className="landing-wrap landing-faq-wrap">
          <div className="landing-faq-header">
            <div className="landing-eyebrow">Les vraies questions</div>
            <h2 className="landing-faq-title">On vous dit tout.</h2>
          </div>
          <div className="landing-faq-list">
            {FAQS.map((f, i) => {
              const open = openFaq === i;
              return (
                <Reveal key={f.q} delay={i * 60}>
                  <div className="landing-faq-item">
                    <button
                      onClick={() => setOpenFaq(open ? null : i)}
                      className="landing-faq-question"
                    >
                      <span className="landing-faq-question-text">{f.q}</span>
                      <span className={`landing-faq-icon${open ? " is-open" : ""}`}>+</span>
                    </button>
                    <div className={`landing-faq-panel${open ? " is-open" : ""}`}>
                      <p className="landing-faq-answer">{f.a}</p>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== CTA FINAL (corail) ===== */}
      <section id="cta" className="landing-section--coral landing-section--overflow">
        <div className="landing-cta-blob-1" />
        <div className="landing-cta-blob-2" />
        <div className="landing-wrap landing-cta-inner">
          <h2 className="landing-cta-title">Vos clients ont déjà tout dans leur poche.</h2>
          <p className="landing-cta-desc">
            Ajoutez-y leur fidélité. En 10 minutes, sans matériel, sans vous prendre la tête.
          </p>
          <a
            href="mailto:bonjour@fidelo.app"
            className="btn btn-primary landing-btn-lift landing-cta-btn"
          >
            Essayer 14 jours gratuitement
          </a>
          <div className="landing-cta-logo-wrap">
            <Logo variant="full" theme="white" height={44} />
          </div>
        </div>
      </section>

      {/* ===== FOOTER (marine) ===== */}
      <footer className="landing-footer">
        <div className="landing-wrap landing-footer-inner">
          <div className="landing-footer-brand">
            <Logo variant="symbol" theme="white" height={26} />
            <span className="landing-footer-copy">© 2026 Fidelo · Fabriqué à Lyon 🦁</span>
          </div>
          <div className="landing-footer-links">
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
