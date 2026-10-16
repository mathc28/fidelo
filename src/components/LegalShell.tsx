import type { ReactNode } from "react";
import { SiteHeader, SiteFooter } from "@/components/SiteChrome";
import "@/app/legal.css";

/**
 * Habillage commun des pages légales (mentions légales, confidentialité,
 * CGV) : l'en-tête et le pied de la landing, une colonne de lecture entre
 * les deux. `sousTitre` : la ligne sous le titre (date de mise à jour, version).
 */
export function LegalShell({
  titre,
  sousTitre,
  children,
}: {
  titre: string;
  sousTitre: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="landing-page legal-page">
      <SiteHeader />
      <main className="legal-wrap legal-contenu">
        <h1 className="legal-h1">{titre}</h1>
        <p className="legal-maj">{sousTitre}</p>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}

/**
 * Information que seul l'éditeur peut fournir (identité légale, hébergement,
 * durées). Surlignée à l'écran pour qu'aucune ne parte en ligne par oubli.
 */
export function ACompleter({ children }: { children: ReactNode }) {
  return <mark className="legal-a-completer">[À COMPLÉTER : {children}]</mark>;
}
