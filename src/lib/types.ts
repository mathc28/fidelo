/**
 * Types du modèle de données, partagés entre le serveur et le navigateur.
 *
 * Ce module n'importe rien et n'a aucun effet de bord — c'est la raison d'être
 * de sa séparation d'avec supabaseAdmin.ts. Ce dernier instancie un client
 * service_role au chargement du module : y référer un type depuis un composant
 * client fonctionnerait (`import type` est effacé à la compilation), mais
 * laisserait la clé d'administration à une faute de frappe du bundle
 * navigateur. Ici, il n'y a rien à fuiter.
 *
 * Ces types décrivent une ligne complète (`select("*")`). Pour une requête
 * partielle, dériver plutôt que redéclarer :
 *
 *     type Ligne = Pick<Customer, "id" | "first_name" | "points">;
 */

export type ProgramType = "visits" | "points";

export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled";

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
  program_type: ProgramType;
  max_scans_per_day: number;
  google_class_id: string | null;
  subscription_status: SubscriptionStatus;
  /** Acceptation des CGV à l'activation du compte : date et version acceptée. */
  cgv_accepted_at: string | null;
  cgv_version: string | null;
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
  /** Pass Type ID Apple figé à la création ; null = identifiant partagé du .env. */
  pass_type_identifier: string | null;
};

/** Un commerce n'en a qu'une active — voir l'index unique partiel en base. */
export type Reward = {
  id: string;
  merchant_id: string;
  label: string;
  cost_points: number;
  active: boolean;
  created_at: string;
};

/** Appareil de caisse appairé. token_hash ne sort jamais du serveur. */
export type Device = {
  id: string;
  merchant_id: string;
  label: string;
  token_hash: string;
  last_seen_at: string | null;
  revoked_at: string | null;
  created_at: string;
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
