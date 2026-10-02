"use client";

import { useState } from "react";
import WalletPreview, { type Theme } from "@/components/WalletPreview";

/**
 * Les dix thèmes de la table card_themes, recopiés à l'identique (voir
 * supabase/schema.sql). La landing est publique et statique : pas de lecture
 * en base pour une démo. Si un thème change en base, le changer ici aussi.
 */
const THEMES: ({ id: string; label: string } & Theme)[] = [
  {
    id: "marine",
    label: "Marine Fiduo",
    bg_color: "#1A2E60",
    text_color: "#F3EFE3",
    label_color: "#F56C5A",
  },
  {
    id: "nuit",
    label: "Bleu nuit",
    bg_color: "#141B2E",
    text_color: "#F3EFE3",
    label_color: "#F2C14E",
  },
  {
    id: "bordeaux",
    label: "Bordeaux",
    bg_color: "#5C1F2E",
    text_color: "#F3EFE3",
    label_color: "#E8A87C",
  },
  {
    id: "foret",
    label: "Forêt",
    bg_color: "#1E3D34",
    text_color: "#F3EFE3",
    label_color: "#E8B44A",
  },
  {
    id: "terracotta",
    label: "Terracotta",
    bg_color: "#7A3B2E",
    text_color: "#F8EFE8",
    label_color: "#F0C05A",
  },
  { id: "cafe", label: "Café", bg_color: "#3A2B22", text_color: "#F3EFE3", label_color: "#D9A566" },
  {
    id: "ardoise",
    label: "Ardoise",
    bg_color: "#2B3038",
    text_color: "#F3EFE3",
    label_color: "#6FB4C9",
  },
  {
    id: "prune",
    label: "Prune",
    bg_color: "#3D2645",
    text_color: "#F3EFE3",
    label_color: "#D98BB0",
  },
  {
    id: "olive",
    label: "Olive",
    bg_color: "#3A3A22",
    text_color: "#F5F0DE",
    label_color: "#C9B458",
  },
  {
    id: "charbon",
    label: "Charbon",
    bg_color: "#1C1C1E",
    text_color: "#F3EFE3",
    label_color: "#F56C5A",
  },
];

const POINTS = [
  {
    titre: "Votre logo",
    desc: "En haut de la carte, à côté du nom de votre commerce. C'est lui que votre client reconnaît en ouvrant son Wallet.",
  },
  {
    titre: "Votre couleur",
    desc: "Dix thèmes, tous vérifiés pour rester lisibles. Choisissez celui qui ressemble à votre devanture.",
  },
  {
    titre: "Votre récompense",
    desc: "Le café offert, la baguette gratuite, -10 % sur le panier : vous fixez le cadeau et le nombre de passages pour l'obtenir.",
  },
] as const;

export function Personnalisation() {
  const [themeId, setThemeId] = useState(THEMES[0].id);
  const theme = THEMES.find((t) => t.id === themeId) ?? THEMES[0];

  return (
    <section id="personnalisation" className="landing-panel">
      <div className="landing-wrap">
        <div className="landing-tete">
          <h2 className="landing-display landing-h2">Votre carte, à vos couleurs.</h2>
          <p className="landing-lede landing-perso-sous-titre">
            Votre client voit votre boutique, pas la nôtre.
          </p>
        </div>

        <div className="landing-perso">
          <div>
            <ul className="landing-perso-points">
              {POINTS.map((p) => (
                <li key={p.titre} className="landing-perso-point">
                  <h3 className="landing-display landing-h3">{p.titre}</h3>
                  <p className="landing-body">{p.desc}</p>
                </li>
              ))}
            </ul>
            <p className="landing-perso-note">
              Tout se règle depuis votre espace, avec un aperçu de la carte en direct.
            </p>
          </div>

          <div className="landing-perso-demo">
            {/* La carte d'exemple : WalletPreview, le même rendu que l'aperçu
                du dashboard. Masquée aux lecteurs d'écran, le nom du thème
                choisi est annoncé à sa place. */}
            <div className="landing-perso-carte" aria-hidden="true">
              <WalletPreview
                theme={theme}
                merchantName="Boulangerie Martin"
                programType="visits"
                points={8}
                threshold={10}
                rewardLabel="Plus que 2 avant le café offert"
                firstName="Léa"
                platform="apple"
              />
            </div>

            <fieldset className="landing-perso-themes">
              <legend className="landing-mono landing-perso-legende">Essayez un thème</legend>
              <div className="landing-perso-pastilles">
                {THEMES.map((t) => (
                  <label key={t.id} className="landing-perso-pastille" title={t.label}>
                    <input
                      type="radio"
                      name="theme-demo"
                      value={t.id}
                      checked={t.id === themeId}
                      onChange={() => setThemeId(t.id)}
                      className="visually-hidden landing-perso-radio"
                    />
                    <span
                      className="landing-perso-disque"
                      style={
                        {
                          "--pastille-fond": t.bg_color,
                          "--pastille-accent": t.label_color,
                        } as React.CSSProperties
                      }
                      aria-hidden="true"
                    />
                    <span className="visually-hidden">{t.label}</span>
                  </label>
                ))}
              </div>
              <p className="landing-perso-nom" aria-live="polite">
                {theme.label}
              </p>
            </fieldset>
          </div>
        </div>
      </div>
    </section>
  );
}
