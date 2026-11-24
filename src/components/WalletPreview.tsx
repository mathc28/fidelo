"use client";

import { useEffect, useState } from "react";
import type { RecompenseAffichable } from "@/lib/wallet/rewardText";
import { champsCarte } from "@/lib/wallet/champsCarte";
import { urlLogoEntier } from "@/lib/logoCommerce";

/**
 * Aperçu réaliste d'une carte de fidélité dans Apple Wallet / Google Wallet.
 *
 * Côté Apple, la face avant vient de champsCarte, la même source que le
 * générateur de pass (applePass.ts) : mêmes champs, mêmes libellés, mêmes
 * textes. La mise en page est calquée sur le rendu iOS d'une storeCard sans
 * image de bande : logo et en-tête, zone principale vide, une rangée
 * secondaire, le QR en bas.
 */

export type Theme = {
  bg_color: string;
  text_color: string;
  label_color: string;
};

export type WalletPreviewProps = {
  platform?: "apple" | "google";
  theme: Theme;
  merchantName: string;
  logoUrl?: string | null;
  programType: "visits" | "points";
  points: number;
  /** La récompense du commerce, comme en base : le texte en est déduit comme sur la vraie carte. */
  reward?: RecompenseAffichable | null;
  firstName?: string;
  serial?: string;
  /** Affiche la carte dans un cadre d'iPhone (écran verrouillé) */
  framed?: boolean;
};

/** Serial d'exemple : altText « F1D0A2B3 » sous le QR. */
const SERIAL_DEMO = "f1d0a2b3-0000-4000-8000-000000000000";

/* ---------- QR code réel ---------- */
function useQrDataUrl(value: string, dark: string) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    import("qrcode")
      .then((QR) =>
        QR.toDataURL(value, {
          margin: 0,
          width: 320,
          errorCorrectionLevel: "M",
          color: { dark, light: "#00000000" },
        })
      )
      .then((d) => !cancelled && setUrl(d))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [value, dark]);
  return url;
}

/* ---------- Utilitaires ---------- */
const APPLE_FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif';
const GOOGLE_FONT = 'Roboto, "Google Sans", system-ui, sans-serif';

/**
 * Une longueur en points iOS, à l'échelle de la carte : une carte Wallet
 * fait 343 pt de large sur iPhone, et l'aperçu occupe toute la largeur de
 * son conteneur (unités cqw). Tout grandit et rétrécit ensemble.
 */
const pt = (n: number) => `calc(${n} * 100cqw / 343)`;

/** Un nombre s'affiche comme iOS le formate (espace des milliers) ; un texte, tel quel. */
const afficher = (v: string | number) => (typeof v === "number" ? v.toLocaleString("fr-FR") : v);

function withAlpha(hex: string, alpha: number) {
  const h = hex.replace("#", "");
  const n = parseInt(
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h,
    16
  );
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

function initials(name: string) {
  return name.trim().charAt(0).toUpperCase() || "•";
}

/** Largeur et proportions communes aux deux aperçus. */
const CADRE_CARTE: React.CSSProperties = {
  width: "100%",
  maxWidth: 340,
  containerType: "inline-size",
};

/* ---------- Carte Apple Wallet ---------- */
function ApplePass(p: WalletPreviewProps) {
  const { theme, logoUrl, programType, points, reward, firstName, serial } = p;
  const face = champsCarte({
    programType,
    points,
    reward: reward ?? null,
    firstName: firstName || "—",
    serial: serial || SERIAL_DEMO,
  });
  const qr = useQrDataUrl(serial || SERIAL_DEMO, "#000000");

  const libelle: React.CSSProperties = {
    margin: 0,
    fontSize: pt(11),
    fontWeight: 500,
    letterSpacing: "0.02em",
    lineHeight: 1.25,
    textTransform: "uppercase",
    color: theme.label_color,
  };
  const valeur: React.CSSProperties = {
    margin: `${pt(2)} 0 0`,
    lineHeight: 1.2,
    color: theme.text_color,
  };

  return (
    <div
      style={{
        ...CADRE_CARTE,
        aspectRatio: "1 / 1.6",
        borderRadius: 14,
        background: theme.bg_color,
        // léger dégradé de surface, comme le rendu Wallet
        backgroundImage: `linear-gradient(180deg, ${withAlpha("#ffffff", 0.06)} 0%, ${withAlpha("#000000", 0.05)} 100%)`,
        fontFamily: APPLE_FONT,
        boxShadow: "0 10px 30px rgba(0,0,0,.28), 0 2px 6px rgba(0,0,0,.18)",
        overflow: "hidden",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <div
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: `${pt(12)} ${pt(14)} ${pt(14)}`,
        }}
      >
        {/* En-tête : le logo à gauche (160 × 50 pt au plus, jamais rogné),
            les champs d'en-tête à droite. Pas de nom du commerce en texte :
            le pass n'a pas de logoText. Sans logo, la zone reste vide. */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: pt(12) }}>
          <div style={{ width: pt(160), height: pt(50), flexShrink: 0 }}>
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                // Comme le vrai pass : le logo entier (logo.png), pas la vignette recadrée.
                src={urlLogoEntier(logoUrl)!}
                alt=""
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  objectPosition: "left center",
                }}
              />
            ) : null}
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: pt(12), minWidth: 0 }}>
            {face.headerFields.map((c) => (
              <div key={c.key} style={{ textAlign: "right", minWidth: 0 }}>
                <p style={libelle}>{c.label}</p>
                <p style={{ ...valeur, fontSize: pt(17), overflowWrap: "anywhere" }}>
                  {afficher(c.value)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Zone principale : vide, comme sur le pass (primaryFields: []).
            L'espace libre se partage comme sur iOS : deux tiers au-dessus
            de la rangée secondaire, un tiers entre elle et le QR. */}
        <div style={{ flex: 2 }} />

        {/* Rangée secondaire : compteur à gauche, récompense à droite. */}
        <div style={{ display: "flex", gap: pt(16), alignItems: "flex-start" }}>
          {face.secondaryFields.map((c) => {
            const aDroite = c.textAlignment === "PKTextAlignmentRight";
            return (
              <div
                key={c.key}
                style={{
                  textAlign: aDroite ? "right" : "left",
                  marginLeft: aDroite ? "auto" : undefined,
                  flexShrink: aDroite ? 1 : 0,
                  minWidth: 0,
                }}
              >
                <p style={libelle}>{c.label}</p>
                <p style={{ ...valeur, fontSize: pt(14) }}>{afficher(c.value)}</p>
              </div>
            );
          })}
        </div>

        <div style={{ flex: 1, minHeight: pt(16) }} />

        {/* QR : centré en bas, sur fond blanc arrondi, l'altText dessous. */}
        <div
          style={{
            alignSelf: "center",
            background: "#fff",
            borderRadius: pt(8),
            padding: `${pt(10)} ${pt(10)} ${pt(6)}`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div style={{ width: pt(128), height: pt(128) }}>
            {qr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt="QR code" style={{ width: "100%", height: "100%" }} />
            ) : (
              <div style={{ width: "100%", height: "100%", background: "#f0f0f0" }} />
            )}
          </div>
          <span
            style={{
              marginTop: pt(4),
              fontSize: pt(17),
              lineHeight: 1.2,
              color: "#000",
            }}
          >
            {face.barcodeAltText}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ---------- Carte Google Wallet ---------- */
function GooglePass(p: WalletPreviewProps) {
  const { theme, merchantName, logoUrl, programType, points, reward, firstName, serial } = p;
  const threshold = reward?.cost_points;
  const isVisits = programType === "visits";
  const qr = useQrDataUrl(serial || "FIDUO-DEMO", "#202124");

  // Google calcule lui-même la couleur du texte (clair sur fond sombre)
  const fg = "#FFFFFF";
  const dim = "rgba(255,255,255,.72)";

  return (
    <div
      style={{
        width: 300,
        borderRadius: 12,
        overflow: "hidden",
        fontFamily: GOOGLE_FONT,
        boxShadow: "0 8px 24px rgba(0,0,0,.22), 0 1px 3px rgba(0,0,0,.14)",
        background: "#fff",
      }}
    >
      <div style={{ background: theme.bg_color, padding: "14px 16px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              background: logoUrl ? "transparent" : "rgba(255,255,255,.2)",
              color: fg,
              fontSize: 13,
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              initials(merchantName)
            )}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ color: fg, fontSize: 13, fontWeight: 500, margin: 0 }}>{merchantName}</p>
            <p style={{ color: dim, fontSize: 11, margin: 0 }}>Fidélité {merchantName}</p>
          </div>
        </div>

        <div
          style={{
            marginTop: 18,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
          }}
        >
          <div>
            <p style={{ color: dim, fontSize: 11, margin: 0 }}>
              {isVisits ? "Passages" : "Points"}
            </p>
            <p style={{ color: fg, fontSize: 28, fontWeight: 500, margin: "2px 0 0" }}>
              {points}
              {isVisits && threshold ? (
                <span style={{ fontSize: 16, color: dim }}> / {threshold}</span>
              ) : null}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ color: dim, fontSize: 11, margin: 0 }}>Membre</p>
            <p style={{ color: fg, fontSize: 13, margin: "2px 0 0" }}>{firstName || "—"}</p>
          </div>
        </div>
      </div>

      {/* Zone code-barres, toujours sur fond blanc chez Google */}
      <div
        style={{
          background: "#fff",
          padding: "16px 0 14px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div style={{ width: 96, height: 96 }}>
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt="QR code" style={{ width: "100%", height: "100%" }} />
          ) : (
            <div
              style={{ width: "100%", height: "100%", background: "#f1f3f4", borderRadius: 4 }}
            />
          )}
        </div>
        <span style={{ marginTop: 8, fontSize: 11, color: "#5f6368", letterSpacing: 1 }}>
          {(serial || "FIDUO").slice(0, 8).toUpperCase()}
        </span>
      </div>
    </div>
  );
}

/* ---------- Cadre iPhone (écran verrouillé) ---------- */
function PhoneFrame({
  children,
  merchantName,
}: {
  children: React.ReactNode;
  merchantName: string;
}) {
  const now = new Date();
  const hh = now.getHours().toString().padStart(2, "0");
  const mm = now.getMinutes().toString().padStart(2, "0");
  return (
    <div
      style={{
        width: 340,
        borderRadius: 44,
        padding: 12,
        background: "linear-gradient(160deg,#3a3a3c,#1c1c1e)",
        boxShadow: "0 24px 60px rgba(0,0,0,.35)",
      }}
    >
      <div
        style={{
          borderRadius: 34,
          overflow: "hidden",
          position: "relative",
          background: "linear-gradient(160deg,#1b2a4a,#0d1220)",
          padding: "18px 14px 22px",
          minHeight: 520,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* encoche */}
        <div
          style={{
            width: 90,
            height: 24,
            borderRadius: 14,
            background: "#000",
            position: "absolute",
            top: 8,
          }}
        />
        {/* heure */}
        <div style={{ marginTop: 40, textAlign: "center", color: "#fff" }}>
          <p style={{ margin: 0, fontSize: 13, opacity: 0.85 }}>
            {now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <p
            style={{
              margin: "2px 0 0",
              fontSize: 58,
              fontWeight: 300,
              letterSpacing: -2,
              lineHeight: 1,
            }}
          >
            {hh}:{mm}
          </p>
        </div>
        {/* notification de proximité */}
        <div
          style={{
            marginTop: 18,
            width: "100%",
            borderRadius: 16,
            padding: "10px 12px",
            background: "rgba(255,255,255,.16)",
            backdropFilter: "blur(12px)",
            color: "#fff",
            fontSize: 12,
            lineHeight: 1.35,
          }}
        >
          <strong style={{ fontSize: 12 }}>Wallet</strong>
          <p style={{ margin: "2px 0 0", opacity: 0.9 }}>
            {merchantName} est juste à côté. Votre carte est prête.
          </p>
        </div>
        <div style={{ marginTop: 16, width: "100%", transform: "scale(.92)" }}>{children}</div>
      </div>
    </div>
  );
}

/* ---------- Export ---------- */
export default function WalletPreview(props: WalletPreviewProps) {
  const { platform = "apple", framed = false } = props;
  const card = platform === "apple" ? <ApplePass {...props} /> : <GooglePass {...props} />;
  if (!framed) return card;
  return <PhoneFrame merchantName={props.merchantName}>{card}</PhoneFrame>;
}
