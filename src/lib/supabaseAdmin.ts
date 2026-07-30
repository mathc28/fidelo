import { createClient } from "@supabase/supabase-js";

/** Client service_role — API routes uniquement, bypass RLS. Jamais côté navigateur. */
export const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export type Merchant = {
  id: string;
  owner_id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  is_square_logo: boolean;
  theme_id: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  program_type: "visits" | "points";
  max_scans_per_day: number;
  google_class_id: string | null;
  subscription_status: "trialing" | "active" | "past_due" | "canceled";
};

export type Customer = {
  id: string;
  merchant_id: string;
  serial_number: string;
  auth_token: string;
  first_name: string;
  email: string;
  phone: string | null;
  points: number;
  created_at: string;
  updated_at: string;
};

export type Reward = {
  id: string;
  merchant_id: string;
  label: string;
  cost_points: number;
  active: boolean;
};

export type CardTheme = {
  id: string;
  label: string;
  bg_color: string;
  text_color: string;
  label_color: string;
  sort_order: number;
  is_light: boolean;
};

export async function getMerchantBySlug(slug: string): Promise<Merchant | null> {
  const { data } = await db.from("merchants").select("*").eq("slug", slug).single();
  return data;
}

export async function getMerchantById(id: string): Promise<Merchant | null> {
  const { data } = await db.from("merchants").select("*").eq("id", id).single();
  return data;
}

/** Le theme_id d'un merchant référence toujours une ligne existante (contrainte FK). */
export async function getCardTheme(themeId: string): Promise<CardTheme> {
  const { data } = await db.from("card_themes").select("*").eq("id", themeId).single();
  return data as CardTheme;
}

/** Un abonnement inactif bloque les actions du commerçant, jamais celles du client final. */
export function merchantActive(m: Merchant): boolean {
  return m.subscription_status === "trialing" || m.subscription_status === "active";
}
