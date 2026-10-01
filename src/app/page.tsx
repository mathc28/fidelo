"use client";

import { useState } from "react";
import { Logo } from "@/components/ui";
import { IOSDevice } from "@/components/IOSFrame";
import { Reveal } from "@/components/Reveal";
import WalletPreview, { type Theme } from "@/components/WalletPreview";
import { MAX_PROMOS } from "@/lib/promo";
import { CONTACT, CTA } from "@/lib/site";
import { SiteHeader, SiteFooter } from "@/components/SiteChrome";
import "./landing.css";

const HERO_THEME: Theme = { bg_color: "#1A2E60", text_color: "#F3EFE3", label_color: "#F56C5A" };

/** Le carton d'aujourd'hui, tenu en registre : trois constats, pas trois tuiles. */
const CONSTATS = [
  {
    ref: "01",
    titre: "Il se perd",
    desc: "Oublié dans une poche, déchiré au fond d'un sac, jamais là au moment de payer. Combien de vos cartons sont revenus complets l'an dernier ?",
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

/** Deux gestes seulement : le troisième (le rappel) a sa propre section. */
const GESTES = [
  {
    num: "1",
    titre: "Le client scanne au comptoir",
    desc: "Un QR posé près de la caisse. Son prénom, son email, un bouton : sa carte est dans son téléphone. Dix secondes.",
  },
  {
    num: "2",
    titre: "Vous scannez sa carte",
    desc: "À chaque passage, vous scannez son téléphone avec le vôtre. Le compteur monte, la récompense se rapproche.",
  },
] as const;

/** Lignes du ticket : ce que l'abonnement contient, au format d'un vrai ticket. */
const TICKET = [
  { libelle: "Cartes de fidélité", valeur: "illimitées" },
  { libelle: "Rappels de proximité", valeur: "inclus" },
  { libelle: "Notifications promo", valeur: `${MAX_PROMOS} / 7 jours` },
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
    a: "Les deux, sans que vous ayez à y penser. Fiduo reconnaît le téléphone du client et lui propose Apple Wallet ou Google Wallet automatiquement.",
  },
  {
    q: "Combien de temps pour démarrer ?",
    a: "Une dizaine de minutes. On crée votre carte avec vous, à vos couleurs et avec votre récompense, puis vous imprimez le QR à poser sur le comptoir.",
  },
  {
    q: "Puis-je arrêter quand je veux ?",
    a: "Oui, sans engagement ni frais cachés. Vous testez quatorze jours, et vous continuez seulement si ça vous convient.",
  },
  {
    q: "Et si je n'y connais rien en informatique ?",
    a: "C'est pour vous que Fiduo a été fait. On vous accompagne à la mise en route, et au quotidien il n'y a qu'un geste : scanner la carte du client. Si vous savez encaisser, vous savez utiliser Fiduo.",
  },
] as const;

/**
 * Aperçu de pass pour une formule. Tout l'habillage (couleurs, fontes, corps)
 * vit dans landing.css : la variante se joue sur une classe, pas sur des
 * attributs calculés ici — sinon les teintes du SVG dérivent des tokens.
 */
function ApercuFormule({ visites }: { visites: boolean }) {
  return (
    <svg
      viewBox="0 0 320 116"
      className={`landing-formule-svg${visites ? "" : " landing-formule-svg--foret"}`}
      aria-hidden="true"
    >
      <rect className="landing-formule-fond" width="320" height="116" rx="10" />
      <text className="landing-formule-etiq" x="20" y="32">
        {visites ? "PASSAGES" : "POINTS"}
      </text>
      <text className="landing-formule-valeur" x="20" y="76">
        {visites ? "7 / 10" : "124"}
      </text>
      <text className="landing-formule-note" x="20" y="98">
        {visites ? "PLUS QUE 3 AVANT LE CAFÉ OFFERT" : "250 POINTS = UNE BOUTEILLE"}
      </text>
      <rect className="landing-formule-qr-fond" x="244" y="26" width="56" height="56" rx="3" />
      <g className="landing-formule-qr" transform="translate(254,36)">
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
      <svg width="0" height="0" aria-hidden="true" focusable="false" className="landing-filtres">
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

      <SiteHeader />

      {/* ===== Hero : le tampon tombe, la carte passe la main au téléphone ===== */}
      <section className="landing-panel">
        <div className="landing-wrap landing-hero">
          <div>
            <h1 className="landing-display landing-h1">
              <span className="landing-hero-titre-bloc">Le carton a fait son temps.</span>{" "}
              <span className="landing-hero-titre-bloc landing-hero-titre-suite">
                Le téléphone prend le relais.
              </span>
            </h1>
            <p className="landing-lede landing-hero-lede">
              La carte de fidélité de votre commerce vit dans Apple Wallet et Google Wallet. Elle ne
              se perd pas, elle ne se déchire pas, et quand votre client passe dans la rue, elle le
              lui rappelle.
            </p>
            <div className="landing-hero-actions">
              <a href={CONTACT} className="landing-action">
                {CTA}
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

          <div className="landing-scene" aria-hidden="true">
            {/* La carte carton : dix cases, huit déjà tamponnées à l'arrivée. */}
            <div className="landing-carton">
              <div className="landing-carton-entete">
                <span className="landing-carton-nom">Boulangerie Martin</span>
                <span className="landing-carton-mention">Carte fidélité</span>
              </div>
              <div className="landing-carton-grille">
                {Array.from({ length: 10 }, (_, i) => {
                  const frappe = i < 8;
                  // Le dernier tampon posé est un cœur, comme sur la carte du logo.
                  const coeur = i === 7;
                  return (
                    <div key={i} className={`landing-case${frappe ? " landing-case--frappe" : ""}`}>
                      {frappe && (
                        <span
                          className={`landing-case-encre${coeur ? " landing-case-encre--coeur" : ""}`}
                          style={
                            {
                              "--tilt": `${((i * 37) % 17) - 8}deg`,
                              "--retard": `${0.1 + i * 0.08}s`,
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
                      rewardLabel="Plus que 2 avant : Un café offert"
                      firstName="Léa"
                      platform="apple"
                    />
                    <div className="landing-cale" />
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

      {/* ===== Rappel de proximité : ce que le carton ne fera jamais ===== */}
      <section className="landing-panel landing-panel--marine">
        <div className="landing-wrap landing-proximite">
          <div>
            <h2 className="landing-display landing-h2">
              Votre vitrine,
              <br />
              dans leur poche.
            </h2>
            <p className="landing-lede landing-proximite-lede">
              Quand un client passe près de votre boutique, sa carte s&apos;affiche seule sur son
              écran verrouillé. Pas de publicité, pas de notification à rallonge : votre nom, au
              moment où il peut encore pousser la porte.
            </p>
          </div>
          <div className="landing-proximite-scene" aria-hidden="true">
            <div className="landing-proximite-echelle">
              <IOSDevice width={402} height={874} dark lockScreen>
                <div className="landing-verrou">
                  <div className="landing-verrou-date">lundi 28 juillet</div>
                  <div className="landing-verrou-heure">8:12</div>
                  {/* Le texte exact que porte le pass (applePass.ts, relevantText). */}
                  <div className="landing-verrou-notif">
                    <div className="landing-verrou-icone">
                      <Logo variant="symbol" theme="white" height={20} />
                    </div>
                    <div className="landing-verrou-corps">
                      <div className="landing-verrou-tete">
                        <span className="landing-verrou-app">Wallet</span>
                        <span className="landing-verrou-quand">maintenant</span>
                      </div>
                      <div className="landing-verrou-texte">
                        Boulangerie Martin est juste à côté — votre carte est prête !
                      </div>
                    </div>
                  </div>
                </div>
              </IOSDevice>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Constat ===== */}
      <section className="landing-panel landing-panel--papier">
        <div className="landing-wrap">
          <div className="landing-tete">
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

      {/* ===== Les deux gestes ===== */}
      <section id="gestes" className="landing-panel landing-panel--marine">
        <div className="landing-wrap">
          <div className="landing-tete">
            <h2 className="landing-display landing-h2">Deux gestes, et c&apos;est en route.</h2>
          </div>
          <div className="landing-gestes">
            {GESTES.map((g, i) => (
              <Reveal key={g.num} delay={i * 70}>
                <div className="landing-geste">
                  <div className="landing-geste-marque" aria-hidden="true">
                    {g.num}
                  </div>
                  <div>
                    <h3 className="landing-display landing-h3 landing-geste-titre">{g.titre}</h3>
                    <p className="landing-body">{g.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Formules ===== */}
      <section id="formules" className="landing-panel landing-panel--papier">
        <div className="landing-wrap">
          <div className="landing-tete">
            <h2 className="landing-display landing-h2">Deux façons de compter.</h2>
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
            <div className="landing-formule landing-formule--marine">
              <div>
                <span className="landing-formule-etiquette">Aux points</span>
                <h3 className="landing-formule-titre">1 € dépensé, 1 point</h3>
                <p className="landing-body">
                  Le seuil et la récompense sont à votre main. Pour les cavistes, les épiceries
                  fines, les primeurs : quand le panier compte autant que la visite.
                </p>
              </div>
              <div className="landing-formule-apercu">
                <ApercuFormule visites={false} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Tarif : un ticket de caisse ===== */}
      <section id="tarif" className="landing-panel landing-panel--marine">
        <div className="landing-wrap">
          <div className="landing-tete">
            <span className="landing-mono landing-eyebrow">Le tarif</span>
            <h2 className="landing-display landing-h2">Une ligne, pas une grille.</h2>
          </div>
          <div className="landing-ticket">
            <div className="landing-ticket-tete">
              <div className="landing-ticket-enseigne">Fiduo</div>
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
              {/* TODO : afficher le prix réel dès qu'il est arrêté. */}
              <span className="landing-ticket-a-venir">
                Tarif de lancement communiqué à l&apos;inscription
              </span>
            </div>
            <a href={CONTACT} className="landing-action landing-ticket-action">
              {CTA}
            </a>
          </div>
        </div>
      </section>

      {/* ===== Questions ===== */}
      <section className="landing-panel landing-panel--papier">
        <div className="landing-wrap">
          <div className="landing-tete">
            <h2 className="landing-display landing-h2">Ce qu&apos;on nous demande au comptoir.</h2>
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
                    aria-hidden={!open}
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

      {/* ===== Clôture : l'invitation du lancement ===== */}
      <section id="essai" className="landing-panel landing-panel--marine">
        <div className="landing-wrap landing-cloture">
          <h2 className="landing-display landing-h2 landing-cloture-titre">
            Vos clients ont déjà tout dans leur poche.
          </h2>
          {/* TODO : confirmer le nombre de places et la ville du programme pilote. */}
          <p className="landing-lede landing-cloture-lede">
            Pour le lancement, nous cherchons dix commerces lyonnais. La mise en route est offerte :
            écrivez-nous, on installe la carte avec vous.
          </p>
          <a href={CONTACT} className="landing-action">
            {CTA}
          </a>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
