import { getMerchantBySlug, getCardTheme } from "@/lib/supabaseAdmin";
import { notFound } from "next/navigation";
import AccountLookup from "./AccountLookup";
import { MerchantShell } from "../MerchantShell";

export const revalidate = 300;

export default async function ComptePage({ params }: { params: { slug: string } }) {
  const merchant = await getMerchantBySlug(params.slug);
  if (!merchant) notFound();
  const theme = await getCardTheme(merchant.theme_id);

  return (
    <MerchantShell theme={theme} name={merchant.name} logoUrl={merchant.logo_url}>
      <h1 className="m-title">Retrouver ma carte</h1>
      <p className="m-lede m-muted" style={{ marginBottom: 24 }}>
        Indiquez votre email : nous vous envoyons le lien de votre carte et votre nombre de{" "}
        {merchant.program_type === "visits" ? "passages" : "points"}.
      </p>
      <AccountLookup slug={merchant.slug} />
    </MerchantShell>
  );
}
