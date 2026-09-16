import { createClient } from "@supabase/supabase-js";
import type { Merchant, CardTheme } from "./types";

/**
 * Client service_role — API routes uniquement, bypass RLS. Jamais côté navigateur.
 *
 * Le `fetch` explicite en `no-store` n'est pas décoratif. Next 14 remplace le
 * `fetch` global et met en cache TOUTE requête GET sur disque, dans
 * `.next/cache/fetch-cache`, sans expiration par défaut. supabase-js passant
 * par ce `fetch` global, chaque `select()` devenait éligible au cache : on a
 * vu un pass Apple servir un `theme_id` et un `logo_url` vieux d'une semaine
 * alors que la base était à jour. Les écritures (POST/PATCH) n'étaient jamais
 * concernées — d'où un cache invisible en apparence, qui ne se manifestait
 * qu'en lecture.
 *
 * Un client d'administration ne doit jamais rendre de données périmées : on
 * sort donc du cache de données pour toutes ses requêtes.
 */
export const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { persistSession: false },
    global: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) =>
        fetch(input, { ...init, cache: "no-store" }),
    },
  }
);

// Les types du modèle vivent dans ./types — un module sans effet de bord, que
// les composants clients peuvent référer sans risquer d'attirer ce fichier-ci
// (et sa clé service_role) dans le bundle navigateur. Réexportés ici pour que
// le code serveur garde un point d'import unique.
export type {
  Merchant,
  Customer,
  Reward,
  Device,
  CardTheme,
  ProgramType,
  SubscriptionStatus,
} from "./types";

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
