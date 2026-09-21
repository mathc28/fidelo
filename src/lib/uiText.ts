/**
 * Petits textes d'interface partagés. Pas de « (s) » ni de message Supabase
 * en anglais à l'écran : un commerçant ou un client ne doit jamais lire la
 * plomberie.
 */

/** « 1 passage », « 3 passages », « 0 passage » (le zéro est singulier en français). */
export function pluriel(n: number, singulier: string, plurielForme = `${singulier}s`): string {
  return `${n} ${Math.abs(n) >= 2 ? plurielForme : singulier}`;
}

/** L'unité d'un programme, accordée. */
export function unite(n: number, isVisits: boolean): string {
  return pluriel(n, isVisits ? "passage" : "point");
}

type ErreurSupabase = { message?: string; code?: string; status?: number } | null | undefined;

/** Traduit une erreur d'authentification Supabase en phrase française. */
export function authErrorFr(error: ErreurSupabase): string {
  const code = error?.code ?? "";
  const msg = (error?.message ?? "").toLowerCase();

  if (code === "invalid_credentials" || msg.includes("invalid login credentials"))
    return "Email ou mot de passe incorrect.";
  if (code === "email_not_confirmed" || msg.includes("email not confirmed"))
    return "Cette adresse n'a pas encore été confirmée. Ouvrez le lien reçu par email.";
  if (code === "same_password" || msg.includes("should be different"))
    return "Choisissez un mot de passe différent de l'actuel.";
  if (code === "weak_password" || msg.includes("password should be at least"))
    return "Mot de passe trop court : 8 caractères minimum.";
  if (
    code === "over_request_rate_limit" ||
    code === "over_email_send_rate_limit" ||
    error?.status === 429 ||
    msg.includes("rate limit")
  )
    return "Trop de tentatives. Patientez une minute avant de réessayer.";
  if (code === "session_expired" || msg.includes("expired") || msg.includes("invalid jwt"))
    return "Ce lien a expiré. Demandez-en un nouveau.";
  if (msg.includes("failed to fetch") || msg.includes("network"))
    return "Pas de connexion. Vérifiez votre réseau et réessayez.";
  return "La connexion a échoué. Réessayez dans un instant.";
}

/** Vérification de forme, pas de délivrabilité : attrape les fautes de frappe. */
export function emailValide(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}
