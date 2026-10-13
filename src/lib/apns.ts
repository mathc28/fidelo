import http2 from "http2";
import { db } from "./supabaseAdmin";
import { identiteCarte, identifiantEffectif } from "./passCerts";
import type { IdentitePass } from "./passIdentite";

/**
 * Mises à jour des cartes Apple Wallet via APNs, en production.
 *
 * Authentification par certificat : le certificat du Pass Type ID (celui qui
 * signe les .pkpass) ouvre aussi la connexion TLS à APNs. Pas de clé .p8 ni
 * de JWT — Apple n'accepte d'ailleurs que le certificat pour les passes.
 *
 * Chaque carte a son Pass Type ID (partagé ou propre à son commerce) : un
 * push part avec le topic ET le certificat de cet identifiant. Les jetons sont
 * donc regroupés par identifiant, une connexion par certificat.
 *
 * Le push ne transporte rien (payload `{}`) : il dit seulement à l'iPhone
 * « cette carte a changé ». L'iPhone redemande alors la liste des cartes
 * modifiées puis télécharge la nouvelle version au web service (/api/apple).
 */

const APNS_HOST = "https://api.push.apple.com";

/** Raisons APNs qui signifient « ce jeton ne servira plus jamais ». */
const RAISONS_JETON_MORT = new Set(["BadDeviceToken", "Unregistered", "ExpiredToken"]);

type Resultat = { token: string; status: number; reason?: string };

/** Un appareil à prévenir, et le Pass Type ID de la carte concernée (null = partagé). */
type Jeton = { token: string; identifiant: string | null };

function connecter(identite: IdentitePass): http2.ClientHttp2Session {
  const client = http2.connect(APNS_HOST, {
    cert: identite.cert,
    key: identite.key,
    ...(identite.passphrase ? { passphrase: identite.passphrase } : {}),
  });
  // Sans écouteur, une erreur de session (TLS refusé, réseau) ferait tomber
  // le processus. Les requêtes en cours la reçoivent aussi et se résolvent.
  client.on("error", (e) => console.error("[APNs] erreur de connexion :", e.message));
  return client;
}

function pushToDevice(
  client: http2.ClientHttp2Session,
  token: string,
  topic: string
): Promise<Resultat> {
  return new Promise((resolve) => {
    let status = 0;
    let corps = "";
    const req = client.request({
      ":method": "POST",
      ":path": `/3/device/${token}`,
      "apns-topic": topic,
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

/** Envoie à un groupe de jetons qui partagent le même Pass Type ID. */
async function pushGroupe(
  identifiant: string,
  tokens: string[],
  contexte: string
): Promise<Resultat[]> {
  // Un certificat absent ou illisible ne doit pas faire échouer le scan ou
  // la promo qui a déclenché le push : on le signale et on passe.
  let client: http2.ClientHttp2Session;
  let topic: string;
  try {
    const identite = await identiteCarte(identifiant);
    topic = identite.passTypeIdentifier;
    client = connecter(identite);
  } catch (e) {
    console.error(
      `[APNs] ${contexte} · ${identifiant} : connexion impossible —`,
      (e as Error).message
    );
    return [];
  }
  const resultats: Resultat[] = [];
  try {
    for (let i = 0; i < tokens.length; i += 50) {
      resultats.push(
        ...(await Promise.all(tokens.slice(i, i + 50).map((t) => pushToDevice(client, t, topic))))
      );
    }
  } finally {
    client.close();
  }
  return resultats;
}

async function pushTokens(jetons: Jeton[], contexte: string): Promise<number> {
  if (!jetons.length) {
    console.log(`[APNs] ${contexte} : aucun appareil enregistré, rien à envoyer`);
    return 0;
  }

  // Regroupement par Pass Type ID effectif, sans doublon de jeton.
  const groupes = new Map<string, Set<string>>();
  for (const j of jetons) {
    const id = identifiantEffectif(j.identifiant);
    if (!groupes.has(id)) groupes.set(id, new Set());
    groupes.get(id)!.add(j.token);
  }
  const resultats: Resultat[] = [];
  for (const [identifiant, tokens] of groupes) {
    resultats.push(...(await pushGroupe(identifiant, [...tokens], contexte)));
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

type LigneEnregistrement = {
  push_token: string;
  customers: { pass_type_identifier: string | null };
};

/** Push tous les appareils enregistrés pour UN pass. */
export async function pushPassUpdate(serialNumber: string): Promise<void> {
  const { data: regs } = await db
    .from("apple_registrations")
    .select("push_token, customers!inner(pass_type_identifier)")
    .eq("serial_number", serialNumber)
    .returns<LigneEnregistrement[]>();
  await pushTokens(
    (regs ?? []).map((r) => ({
      token: r.push_token,
      identifiant: r.customers.pass_type_identifier,
    })),
    `carte ${serialNumber.slice(0, 8)}`
  );
}

/** Jetons APNs de tous les iPhone qui portent une carte du commerce. */
async function jetonsDuCommerce(merchantId: string): Promise<Jeton[]> {
  const { data: regs } = await db
    .from("apple_registrations")
    .select("push_token, customers!inner(pass_type_identifier, merchant_id)")
    .eq("customers.merchant_id", merchantId)
    .returns<LigneEnregistrement[]>();
  return (regs ?? []).map((r) => ({
    token: r.push_token,
    identifiant: r.customers.pass_type_identifier,
  }));
}

/**
 * Push tous les pass d'UN merchant (promo) — jamais toute la plateforme.
 * Renvoie le nombre d'appareils dont Apple a accepté le push.
 */
export async function pushMerchantPasses(merchantId: string): Promise<number> {
  return pushTokens(await jetonsDuCommerce(merchantId), `commerce ${merchantId.slice(0, 8)}`);
}

/**
 * Remise à niveau silencieuse de toutes les cartes Apple d'un commerce
 * (back-office) : les iPhone retéléchargent la carte telle que le code la
 * génère aujourd'hui (emplacement, mise en page…).
 *
 * Silencieuse par construction : le seul champ portant un changeMessage est
 * le « Message » de promo, et sa valeur ne bouge pas ici — c'est la promo en
 * cours, déjà reçue au moment de son envoi, ou rien.
 */
export async function rafraichirCartesCommerce(
  merchantId: string
): Promise<{ appareils: number; acceptes: number }> {
  // Sans ce marquage, l'iPhone demanderait la liste des cartes modifiées,
  // n'en trouverait aucune et ne téléchargerait rien.
  await db
    .from("customers")
    .update({ updated_at: new Date().toISOString() })
    .eq("merchant_id", merchantId);

  const jetons = await jetonsDuCommerce(merchantId);
  const acceptes = await pushTokens(jetons, `remise à niveau commerce ${merchantId.slice(0, 8)}`);
  return { appareils: new Set(jetons.map((j) => j.token)).size, acceptes };
}
