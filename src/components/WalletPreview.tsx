"use client";

import { useEffect, useState } from "react";
import { texteCompteur } from "@/lib/wallet/rewardText";

/**
 * Aperçu réaliste d'une carte de fidélité dans Apple Wallet / Google Wallet.
 *
 * Fidélité au rendu réel :
 * - proportions et rayons des vrais passes (375 pt de large, coins 14 px)
 * - police système Apple (SF Pro via -apple-system) / Roboto côté Google
 * - hiérarchie exacte des champs : label 11 px majuscules espacées,
 *   valeur primaire ~38 px, secondaires ~15 px
 * - vrai QR code scannable (lib `qrcode`), pas un motif décoratif
 * - zone code-barres blanche avec marge de silence + altText en mono
 * - ombre portée et léger dégradé de surface comme dans Wallet
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
  threshold?: number | null;
  rewardLabel?: string | null;
  firstName?: string;
  serial?: string;
  /** Affiche la carte dans un cadre d'iPhone (écran verrouillé) */
  framed?: boolean;
};

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

/* ---------- Carte Apple Wallet ---------- */
function ApplePass(p: WalletPreviewProps) {
  const {
    theme,
    merchantName,
    logoUrl,
    programType,
    points,
    threshold,
    rewardLabel,
    firstName,
    serial,
  } = p;
  const isVisits = programType === "visits";
  const qr = useQrDataUrl(serial || "FIDUO-DEMO", "#111111");

  const label: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: theme.label_color,
    margin: 0,
    lineHeight: 1.2,
  };
  const value: React.CSSProperties = {
    color: theme.text_color,
    margin: "2px 0 0",
    lineHeight: 1.15,
  };

  return (
    <div
      style={{
        width: 300,
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
      {/* En-tête : logo + nom + champ header à droite */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 14px 0" }}>
        {/* Sans logo uploadé, le pass n'en embarque aucun : pas d'initiales de
            repli ici non plus. Et aucun champ d'en-tête à droite — le pass a
            `headerFields: []`, tout l'espace revient au nom. */}
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" style={{ height: 22, maxWidth: 70, objectFit: "contain" }} />
        ) : null}
        <span style={{ color: theme.text_color, fontSize: 13, fontWeight: 500, flex: 1 }}>
          {merchantName}
        </span>
      </div>

      {/* Compteur — rangée secondaire du pass, seul sur sa ligne.
          La valeur d'un champ PassKit est du texte brut : pas de tailles
          mixtes, donc pas de « / 10 » plus petit ni grisé. Une seule chaîne,
          un seul corps, exactement ce qu'iOS affichera. */}
      <div style={{ padding: "16px 14px 0" }}>
        <p style={label}>{isVisits ? "Passages" : "Points"}</p>
        <p style={{ ...value, fontSize: 18, fontWeight: 600, letterSpacing: -0.2 }}>
          {threshold ? texteCompteur(points, threshold, isVisits) : points}
        </p>
      </div>

      {/* Champs secondaires */}
      <div style={{ display: "flex", gap: 12, padding: "16px 14px 0" }}>
        <div style={{ flex: 1 }}>
          <p style={label}>Membre</p>
          <p style={{ ...value, fontSize: 14 }}>{firstName || "—"}</p>
        </div>
        {rewardLabel ? (
          <div style={{ flex: 1.4 }}>
            <p style={label}>Récompense</p>
            <p style={{ ...value, fontSize: 12.5 }}>{rewardLabel}</p>
          </div>
        ) : null}
      </div>

      {/* Code-barres : fond blanc, marge de silence, altText mono */}
      <div style={{ padding: "16px 14px 14px" }}>
        <div
          style={{
            background: "#fff",
            borderRadius: 8,
            padding: "12px 12px 8px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: 92,
              height: 92,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {qr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt="QR code" style={{ width: "100%", height: "100%" }} />
            ) : (
              <div
                style={{ width: "100%", height: "100%", background: "#f0f0f0", borderRadius: 4 }}
              />
            )}
          </div>
          <span
            style={{
              marginTop: 6,
              fontSize: 9,
              letterSpacing: 1.5,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              color: "#3c3c43",
            }}
          >
            {(serial || "FIDUO").slice(0, 8).toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ---------- Carte Google Wallet ---------- */
function GooglePass(p: WalletPreviewProps) {
  const { theme, merchantName, logoUrl, programType, points, threshold, firstName, serial } = p;
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
        <div style={{ marginTop: 16, transform: "scale(.92)" }}>{children}</div>
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
