"use client";

import { Logo } from "@/components/ui";
import { IOSDevice } from "@/components/IOSFrame";
import { useInView } from "@/lib/useInView";
import { MAX_PROMOS } from "@/lib/promo";

const MESSAGE = "Croissants offerts samedi dès 5 € d'achat !";

const FAITS = [
  "Écrit en 30 secondes",
  "Reçu sur iPhone et Android",
  `Jamais plus de ${MAX_PROMOS} par semaine`,
];

/**
 * Section promos. Quand la scène entre à l'écran, la notification glisse sur
 * l'écran verrouillé. Même maquette que la section proximité (IOSDevice,
 * écran .landing-verrou).
 */
export function Promos() {
  const [ref, visible] = useInView<HTMLDivElement>();

  return (
    <section id="promos" className="landing-panel landing-panel--marine">
      <div className="landing-wrap landing-promos">
        <div>
          <h2 className="landing-display landing-h2">Un message, et vos habitués reviennent.</h2>
          <p className="landing-lede landing-promos-lede">
            Croissants offerts samedi, nouvelle cuvée en cave, fermeture exceptionnelle : écrivez-le
            une fois depuis votre espace, il s&apos;affiche sur la carte de tous vos clients. Trois
            messages par semaine au maximum, pour qu&apos;ils restent attendus.
          </p>
          <ul className="landing-promos-faits">
            {FAITS.map((f) => (
              <li key={f} className="landing-promos-fait">
                {f}
              </li>
            ))}
          </ul>
        </div>

        <div
          ref={ref}
          className={`landing-promos-scene${visible ? " is-visible" : ""}`}
          aria-hidden="true"
        >
          <div className="landing-promos-telephone">
            <IOSDevice width={402} height={874} dark lockScreen>
              <div className="landing-verrou">
                <div className="landing-verrou-date">jeudi 31 juillet</div>
                <div className="landing-verrou-heure">18:30</div>
                <div className="landing-verrou-notif landing-promos-notif">
                  <div className="landing-verrou-icone">
                    <Logo variant="symbol" theme="white" height={20} />
                  </div>
                  <div className="landing-verrou-corps">
                    <div className="landing-verrou-tete">
                      <span className="landing-verrou-app">Wallet</span>
                      <span className="landing-verrou-quand">maintenant</span>
                    </div>
                    <div className="landing-verrou-texte">Boulangerie Martin — {MESSAGE}</div>
                  </div>
                </div>
              </div>
            </IOSDevice>
          </div>
        </div>
      </div>
    </section>
  );
}
