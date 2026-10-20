/** Adresse de contact unique du site : boutons, pages légales, dashboard. */
export const EMAIL_CONTACT = "hellofiduo@gmail.com";

/** Tant qu'il n'y a pas d'inscription en libre-service, l'action est honnête : on écrit. */
export const CONTACT = `mailto:${EMAIL_CONTACT}?subject=D%C3%A9marrer%20avec%20Fiduo`;
export const CTA = "Démarrer";

/**
 * Version des CGV enregistrée avec l'acceptation du commerçant
 * (merchants.cgv_version). À changer à chaque nouvelle version publiée sur
 * /cgv, en même temps que le texte : c'est elle qui prouve quelle version a
 * été acceptée, et quand.
 */
export const CGV_VERSION = "1.0";

/**
 * Identité de l'éditeur, reprise par les mentions légales, la politique de
 * confidentialité et les CGV.
 */
export const EDITEUR = {
  adresse: "90 cours Vitton, 69006 Lyon",
  siret: "942 798 760 00016",
  ape: "62.01Z",
  tva: "TVA non applicable, art. 293 B du CGI",
  telephone: "06 26 27 48 03",
} as const;

/** Région des serveurs Supabase (base de données et fichiers). */
export const REGION_SUPABASE = "Union européenne (Irlande)";

/** Date de dernière mise à jour des pages légales et d'entrée en vigueur des CGV. */
export const DATE_PAGES_LEGALES = "20 octobre 2026";
