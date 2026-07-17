type LogoProps = {
  variant?: "full" | "symbol";
  theme?: "color" | "white";
  height?: number;
};

/** eslint-disable-next-line @next/next/no-img-element -- logo statique, pas besoin d'optimisation next/image */
export function Logo({ variant = "full", theme = "color", height = 40 }: LogoProps) {
  const src = variant === "full"
    ? theme === "white" ? "/brand/logo-full-white.png" : "/brand/logo-full.png"
    : "/brand/logo-symbol.png";
  const whiteSymbol = variant === "symbol" && theme === "white";
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="Fidelo"
      style={{ height, width: "auto", filter: whiteSymbol ? "brightness(0) invert(1)" : undefined }}
    />
  );
}

/** Signature "Propulsé par Fidelo" — clair sur fonds neutres, pastille marine sur fonds variables. */
export function PoweredByBadge({ variant = "plain" }: { variant?: "plain" | "pill" }) {
  if (variant === "pill") {
    return (
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 7,
        background: "var(--color-marine)", borderRadius: 999, padding: "7px 14px",
      }}>
        <Logo variant="symbol" theme="white" height={14} />
        <span style={{ fontSize: 11, color: "#fff", fontWeight: 600 }}>
          Propulsé par <span style={{ fontFamily: "var(--font-heading)" }}>Fidelo</span>
        </span>
      </div>
    );
  }
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 7, opacity: .75 }}>
      <Logo variant="symbol" height={16} />
      <span style={{ fontSize: 12, color: "var(--color-text)", fontWeight: 600 }}>
        Propulsé par <span style={{ fontFamily: "var(--font-heading)" }}>Fidelo</span>
      </span>
    </div>
  );
}
