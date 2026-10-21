import { createHash, timingSafeEqual } from "crypto";

/**
 * La requête vient-elle de la tâche planifiée Vercel ? Vercel envoie
 * `Authorization: Bearer <CRON_SECRET>`. Comparaison en temps constant :
 * les deux valeurs sont hachées d'abord, pour avoir la même longueur sans
 * révéler celle du secret.
 */
export function cronAutorise(entete: string | null, secret = process.env.CRON_SECRET): boolean {
  if (!secret || !entete) return false;
  const attendu = createHash("sha256").update(`Bearer ${secret}`).digest();
  const recu = createHash("sha256").update(entete).digest();
  return timingSafeEqual(attendu, recu);
}
