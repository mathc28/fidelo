import { getMerchantBySlug } from "@/lib/supabaseAdmin";
import { notFound } from "next/navigation";
import AccountLookup from "./AccountLookup";
import { PoweredByBadge } from "@/components/ui";

export const revalidate = 300;

export default async function ComptePage({ params }: { params: { slug: string } }) {
  const merchant = await getMerchantBySlug(params.slug);
  if (!merchant) notFound();

  return (
    <main
      style={{
        maxWidth: 420, margin: "0 auto", minHeight: "100vh",
        padding: "48px 20px", background: merchant.bg_color,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
        {merchant.logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={merchant.logo_url} alt="" width={36} height={36} style={{ borderRadius: 8 }} />
        )}
        <span style={{ fontWeight: 600, fontSize: 16 }}>{merchant.name}</span>
      </div>
      <h1 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 26, margin: "0 0 24px" }}>Où en sont mes {merchant.program_type === "visits" ? "passages" : "points"} ?</h1>
      <AccountLookup slug={merchant.slug} labelColor={merchant.label_color} programType={merchant.program_type} />
      <div style={{ display: "flex", justifyContent: "center", marginTop: 40 }}>
        <PoweredByBadge variant="pill" />
      </div>
    </main>
  );
}
