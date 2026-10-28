import Link from "next/link";
import { Logo } from "@/components/ui";
import { CONTACT, CTA } from "@/lib/site";
import "@/app/landing.css";

/*
 * En-tête et pied de page du site public (landing, pages légales).
 * Leurs variables CSS vivent sur .landing-page : à poser dans un parent
 * qui porte cette classe.
 *
 * Les ancres sont absolues (/#gestes) : depuis la landing, le navigateur
 * fait défiler la page ; depuis une autre page, il y ramène.
 */

export function SiteHeader() {
  return (
    <header className="landing-header">
      <div className="landing-wrap landing-header-inner">
        <Link href="/" className="landing-logo-lien" aria-label="Fiduo, retour à l'accueil">
          <Logo variant="full" height={40} />
        </Link>
        <nav className="landing-nav">
          <Link href="/#gestes" className="landing-nav-link">
            Comment ça marche
          </Link>
          <Link href="/#formules" className="landing-nav-link">
            Formules
          </Link>
          <Link href="/#personnalisation" className="landing-nav-link">
            Personnalisation
          </Link>
          <Link href="/#tarif" className="landing-nav-link">
            Tarif
          </Link>
          <a href="/dashboard" className="landing-nav-link landing-nav-link--toujours">
            Se connecter
          </a>
          <a href={CONTACT} className="landing-action landing-action--sm">
            {CTA}
          </a>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="landing-pied">
      <div className="landing-wrap landing-pied-inner">
        <Logo variant="full" theme="white" height={28} />
        <span className="landing-pied-mention">© 2026 · Fabriqué à Lyon</span>
        <div className="landing-pied-liens">
          <a href="/mentions-legales" className="landing-pied-lien">
            Mentions légales
          </a>
          <a href="/confidentialite" className="landing-pied-lien">
            Confidentialité
          </a>
          <a href="/cgv" className="landing-pied-lien">
            CGV
          </a>
        </div>
      </div>
    </footer>
  );
}
