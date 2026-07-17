import { db, Customer, Merchant, Reward } from "./supabaseAdmin";
import { pushPassUpdate } from "./apns";
import { updateGooglePoints } from "./googleWallet";

export async function getActiveRewards(merchantId: string): Promise<Reward[]> {
  const { data } = await db
    .from("rewards")
    .select("*")
    .eq("merchant_id", merchantId)
    .eq("active", true)
    .order("cost_points");
  return data ?? [];
}

/**
 * Insère une transaction (le trigger SQL met à jour le solde et lève une
 * exception si règle violée : solde négatif, limite de passages…), puis
 * synchronise les deux wallets. Renvoie le customer à jour.
 */
export async function applyTransaction(params: {
  merchant: Merchant;
  customer: Customer;
  deviceId?: string;
  type: "earn" | "redeem" | "adjust";
  delta: number;
  amountEuros?: number;
  rewardId?: string;
}): Promise<{ ok: true; customer: Customer } | { ok: false; error: string }> {
  const { error } = await db.from("transactions").insert({
    merchant_id: params.merchant.id,
    customer_id: params.customer.id,
    device_id: params.deviceId ?? null,
    reward_id: params.rewardId ?? null,
    type: params.type,
    delta: params.delta,
    amount_euros: params.amountEuros ?? null,
  });

  if (error) {
    const msg = error.message.includes("Limite de passages")
      ? "Passage déjà enregistré aujourd'hui"
      : error.message.includes("Solde insuffisant")
        ? "Solde insuffisant pour cette récompense"
        : "Opération refusée";
    return { ok: false, error: msg };
  }

  const { data: updated } = await db
    .from("customers")
    .select("*")
    .eq("id", params.customer.id)
    .single();

  await Promise.all([
    pushPassUpdate(params.customer.serial_number),
    updateGooglePoints(updated!, params.merchant).catch(() => {}),
  ]);

  return { ok: true, customer: updated! };
}
