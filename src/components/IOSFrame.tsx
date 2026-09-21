import type { CSSProperties, ReactNode } from "react";

/**
 * Cadre d'iPhone (iOS 26 / Liquid Glass) minimaliste, sans dépendance ni
 * asset — porté depuis le projet de design (ios-frame.jsx) pour les mockups
 * de la landing page. Usage : envelopper l'écran dans <IOSDevice>.
 */

function IOSStatusBar({
  dark = false,
  time = "9:41",
  hideTime = false,
}: {
  dark?: boolean;
  time?: string;
  /** Écran verrouillé : la grande horloge remplace celle de la barre d'état. */
  hideTime?: boolean;
}) {
  const c = dark ? "#fff" : "#000";
  return (
    <div
      style={{
        display: "flex",
        gap: 154,
        alignItems: "center",
        justifyContent: "center",
        padding: "21px 24px 19px",
        boxSizing: "border-box",
        position: "relative",
        zIndex: 20,
        width: "100%",
      }}
    >
      <div
        style={{
          flex: 1,
          height: 22,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          paddingTop: 1.5,
        }}
      >
        <span
          style={{
            fontFamily: '-apple-system, "SF Pro", system-ui',
            fontWeight: 590,
            fontSize: 17,
            lineHeight: "22px",
            color: c,
          }}
        >
          {hideTime ? "" : time}
        </span>
      </div>
      <div
        style={{
          flex: 1,
          height: 22,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 7,
          paddingTop: 1,
          paddingRight: 1,
        }}
      >
        <svg width="19" height="12" viewBox="0 0 19 12">
          <rect x="0" y="7.5" width="3.2" height="4.5" rx="0.7" fill={c} />
          <rect x="4.8" y="5" width="3.2" height="7" rx="0.7" fill={c} />
          <rect x="9.6" y="2.5" width="3.2" height="9.5" rx="0.7" fill={c} />
          <rect x="14.4" y="0" width="3.2" height="12" rx="0.7" fill={c} />
        </svg>
        <svg width="17" height="12" viewBox="0 0 17 12">
          <path
            d="M8.5 3.2C10.8 3.2 12.9 4.1 14.4 5.6L15.5 4.5C13.7 2.7 11.2 1.5 8.5 1.5C5.8 1.5 3.3 2.7 1.5 4.5L2.6 5.6C4.1 4.1 6.2 3.2 8.5 3.2Z"
            fill={c}
          />
          <path
            d="M8.5 6.8C9.9 6.8 11.1 7.3 12 8.2L13.1 7.1C11.8 5.9 10.2 5.1 8.5 5.1C6.8 5.1 5.2 5.9 3.9 7.1L5 8.2C5.9 7.3 7.1 6.8 8.5 6.8Z"
            fill={c}
          />
          <circle cx="8.5" cy="10.5" r="1.5" fill={c} />
        </svg>
        <svg width="27" height="13" viewBox="0 0 27 13">
          <rect
            x="0.5"
            y="0.5"
            width="23"
            height="12"
            rx="3.5"
            stroke={c}
            strokeOpacity="0.35"
            fill="none"
          />
          <rect x="2" y="2" width="20" height="9" rx="2" fill={c} />
          <path
            d="M25 4.5V8.5C25.8 8.2 26.5 7.2 26.5 6.5C26.5 5.8 25.8 4.8 25 4.5Z"
            fill={c}
            fillOpacity="0.4"
          />
        </svg>
      </div>
    </div>
  );
}

export function IOSDevice({
  children,
  width = 402,
  height = 874,
  dark = false,
  lockScreen = false,
}: {
  children: ReactNode;
  width?: number;
  height?: number;
  dark?: boolean;
  /** Écran verrouillé : pas d'heure dans la barre d'état. */
  lockScreen?: boolean;
}) {
  const bezel = 12;
  const sideButton = (style: CSSProperties) => (
    <div
      style={{
        position: "absolute",
        width: 3,
        borderRadius: "2px 0 0 2px",
        background: "linear-gradient(90deg, #0a0a0b, #333336)",
        ...style,
      }}
    />
  );

  return (
    <div
      style={{
        width,
        height,
        borderRadius: 56,
        position: "relative",
        boxSizing: "border-box",
        padding: bezel,
        background: "linear-gradient(155deg, #5a5a5d 0%, #2c2c2e 22%, #19191b 55%, #38383b 100%)",
        boxShadow:
          "0 50px 90px rgba(0,0,0,0.32), 0 10px 24px rgba(0,0,0,0.18), inset 0 0 0 1px rgba(255,255,255,0.15)",
        fontFamily: "-apple-system, system-ui, sans-serif",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      {/* boutons physiques : silence + volume à gauche, alimentation à droite */}
      {sideButton({ left: -2, top: height * 0.14, height: 26 })}
      {sideButton({ left: -2, top: height * 0.19, height: 46 })}
      {sideButton({ left: -2, top: height * 0.26, height: 46 })}
      <div
        style={{
          position: "absolute",
          right: -2,
          top: height * 0.19,
          width: 3,
          height: 68,
          borderRadius: "0 2px 2px 0",
          background: "linear-gradient(270deg, #0a0a0b, #333336)",
        }}
      />

      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 56 - bezel,
          overflow: "hidden",
          position: "relative",
          background: dark ? "#000" : "#F2F2F7",
          boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.6)",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 11,
            left: "50%",
            transform: "translateX(-50%)",
            width: 126,
            height: 37,
            borderRadius: 24,
            background: "#000",
            zIndex: 50,
          }}
        />
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 10 }}>
          <IOSStatusBar dark={dark} hideTime={lockScreen} />
        </div>
        <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
          <div style={{ flex: 1, overflow: "auto" }}>{children}</div>
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 60,
            height: 34,
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-end",
            paddingBottom: 8,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              width: 139,
              height: 5,
              borderRadius: 100,
              background: dark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.25)",
            }}
          />
        </div>
      </div>
    </div>
  );
}

export { IOSStatusBar };
