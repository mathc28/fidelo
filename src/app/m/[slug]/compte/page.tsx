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
      <h1 className="m-title" style={{ marginBottom: 24 }}>
        Où en sont mes {merchant.program_type === "visits" ? "passages" : "points"} ?
      </h1>
      <AccountLookup slug={merchant.slug} programType={merchant.program_type} />
    </MerchantShell>
  );
}
