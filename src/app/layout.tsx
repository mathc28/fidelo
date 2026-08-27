import type { ReactNode } from "react";
import { Baloo_2, Bricolage_Grotesque, Plus_Jakarta_Sans, Space_Mono } from "next/font/google";
import "./globals.css";
import "./landing.css";

// Baloo 2 reste la voix du produit connecté (dashboard, caisse).
const baloo2 = Baloo_2({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-heading",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-body",
});

// Display de la landing : une grotesque un peu irrégulière, qui garde la
// mémoire du caractère plombé — l'inverse d'une Inter neutre.
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
});

// Registre utilitaire : eyebrows, compteurs, lignes de ticket de caisse.
const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-mono",
});

export const metadata = {
  title: "Fidelo",
  description: "Cartes de fidélité digitales dans Apple Wallet et Google Wallet",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="fr"
      className={`${baloo2.variable} ${plusJakartaSans.variable} ${bricolage.variable} ${spaceMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
