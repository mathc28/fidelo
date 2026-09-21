import { getMerchantBySlug, getCardTheme } from "@/lib/supabaseAdmin";
import { getMerchantReward } from "@/lib/loyalty";
import { notFound } from "next/navigation";
import SignupForm from "./SignupForm";
import { MerchantShell } from "../MerchantShell";

export const revalidate = 300;

/**
 * Page d'inscription publique, habillée aux couleurs du commerce.
 * Server Component : la config merchant est chargée côté serveur et cachée.
 */
export default async function InscriptionPage({ params }: { params: { slug: string } }) {
  const merchant = await getMerchantBySlug(params.slug);
  if (!merchant) notFound();
  const theme = await getCardTheme(merchant.theme_id);

  const reward = await getMerchantReward(merchant.id);
  const hook = reward
    ? merchant.program_type === "visits"
      ? `Votre ${reward.cost_points}e passage vous offre : ${reward.label}`
      : `${reward.cost_points} points = ${reward.label}`
    : `Rejoignez le programme fidélité de ${merchant.name}`;

  return (
    <MerchantShell theme={theme} name={merchant.name} logoUrl={merchant.logo_url}>
      <h1 className="m-title">{hook}</h1>
      <p className="m-lede m-muted">
        Carte gratuite, directement dans votre téléphone. Rien à installer : elle apparaît sur votre
        écran verrouillé quand vous passez à côté.
      </p>

      <SignupForm slug={merchant.slug} />
    </MerchantShell>
  );
}
