import { getMerchantBySlug, getCardTheme } from "@/lib/supabaseAdmin";
import { db } from "@/lib/supabaseAdmin";
import { notFound } from "next/navigation";
import SignupForm from "./SignupForm";
import { PoweredByBadge } from "@/components/ui";

export const revalidate = 300;

/**
 * Page d'inscription publique, habillée aux couleurs du commerce.
 * Server Component : la config merchant est chargée côté serveur et cachée.
 */
export default async function InscriptionPage({ params }: { params: { slug: string } }) {
  const merchant = await getMerchantBySlug(params.slug);
  if (!merchant) notFound();
  const theme = await getCardTheme(merchant.theme_id);

  const { data: rewards } = await db
    .from("rewards")
    .select("label, cost_points")
    .eq("merchant_id", merchant.id)
    .eq("active", true)
    .order("cost_points")
    .limit(1);

  const first = rewards?.[0];
  const hook = first
    ? merchant.program_type === "visits"
      ? `Votre ${first.cost_points}e passage vous offre : ${first.label}`
      : `${first.cost_points} points = ${first.label}`
    : `Rejoignez le programme fidélité de ${merchant.name}`;

  return (
    <main
      style={{
        maxWidth: 420,
        margin: "0 auto",
        minHeight: "100vh",
        padding: "48px 20px",
        background: theme.bg_color,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
        {merchant.logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={merchant.logo_url} alt="" width={36} height={36} style={{ borderRadius: 8 }} />
        )}
        <span style={{ fontWeight: 600, fontSize: 16 }}>{merchant.name}</span>
      </div>

      <h1
        style={{
          fontFamily: "var(--font-heading)",
          fontWeight: 600,
          fontSize: 26,
          margin: "0 0 6px",
          lineHeight: 1.25,
        }}
      >
        {hook}
      </h1>
      <p style={{ color: "rgba(255,255,255,0.6)", marginBottom: 28, lineHeight: 1.5 }}>
        Carte gratuite, directement dans votre téléphone. Rien à installer — elle apparaîtra même
        sur votre écran verrouillé quand vous passerez à côté.
      </p>

      <SignupForm slug={merchant.slug} labelColor={theme.label_color} />

      <div style={{ display: "flex", justifyContent: "center", marginTop: 40 }}>
        <PoweredByBadge variant="pill" />
      </div>
    </main>
  );
}
