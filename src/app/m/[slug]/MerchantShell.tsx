import type { CSSProperties, ReactNode } from "react";
import type { CardTheme } from "@/lib/types";
import { PoweredByBadge } from "@/components/ui";
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

  return (
    <main className={`m-shell${theme.is_light ? "" : " on-dark"}`} style={vars}>
      <div className="m-col">
        <div className="m-brand">
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" width={36} height={36} />
          )}
          <span>{name}</span>
        </div>
        {children}
        <div className="m-foot">
          <PoweredByBadge variant="pill" />
        </div>
      </div>
    </main>
  );
}
