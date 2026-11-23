import type { CSSProperties, ReactNode } from "react";
import type { CardTheme } from "@/lib/types";
import { PoweredByBadge } from "@/components/ui";
import { urlLogoEntier } from "@/lib/logoCommerce";
import "./merchant.css";

/**
 * Habillage commun des pages client d'un commerce : fond, texte et accent
 * du thème de carte, pleine largeur ; contenu en colonne de 420px.
 */
export function MerchantShell({
  theme,
  name,
  logoUrl,
  children,
}: {
  theme: CardTheme;
  name: string;
  logoUrl: string | null;
  children: ReactNode;
}) {
  const vars = {
    "--theme-bg": theme.bg_color,
    "--theme-text": theme.text_color,
    "--accent": theme.label_color,
  } as CSSProperties;
  const logo = urlLogoEntier(logoUrl);

  return (
    <main className={`m-shell${theme.is_light ? "" : " on-dark"}`} style={vars}>
      <div className="m-col">
        <div className="m-brand">
          {logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt={name} height={40} />
          )}
          <span>{name}</span>
        </div>
        {children}
        <div className="m-foot">
          <a
            href="https://fiduo.app"
            target="_blank"
            rel="noopener"
            className="m-propulse"
            aria-label="Propulsé par Fiduo (nouvel onglet)"
          >
            <PoweredByBadge variant="pill" />
          </a>
        </div>
      </div>
    </main>
  );
}
