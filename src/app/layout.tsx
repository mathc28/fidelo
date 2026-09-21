import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Bricolage_Grotesque, Plus_Jakarta_Sans, Space_Mono } from "next/font/google";
import "./globals.css";

// Une seule voix de titre pour tout le produit, landing comme caisse :
// une grotesque un peu irrégulière, qui garde la mémoire du caractère
// plombé — l'inverse d'une Inter neutre.
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
});

// Texte courant et commandes.
const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});

// Registre utilitaire : tout ce qui se compte (compteurs, dates, codes,
// lignes de ticket de caisse).
const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: {
    default: "Fidelo — la carte de fidélité dans le téléphone de vos clients",
    template: "%s · Fidelo",
  },
  description:
    "Une carte de fidélité dans Apple Wallet et Google Wallet pour les commerces de quartier. Rien à installer pour vos clients, aucun matériel pour vous.",
  manifest: "/manifest.json",
  openGraph: {
    title: "Fidelo",
    description:
      "Une carte de fidélité dans Apple Wallet et Google Wallet pour les commerces de quartier.",
    locale: "fr_FR",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="fr"
      className={`${plusJakartaSans.variable} ${bricolage.variable} ${spaceMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
