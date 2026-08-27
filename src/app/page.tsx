"use client";

import { useState } from "react";
import { Logo } from "@/components/ui";
import { IOSDevice } from "@/components/IOSFrame";
import { Reveal } from "@/components/Reveal";
import WalletPreview, { type Theme } from "@/components/WalletPreview";
import "./landing.css";

const HERO_THEME: Theme = { bg_color: "#1A2E60", text_color: "#F3EFE3", label_color: "#F56C5A" };

/** Le carton d'aujourd'hui, tenu en registre : trois constats, pas trois tuiles. */
const CONSTATS = [
  {
    ref: "01",
    titre: "Il se perd",
    desc: "Oublié dans une poche, déchiré au fond d'un sac, jamais là au moment de payer. La moitié des cartes distribuées ne reviennent jamais au comptoir.",
  },
  {
    ref: "02",
    titre: "Il ne dit rien",
    desc: "Un habitué disparaît trois semaines, et vous l'apprenez sans pouvoir rien faire. Le carton ne sait pas rappeler qu'il existe.",
  },
  {
    ref: "03",
    titre: "Le reste coûte trop cher",
    desc: "Bornes, terminaux, abonnements à paliers, réglages pensés pour des chaînes de cinquante points de vente. Pas pour une boutique.",
  },
] as const;

const GESTES = [
  {
    num: "1",
    titre: "Le client scanne au comptoir",
    desc: "Un QR posé près de la caisse. Deux informations, un bouton, et sa carte est dans son téléphone. Dix secondes.",
  },
  {
    num: "2",
    titre: "Vous scannez sa carte",
    desc: "À chaque passage, vous scannez son téléphone avec le vôtre. Le compteur monte, la récompense se rapproche.",
  },
  {
    num: "3",
    titre: "Sa carte lui fait signe",
    desc: "Quand il passe dans le quartier, sa carte s'affiche sur son écran verrouillé. Un rappel, et il pousse la porte.",
  },
] as const;

const TEMOIGNAGES = [
  {
    citation:
      "Mes habitués ont adopté ça tout de suite, et je vois enfin qui revient vraiment. Installé un mardi matin entre deux fournées.",
    nom: "Claire",
    role: "Boulangère · Annecy",
  },
  {
    citation:
      "On a doublé les inscriptions en un mois. Zéro carton à commander, zéro discussion au comptoir.",
    nom: "Marco",
    role: "Restaurateur · Lyon",
  },
  {
    citation:
      "Le rappel quand le client passe devant, c'est ce qui a tout changé. Ils reviennent pour le café sans qu'on demande rien.",
    nom: "Sofia",
    role: "Caviste · Genève",
  },
] as const;

/** Lignes du ticket : ce que l'abonnement contient, au format d'un vrai ticket. */
const TICKET = [
  { libelle: "Cartes de fidélité", valeur: "illimitées" },
  { libelle: "Rappels de proximité", valeur: "inclus" },
  { libelle: "Notifications promo", valeur: "3 / semaine" },
  { libelle: "Mise en route accompagnée", valeur: "offerte" },
  { libelle: "Matériel à acheter", valeur: "aucun" },
] as const;

const QUESTIONS = [
  {
    q: "Faut-il télécharger une application ?",
    a: "Non, jamais. La carte s'ajoute dans Apple Wallet ou Google Wallet, déjà présents sur tous les téléphones. Vos clients scannent un QR, et c'est réglé.",
  },
  {
    q: "Ai-je besoin de matériel ?",
    a: "Aucun. Votre téléphone suffit pour scanner les cartes en caisse. Pas de terminal à acheter, pas de boîtier, rien à brancher.",
  },
  {
    q: "Ça marche sur iPhone et sur Android ?",
    a: "Les deux, sans que vous ayez à y penser. Fidelo reconnaît le téléphone du client et lui propose Apple Wallet ou Google Wallet automatiquement.",
  },
  {
    q: "Combien de temps pour démarrer ?",
    a: "Une dizaine de minutes. On crée votre carte avec vous — vos couleurs, votre récompense — et vous imprimez le QR à poser sur le comptoir.",
  },
  {
    q: "Puis-je arrêter quand je veux ?",
    a: "Oui, sans engagement ni frais cachés. Vous testez quatorze jours, et vous continuez seulement si ça vous convient.",
  },
  {
    q: "Et si je n'y connais rien en informatique ?",
    a: "C'est pour vous que Fidelo a été fait. On vous accompagne à la mise en route, et au quotidien il n'y a qu'un geste : scanner la carte du client. Si vous savez encaisser, vous savez utiliser Fidelo.",
  },
] as const;

/** Aperçu de pass pour une formule, dessiné à l'encre plutôt qu'illustré. */
function ApercuFormule({ visites }: { visites: boolean }) {
  const fond = visites ? "#1A2E60" : "#3B2A7A";
  return (
    <svg viewBox="0 0 320 116" className="landing-formule-svg" role="img" aria-hidden="true">
      <rect width="320" height="116" rx="8" fill={fond} />
      <text
        x="20"
        y="32"
        fontFamily="var(--font-mono)"
        fontSize="8"
        letterSpacing="1.6"
        fill="#F56C5A"
        fontWeight="700"
      >
        {visites ? "PASSAGES" : "POINTS"}
      </text>
      <text
        x="20"
        y="76"
        fontFamily="var(--font-display)"
        fontSize="38"
        fontWeight="800"
        fill="#F3EFE3"
        letterSpacing="-1.5"
      >
        {visites ? "7 / 10" : "124"}
      </text>
      <text
        x="20"
        y="98"
        fontFamily="var(--font-mono)"
        fontSize="7.5"
        letterSpacing="1.2"
        fill="rgba(243,239,227,0.55)"
      >
        {visites ? "PLUS QUE 3 AVANT LE CAFÉ OFFERT" : "250 POINTS = UNE BOUTEILLE"}
      </text>
      <rect x="244" y="26" width="56" height="56" rx="4" fill="#F3EFE3" />
      <g transform="translate(254,36)" fill={fond}>
        <rect width="12" height="12" />
        <rect x="24" width="12" height="12" />
        <rect y="24" width="12" height="12" />
        <rect x="16" y="16" width="5" height="5" />
        <rect x="26" y="20" width="5" height="5" />
        <rect x="20" y="28" width="5" height="5" />
        <rect x="30" y="30" width="6" height="6" />
      </g>
    </svg>
  );
}

export default function LandingPage() {
  const [ouverte, setOuverte] = useState<number | null>(null);

  return (
    <div className="landing-page">
      {/* Filtre d'encre : irrégularise le bord des impressions pour qu'elles
          ressemblent à un tampon encreur et non à un cercle vectoriel. */}
      <svg
        width="0"
        height="0"
        aria-hidden="true"
        focusable="false"
        style={{ position: "absolute" }}
      >
        <filter id="landing-encre-rugueuse">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves="3"
            seed="7"
            result="bruit"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="bruit"
            scale="1.6"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </svg>

      {/* ===== En-tête ===== */}
      <header className="landing-header">
        <div className="landing-wrap landing-header-inner">
          <Logo variant="full" height={34} />
          <nav className="landing-nav">
            <a href="#gestes" className="landing-nav-link">
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
            <a href="#essai" className="landing-action landing-action--sm">
              Essayer gratuitement
            </a>
          </nav>
        </div>
      </header>

      {/* ===== Hero : le tampon tombe, la carte passe la main au téléphone ===== */}
      <section className="landing-panel">
        <div className="landing-wrap landing-hero">
          <div>
            <span className="landing-mono landing-hero-eyebrow">Fidélisez votre quartier</span>
            <h1 className="landing-display landing-h1">
              Le carton a fait son temps.
              <br />
              <span className="landing-hero-title-ink">Le téléphone prend le relais.</span>
            </h1>
            <p className="landing-lede landing-hero-lede">
              La carte de fidélité de votre commerce vit dans Apple Wallet et Google Wallet. Elle ne
              se perd pas, elle ne se déchire pas — et quand votre client passe dans la rue, elle le
              lui rappelle.
            </p>
            <div className="landing-hero-actions">
              <a href="#essai" className="landing-action">
                Essayer 14 jours
              </a>
              <a href="#gestes" className="landing-action landing-action--ghost">
                Comment ça marche
              </a>
            </div>
            <div className="landing-hero-facts">
              <span className="landing-hero-fact">Sans application</span>
              <span className="landing-hero-fact">Sans matériel</span>
              <span className="landing-hero-fact">Prêt en 10 minutes</span>
            </div>
          </div>

          <div className="landing-scene">
            {/* La carte carton : dix cases, huit déjà tamponnées à l'arrivée. */}
            <div className="landing-carton" aria-hidden="true">
              <div className="landing-carton-entete">
                <span className="landing-carton-nom">Boulangerie Martin</span>
                <span className="landing-carton-mention">Carte fidélité</span>
              </div>
              <div className="landing-carton-grille">
                {Array.from({ length: 10 }, (_, i) => {
                  const frappe = i < 8;
                  return (
                    <div key={i} className={`landing-case${frappe ? " landing-case--frappe" : ""}`}>
                      {frappe && (
                        <span
                          className="landing-case-encre"
                          style={
                            {
                              "--tilt": `${((i * 37) % 17) - 8}deg`,
                              "--retard": `${0.15 + i * 0.13}s`,
                            } as React.CSSProperties
                          }
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Puis le pass, qui reprend le même compteur. */}
            <div className="landing-telephone">
              <div className="landing-telephone-echelle">
                <IOSDevice width={402} height={874}>
                  <div className="landing-wallet">
                    <div className="landing-wallet-barre">
                      <span className="landing-wallet-rond">✕</span>
                      <span className="landing-wallet-titre">Wallet</span>
                      <span className="landing-wallet-rond">···</span>
                    </div>
                    <WalletPreview
                      theme={HERO_THEME}
                      merchantName="Boulangerie Martin"
                      programType="visits"
                      points={8}
                      threshold={10}
                      rewardLabel="Plus que 2 avant le café offert"
                      firstName="Léa"
                      platform="apple"
                    />
                    <div style={{ flex: 1 }} />
                    <div className="landing-wallet-note">
                      Présentez l&apos;écran au commerçant pour cumuler
                    </div>
                  </div>
                </IOSDevice>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Constat ===== */}
      <section className="landing-panel landing-panel--marine">
        <div className="landing-wrap">
          <div className="landing-constat-tete">
            <span className="landing-mono landing-constat-eyebrow">Le constat</span>
            <h2 className="landing-display landing-h2">
              Ce que le carton vous coûte, sans que ça se voie.
            </h2>
          </div>
          <div className="landing-registre">
            {CONSTATS.map((c, i) => (
              <Reveal key={c.ref} delay={i * 70}>
                <div className="landing-entree">
                  <span className="landing-entree-ref">{c.ref}</span>
                  <h3 className="landing-entree-titre">{c.titre}</h3>
                  <p className="landing-body">{c.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Les trois gestes ===== */}
      <section id="gestes" className="landing-panel landing-panel--papier">
        <div className="landing-wrap">
          <div className="landing-tete-centree">
            <span className="landing-mono landing-eyebrow-ink">La mise en place</span>
            <h2 className="landing-display landing-h2">Trois gestes, et c&apos;est en route.</h2>
          </div>
          <div className="landing-gestes">
            {GESTES.map((g, i) => (
              <Reveal key={g.num} delay={i * 70}>
                <div>
                  <div className="landing-geste-marque">{g.num}</div>
                  <h3 className="landing-display landing-h3 landing-geste-titre">{g.titre}</h3>
                  <p className="landing-body">{g.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Formules ===== */}
      <section id="formules" className="landing-panel">
        <div className="landing-wrap">
          <div className="landing-tete-centree">
            <span className="landing-mono landing-eyebrow-ink">Deux façons de compter</span>
            <h2 className="landing-display landing-h2">Celle qui colle à votre commerce.</h2>
          </div>
          <div className="landing-formules">
            <div className="landing-formule">
              <div>
                <span className="landing-formule-etiquette">À la visite</span>
                <h3 className="landing-formule-titre">10 passages, une récompense</h3>
                <p className="landing-body">
                  Une visite, un tampon. La carte que vos clients connaissent déjà, sans le carton.
                  Pour les boulangeries, les cafés, les restaurants.
                </p>
              </div>
              <div className="landing-formule-apercu">
                <ApercuFormule visites />
              </div>
            </div>
            <div className="landing-formule landing-formule--encre">
              <div>
                <span className="landing-formule-etiquette">Aux points</span>
                <h3 className="landing-formule-titre">1 € dépensé, 1 point</h3>
                <p className="landing-body">
                  Le seuil et la récompense sont à votre main. Pour les cavistes, les épiceries
                  fines, les primeurs — quand le panier compte autant que la visite.
                </p>
              </div>
              <div className="landing-formule-apercu">
                <ApercuFormule visites={false} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Rappel de proximité ===== */}
      <section className="landing-panel landing-panel--marine">
        <div className="landing-wrap landing-proximite">
          <div>
            <span className="landing-mono landing-constat-eyebrow">Le rappel</span>
            <h2 className="landing-display landing-h2">
              Votre vitrine,
              <br />
              dans leur poche.
            </h2>
            <p className="landing-lede" style={{ marginTop: 22 }}>
              Quand un client passe à moins de 300 mètres, sa carte s&apos;affiche seule sur son
              écran verrouillé. Pas de publicité, pas de notification à rallonge — votre nom, au
              moment où il peut encore pousser la porte.
            </p>
            <div className="landing-proximite-chiffres">
              <div>
                <div className="landing-chiffre-valeur">300 m</div>
                <div className="landing-chiffre-label">rayon de rappel</div>
              </div>
              <div>
                <div className="landing-chiffre-valeur">0</div>
                <div className="landing-chiffre-label">application installée</div>
              </div>
            </div>
          </div>
          <div className="landing-proximite-scene">
            <div className="landing-proximite-echelle">
              <IOSDevice width={402} height={874} dark>
                <div className="landing-verrou">
                  <div className="landing-verrou-date">lundi 28 juillet</div>
                  <div className="landing-verrou-heure">8:12</div>
                  <div className="landing-verrou-notif">
                    <div className="landing-verrou-icone">
                      <Logo variant="symbol" theme="white" height={20} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="landing-verrou-tete">
                        <span className="landing-verrou-app">Boulangerie Martin</span>
                        <span className="landing-verrou-quand">maintenant</span>
                      </div>
                      <div className="landing-verrou-texte">
                        Vous êtes juste à côté. Plus que 2 passages avant votre café offert.
                      </div>
                    </div>
                  </div>
                  <div style={{ flex: 1 }} />
                  <div className="landing-verrou-distance">
                    <span className="landing-pastille" />à 280 m de vous
                  </div>
                </div>
              </IOSDevice>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Témoignages ===== */}
      <section className="landing-panel landing-panel--papier">
        <div className="landing-wrap">
          <div className="landing-tete-centree">
            <span className="landing-mono landing-eyebrow-ink">Ils l&apos;ont installée</span>
            <h2 className="landing-display landing-h2">
              Des commerces comme le vôtre, à deux rues d&apos;ici.
            </h2>
          </div>
          <div className="landing-temoignages">
            {TEMOIGNAGES.map((t, i) => (
              <Reveal key={t.nom} delay={i * 70}>
                <figure className="landing-temoignage" style={{ margin: 0 }}>
                  <blockquote className="landing-temoignage-texte" style={{ margin: 0 }}>
                    {t.citation}
                  </blockquote>
                  <figcaption className="landing-signature">
                    {t.nom}
                    <span className="landing-signature-role">{t.role}</span>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Tarif : un ticket de caisse ===== */}
      <section id="tarif" className="landing-panel">
        <div className="landing-wrap">
          <div className="landing-tete-centree">
            <span className="landing-mono landing-eyebrow-ink">Le tarif</span>
            <h2 className="landing-display landing-h2">Une ligne, pas une grille.</h2>
          </div>
          <div className="landing-ticket">
            <div className="landing-ticket-tete">
              <div className="landing-ticket-enseigne">Fidelo</div>
              <div className="landing-ticket-mention">Abonnement mensuel · sans engagement</div>
            </div>
            {TICKET.map((l) => (
              <div key={l.libelle} className="landing-ligne">
                <span>{l.libelle}</span>
                <span className="landing-ligne-conduite" />
                <span className="landing-ligne-valeur">{l.valeur}</span>
              </div>
            ))}
            <div className="landing-ticket-total">
              <span className="landing-ticket-total-label">Total</span>
              <span>
                <span className="landing-ticket-montant">XX €</span>
                <span className="landing-ticket-periode">/ mois</span>
              </span>
            </div>
            <a href="#essai" className="landing-action landing-ticket-action">
              Commencer mes 14 jours
            </a>
            <div className="landing-ticket-pied">Sans carte bancaire</div>
          </div>
        </div>
      </section>

      {/* ===== Questions ===== */}
      <section className="landing-panel landing-panel--papier">
        <div className="landing-wrap">
          <div className="landing-tete-centree">
            <span className="landing-mono landing-eyebrow-ink">
              Les questions qu&apos;on nous pose
            </span>
            <h2 className="landing-display landing-h2">On vous dit tout.</h2>
          </div>
          <div className="landing-faq">
            {QUESTIONS.map((f, i) => {
              const open = ouverte === i;
              return (
                <div key={f.q} className="landing-faq-item">
                  <button
                    type="button"
                    className="landing-faq-bouton"
                    aria-expanded={open}
                    aria-controls={`faq-panneau-${i}`}
                    onClick={() => setOuverte(open ? null : i)}
                  >
                    <span>{f.q}</span>
                    <span
                      className={`landing-faq-signe${open ? " is-open" : ""}`}
                      aria-hidden="true"
                    >
                      +
                    </span>
                  </button>
                  <div
                    id={`faq-panneau-${i}`}
                    className={`landing-faq-tiroir${open ? " is-open" : ""}`}
                  >
                    <div className="landing-faq-contenu">
                      <p className="landing-body landing-faq-reponse">{f.a}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== Clôture ===== */}
      <section id="essai" className="landing-panel landing-panel--marine">
        <div className="landing-wrap landing-cloture">
          <h2 className="landing-display landing-h2 landing-cloture-titre">
            Vos clients ont déjà tout dans leur poche.
          </h2>
          <p className="landing-lede landing-cloture-lede">
            Ajoutez-y leur fidélité. Dix minutes, aucun matériel, et le carton part au recyclage.
          </p>
          <a href="mailto:bonjour@fidelo.app" className="landing-action">
            Essayer 14 jours gratuitement
          </a>
          <div className="landing-cloture-logo">
            <Logo variant="full" theme="white" height={40} />
          </div>
        </div>
      </section>

      {/* ===== Pied ===== */}
      <footer className="landing-pied">
        <div className="landing-wrap landing-pied-inner">
          <Logo variant="symbol" theme="white" height={22} />
          <span className="landing-pied-mention">© 2026 Fidelo · Fabriqué à Lyon</span>
          <div className="landing-pied-liens">
            <a href="#" className="landing-pied-lien">
              Mentions légales
            </a>
            <a href="#" className="landing-pied-lien">
              Confidentialité
            </a>
            <a href="mailto:bonjour@fidelo.app" className="landing-pied-lien">
              bonjour@fidelo.app
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
