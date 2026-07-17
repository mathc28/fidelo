import { config } from "./config";

/**
 * Géocodage via Nominatim (OpenStreetMap) — gratuit, sans clé API.
 * Respecte la politique d'usage : User-Agent identifiant, un appel
 * ponctuel par sauvegarde d'adresse (pas de boucle/bulk).
 */
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": `Fidelo/1.0 (${config.baseUrl})` },
  });
  if (!res.ok) return null;

  const results = (await res.json()) as { lat: string; lon: string }[];
  const first = results[0];
  if (!first) return null;

  return { lat: Number(first.lat), lng: Number(first.lon) };
}
