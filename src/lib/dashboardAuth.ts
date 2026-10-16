import { NextRequest } from "next/server";
import { db, Merchant } from "./supabaseAdmin";

/**
 * Authentifie une requête API du dashboard : vérifie le JWT Supabase
 * (header "Authorization: Bearer <access_token>") et renvoie le merchant
 * du gérant connecté.
 */
export async function requireMerchant(req: NextRequest): Promise<Merchant | null> {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;

  const { data: userData, error } = await db.auth.getUser(token);
  if (error || !userData.user) return null;

  const { data: merchant } = await db
    .from("merchants")
    .select("*")
    .eq("owner_id", userData.user.id)
    .single();

  return merchant;
}

/**
 * Comme requireMerchant, mais renvoie aussi l'email du compte connecté
 * (pour savoir s'il s'agit d'un admin plateforme).
 */
export async function requireMerchantEtCompte(
  req: NextRequest
): Promise<{ merchant: Merchant; email: string | undefined } | null> {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;

  const { data: userData, error } = await db.auth.getUser(token);
  if (error || !userData.user) return null;

  const { data: merchant } = await db
    .from("merchants")
    .select("*")
    .eq("owner_id", userData.user.id)
    .single();

  return merchant ? { merchant, email: userData.user.email } : null;
}
