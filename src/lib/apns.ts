import http2 from "http2";
import { config } from "./config";
import { db } from "./supabaseAdmin";

/**
 * Mises à jour des cartes Apple Wallet via APNs, en production.
 *
 * Authentification par certificat : le certificat du Pass Type ID (celui qui
 * signe les .pkpass) ouvre aussi la connexion TLS à APNs. Pas de clé .p8 ni
 * de JWT — Apple n'accepte d'ailleurs que le certificat pour les passes.
 *
 * Le push ne transporte rien (payload `{}`) : il dit seulement à l'iPhone
 * « cette carte a changé ». L'iPhone redemande alors la liste des cartes
 * modifiées puis télécharge la nouvelle version au web service (/api/apple).
 */

const APNS_HOST = "https://api.push.apple.com";

/** Raisons APNs qui signifient « ce jeton ne servira plus jamais ». */
const RAISONS_JETON_MORT = new Set(["BadDeviceToken", "Unregistered", "ExpiredToken"]);

type Resultat = { token: string; status: number; reason?: string };

function connecter(): http2.ClientHttp2Session {
  const client = http2.connect(APNS_HOST, {
    cert: config.apple.signerCert(),
    key: config.apple.signerKey(),
    ...(config.apple.signerKeyPassphrase ? { passphrase: config.apple.signerKeyPassphrase } : {}),
  });
  // Sans écouteur, une erreur de session (TLS refusé, réseau) ferait tomber
  // le processus. Les requêtes en cours la reçoivent aussi et se résolvent.
  client.on("error", (e) => console.error("[APNs] erreur de connexion :", e.message));
  return client;
}

function pushToDevice(client: http2.ClientHttp2Session, token: string): Promise<Resultat> {
  return new Promise((resolve) => {
    let status = 0;
    let corps = "";
    const req = client.request({
      ":method": "POST",
      ":path": `/3/device/${token}`,
      "apns-topic": config.apple.passTypeId,
    });
    req.setEncoding("utf8");
    req.on("response", (h) => {
      status = Number(h[":status"] ?? 0);
    });
    // En cas d'échec, Apple renvoie { "reason": "BadDeviceToken" } etc.
    req.on("data", (morceau: string) => {
      corps += morceau;
    });
    req.on("close", () => {
      let reason: string | undefined;
      try {
        reason = corps ? (JSON.parse(corps).reason as string) : undefined;
      } catch {
        reason = corps || undefined;
      }
      resolve({ token, status, reason });
    });
    req.on("error", (e) => resolve({ token, status: 0, reason: e.message }));
    req.end(JSON.stringify({}));
  });
}

/** Les 8 derniers caractères suffisent à reconnaître un jeton dans les logs. */
function court(token: string): string {
  return `…${token.slice(-8)}`;
}

async function pushTokens(tokens: string[], contexte: string): Promise<number> {
  if (!tokens.length) {
    console.log(`[APNs] ${contexte} : aucun appareil enregistré, rien à envoyer`);
    return 0;
  }

  // Un certificat absent ou illisible ne doit pas faire échouer le scan ou
  // la promo qui a déclenché le push : on le signale et on s'arrête là.
  let client: http2.ClientHttp2Session;
  try {
    client = connecter();
  } catch (e) {
    console.error(`[APNs] ${contexte} : connexion impossible —`, (e as Error).message);
    return 0;
  }
  const resultats: Resultat[] = [];
  try {
    for (let i = 0; i < tokens.length; i += 50) {
      resultats.push(
        ...(await Promise.all(tokens.slice(i, i + 50).map((t) => pushToDevice(client, t))))
      );
    }
  } finally {
    client.close();
  }

  for (const r of resultats) {
    console.log(
      `[APNs] ${contexte} · appareil ${court(r.token)} → ${r.status}${r.reason ? ` (${r.reason})` : ""}`
    );
  }

  // Jetons rejetés comme invalides : l'iPhone a supprimé la carte ou l'app a
  // été réinstallée. On efface leurs enregistrements pour ne plus les pousser.
  const morts = resultats
    .filter((r) => r.status === 410 || (r.reason && RAISONS_JETON_MORT.has(r.reason)))
    .map((r) => r.token);
  if (morts.length) {
    const { error } = await db.from("apple_registrations").delete().in("push_token", morts);
    console.log(
      `[APNs] ${contexte} : ${morts.length} jeton(s) invalide(s) ${error ? `NON supprimé(s) — ${error.message}` : "supprimé(s)"}`
    );
  }

  const ok = resultats.filter((r) => r.status === 200).length;
  console.log(`[APNs] ${contexte} : ${ok}/${resultats.length} push accepté(s) par Apple`);
  return ok;
}

/** Push tous les appareils enregistrés pour UN pass. */
export async function pushPassUpdate(serialNumber: string): Promise<void> {
  const { data: regs } = await db
    .from("apple_registrations")
    .select("push_token")
    .eq("serial_number", serialNumber);
  await pushTokens(
    [...new Set((regs ?? []).map((r) => r.push_token))],
    `carte ${serialNumber.slice(0, 8)}`
  );
}

/**
 * Push tous les pass d'UN merchant (promo) — jamais toute la plateforme.
 * Renvoie le nombre d'appareils dont Apple a accepté le push.
 */
export async function pushMerchantPasses(merchantId: string): Promise<number> {
  const { data: customers } = await db
    .from("customers")
    .select("serial_number")
    .eq("merchant_id", merchantId);

  if (!customers?.length) return 0;

  const { data: regs } = await db
    .from("apple_registrations")
    .select("push_token")
    .in(
      "serial_number",
      customers.map((c) => c.serial_number)
    );

  const tokens = [...new Set((regs ?? []).map((r) => r.push_token))];
  return pushTokens(tokens, `commerce ${merchantId.slice(0, 8)}`);
}
