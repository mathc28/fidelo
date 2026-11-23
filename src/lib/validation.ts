/*
 * Validation des entrées, partagée par les routes (qui l'appliquent) et les
 * formulaires (qui affichent les mêmes limites). Sans dépendance serveur.
 * Chaque fonction renvoie la valeur nettoyée, ou un message d'erreur.
 */

export const LIMITES = {
  prenom: 50,
  email: 254, // RFC 5321
  promoMessage: 140,
  promoTitre: 60,
  libelleCaisse: 50,
  /** Montant maximum d'un ticket crédité en caisse (programmes à points). */
  montantMaxEuros: 10_000,
  // Formulaire de contact de la landing.
  nomCommerce: 100,
  telephone: 30,
  ville: 80,
} as const;

export type Resultat<T> = { ok: true; valeur: T } | { ok: false; erreur: string };

const ok = <T>(valeur: T): Resultat<T> => ({ ok: true, valeur });
const ko = <T>(erreur: string): Resultat<T> => ({ ok: false, erreur });

/** Email plausible, en minuscules, 254 caractères au plus. */
export function validerEmail(brut: unknown): Resultat<string> {
  const email = typeof brut === "string" ? brut.trim().toLowerCase() : "";
  if (!email || email.length > LIMITES.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return ko("Cette adresse email semble incomplète.");
  }
  return ok(email);
}

/** Prénom de 1 à 50 caractères. */
export function validerPrenom(brut: unknown): Resultat<string> {
  const prenom = typeof brut === "string" ? brut.trim() : "";
  if (!prenom) return ko("Indiquez votre prénom.");
  if (prenom.length > LIMITES.prenom) {
    return ko(`Prénom trop long : ${LIMITES.prenom} caractères maximum.`);
  }
  return ok(prenom);
}

/** Message de promo (1 à 140 caractères) et titre facultatif (60 au plus). */
export function validerPromo(
  titreBrut: unknown,
  messageBrut: unknown
): Resultat<{ titre: string | null; message: string }> {
  const message = typeof messageBrut === "string" ? messageBrut.trim() : "";
  if (!message) return ko("Message requis");
  if (message.length > LIMITES.promoMessage) {
    return ko(`Message trop long : ${LIMITES.promoMessage} caractères maximum.`);
  }
  if (titreBrut != null && typeof titreBrut !== "string") return ko("Titre invalide");
  const titre = typeof titreBrut === "string" ? titreBrut.trim() : "";
  if (titre.length > LIMITES.promoTitre) {
    return ko(`Titre trop long : ${LIMITES.promoTitre} caractères maximum.`);
  }
  return ok({ titre: titre || null, message });
}

/** Montant d'un ticket : nombre positif, 10 000 € au plus. */
export function validerMontant(brut: unknown): Resultat<number> {
  const montant = Number(brut);
  if (!Number.isFinite(montant) || montant <= 0) return ko("Montant invalide");
  if (montant > LIMITES.montantMaxEuros) {
    return ko(
      `Montant trop élevé : ${LIMITES.montantMaxEuros.toLocaleString("fr-FR")} € maximum par ticket.`
    );
  }
  return ok(montant);
}

/**
 * Texte sur une seule ligne : caractères de contrôle (retours à la ligne
 * compris) remplacés par une espace, espaces multiples réduits. Les champs
 * du contact finissent dans le sujet d'un email.
 */
function uneLigne(brut: unknown): string {
  if (typeof brut !== "string") return "";
  return brut
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type Prospect = {
  commerce: string;
  prenom: string;
  email: string;
  telephone: string | null;
  ville: string | null;
};

/**
 * Demande de mise en route envoyée depuis la landing : nom du commerce,
 * prénom et email requis ; téléphone et ville facultatifs.
 */
export function validerProspect(corps: Record<string, unknown>): Resultat<Prospect> {
  const commerce = uneLigne(corps.commerce);
  if (!commerce) return ko("Indiquez le nom de votre commerce.");
  if (commerce.length > LIMITES.nomCommerce) {
    return ko(`Nom du commerce trop long : ${LIMITES.nomCommerce} caractères maximum.`);
  }

  const prenom = validerPrenom(uneLigne(corps.prenom));
  if (!prenom.ok) return prenom;
  const email = validerEmail(uneLigne(corps.email));
  if (!email.ok) return email;

  const telephone = uneLigne(corps.telephone);
  if (telephone && !/^\+?[\d\s().-]{6,}$/.test(telephone)) {
    return ko("Ce numéro de téléphone semble incomplet.");
  }
  if (telephone.length > LIMITES.telephone) {
    return ko(`Numéro trop long : ${LIMITES.telephone} caractères maximum.`);
  }

  const ville = uneLigne(corps.ville);
  if (ville.length > LIMITES.ville) {
    return ko(`Nom de ville trop long : ${LIMITES.ville} caractères maximum.`);
  }

  return ok({
    commerce,
    prenom: prenom.valeur,
    email: email.valeur,
    telephone: telephone || null,
    ville: ville || null,
  });
}

/** Libellé de caisse : 50 caractères au plus, « Caisse » s'il est vide. */
export function validerLibelleCaisse(brut: unknown): Resultat<string> {
  if (brut != null && typeof brut !== "string") return ko("Libellé de caisse invalide");
  const libelle = typeof brut === "string" ? brut.trim() : "";
  if (libelle.length > LIMITES.libelleCaisse) {
    return ko(`Libellé trop long : ${LIMITES.libelleCaisse} caractères maximum.`);
  }
  return ok(libelle || "Caisse");
}
