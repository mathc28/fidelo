import type { ReactNode } from "react";
import { Baloo_2, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import "./landing.css";

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

export const metadata = {
  title: "Fidelo",
  description: "Cartes de fidélité digitales dans Apple Wallet et Google Wallet",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={`${baloo2.variable} ${plusJakartaSans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
