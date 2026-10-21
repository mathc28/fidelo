/**
 * En-têtes de sécurité HTTP, posés sur toutes les réponses.
 *
 * La CSP est pour l'instant en mode « Report-Only » : le navigateur signale
 * dans sa console ce qu'elle bloquerait, sans rien bloquer. Une fois vérifié
 * qu'aucune page n'est cassée, renommer l'en-tête en Content-Security-Policy.
 *
 * Ce que le site charge réellement : ses propres scripts et styles (polices
 * auto-hébergées par next/font), Supabase depuis le navigateur (auth, logos
 * du stockage), des images data: (QR codes) et blob: (aperçu du logo), la
 * caméra sur /scan. Google Wallet n'est qu'une redirection (pay.google.com),
 * hors du champ de la CSP.
 */

/** Origine Supabase, lue au build depuis NEXT_PUBLIC_SUPABASE_URL. */
function origineSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  try {
    return new URL(url).origin;
  } catch {
    console.warn(
      "[next.config] NEXT_PUBLIC_SUPABASE_URL absente ou invalide : la CSP n'autorisera pas Supabase."
    );
    return "";
  }
}

const supabase = origineSupabase();
const dev = process.env.NODE_ENV !== "production";

const csp = [
  "default-src 'self'",
  // 'unsafe-inline' : scripts d'amorçage en ligne de Next (App Router).
  // 'unsafe-eval' en développement seulement (rechargement à chaud).
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  // Attributs style de React.
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${supabase}`.trim(),
  "font-src 'self'",
  `connect-src 'self' ${supabase}${dev ? " ws:" : ""}`.trim(),
  "media-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const enTetesCommuns = [
  { key: "Content-Security-Policy-Report-Only", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      { source: "/:path*", headers: enTetesCommuns },
      // La caméra n'est autorisée que sur la caisse (lecture des QR codes).
      // Déclarée après : pour un même en-tête, la dernière règle l'emporte.
      {
        source: "/scan",
        headers: [
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(), geolocation=(), payment=(), usb=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
