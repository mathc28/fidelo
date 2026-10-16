import { isPlatformAdminEmail } from "./platformAdmin";
import { db, type Merchant } from "./supabaseAdmin";
import { expireLoyaltyObjects } from "./googleWallet";
import { revoquerCertificat } from "./appStoreConnect";

/*
 * Suppression définitive d'un commerce, partagée par le back-office
 * (bouton « Supprimer définitivement ») et la purge RGPD des commerces
 * résiliés. Les garde-fous propres à chaque appelant (confirmation par le
 * slug, refus des comptes admin plateforme) restent chez l'appelant.
 */

/** La base a refusé : rien n'a été supprimé. */
export class ErreurSuppression extends Error {}

export type Gerant = { email: string | null; estAdmin: boolean; autresCommerces: number };

export async function gerant(merchant: Merchant): Promise<Gerant> {
  const [{ data }, { count }] = await Promise.all([
    db.auth.admin.getUserById(merchant.owner_id),
    db
      .from("merchants")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", merchant.owner_id)
      .neq("id", merchant.id),
  ]);
  const email = data.user?.email ?? null;
  return { email, estAdmin: isPlatformAdminEmail(email ?? undefined), autresCommerces: count ?? 0 };
}

/**
 * Supprime le commerce : base (une transaction, fonction supprimer_commerce),
 * puis, sans retour en arrière possible, fichiers Storage, cartes Google
 * expirées, certificat Apple révoqué, compte Auth du gérant. Lève
 * ErreurSuppression si la base refuse — dans ce cas rien n'est touché.
 * `par` : qui supprime, pour le log (email admin, « purge RGPD »).
 */
export async function supprimerCommerceComplet(merchant: Merchant, compte: Gerant, par: string) {
  // Ce qu'il faudra traiter hors base, relevé avant que les lignes disparaissent.
  const [{ data: clients }, { data: fichiers }, { data: certPass }] = await Promise.all([
    db.from("customers").select("serial_number").eq("merchant_id", merchant.id),
    db.storage.from("pass-assets").list(merchant.id, { limit: 1000 }),
    db
      .from("merchant_pass_certs")
      .select("pass_type_identifier, asc_certificate_id")
      .eq("merchant_id", merchant.id)
      .maybeSingle(),
  ]);
  const serials = (clients ?? []).map((c) => c.serial_number);

  // 1. Base de données : une seule transaction (fonction supprimer_commerce).
  const { data: supprime, error } = await db.rpc("supprimer_commerce", {
    p_merchant_id: merchant.id,
  });
  if (error) {
    console.error(
      `[Admin] suppression commerce ${merchant.slug} ÉCHOUÉE, rien supprimé :`,
      error.message
    );
    throw new ErreurSuppression(error.message);
  }

  // À partir d'ici le commerce n'existe plus : chaque étape suivante est
  // tentée et son résultat loggé, sans revenir en arrière.

  // 2. Fichiers du commerce dans le bucket pass-assets (logo et dérivés).
  const chemins = (fichiers ?? []).map((f) => `${merchant.id}/${f.name}`);
  let fichiersSupprimes = 0;
  if (chemins.length) {
    const { data: retires, error: errStorage } = await db.storage
      .from("pass-assets")
      .remove(chemins);
    if (errStorage)
      console.error(`[Admin] fichiers de ${merchant.slug} non supprimés :`, errStorage.message);
    fichiersSupprimes = retires?.length ?? 0;
  }

  // 3. Google Wallet : les classes ne se suppriment pas, on expire les cartes.
  const google = serials.length
    ? await expireLoyaltyObjects(serials)
    : { expirees: 0, absentes: 0, echecs: 0 };

  // 4. Certificat Apple propre au commerce : révoqué chez Apple (best effort).
  //    Le Pass Type ID lui-même reste déclaré dans le compte développeur.
  let certificatApple = "aucun (identifiant partagé)";
  if (certPass) {
    certificatApple = await revoquerCertificat(certPass.asc_certificate_id)
      .then(() => `${certPass.asc_certificate_id} révoqué`)
      .catch((e) => `${certPass.asc_certificate_id} NON révoqué (${(e as Error).message})`);
    certificatApple += ` ; Pass Type ID ${certPass.pass_type_identifier} conservé chez Apple`;
  }

  // 5. Compte Auth du gérant, s'il ne gère aucun autre commerce.
  let compteAuth: string;
  if (compte.autresCommerces > 0) {
    compteAuth = `conservé (gère encore ${compte.autresCommerces} autre(s) commerce(s))`;
  } else {
    const { error: errAuth } = await db.auth.admin.deleteUser(merchant.owner_id);
    compteAuth = errAuth ? `NON supprimé (${errAuth.message})` : "supprimé";
  }

  const base = supprime as {
    customers: number;
    apple_registrations: number;
    transactions: number;
    promos: number;
    rewards: number;
    devices: number;
    pairing_codes: number;
    pass_certs?: number;
  };
  const bilan = {
    ...base,
    fichiers: fichiersSupprimes,
    google,
    certificatApple,
    compteAuth,
  };
  console.log(
    `[Admin] suppression commerce ${merchant.slug} (${merchant.id}) par ${par} — ` +
      `${bilan.customers} client(s), ${bilan.apple_registrations} enregistrement(s) Apple, ` +
      `${bilan.transactions} transaction(s), ${bilan.promos} promo(s), ${bilan.rewards} récompense(s), ` +
      `${bilan.devices} caisse(s), ${bilan.pairing_codes} code(s) d'appairage, ` +
      `${fichiersSupprimes}/${chemins.length} fichier(s) Storage, ` +
      `Google : ${google.expirees} carte(s) expirée(s), ${google.absentes} absente(s), ${google.echecs} échec(s) ; ` +
      `la classe ${merchant.google_class_id ?? "(aucune)"} reste chez Google ; ` +
      `certificat Apple : ${certificatApple} ; ` +
      `compte du gérant ${compte.email ?? "?"} ${compteAuth}`
  );

  return bilan;
}
