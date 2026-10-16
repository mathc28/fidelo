import { db, type Merchant } from "./supabaseAdmin";
import { gerant, supprimerCommerceComplet } from "./suppressionCommerce";
import {
  cartesAPurger,
  commercesAPurger,
  limiteInactivite,
  limiteResiliation,
} from "./purgeSelection";

/*
 * Purges RGPD, lancées chaque nuit par la tâche planifiée. Les règles de
 * sélection sont dans purgeSelection.ts (testées) ; ici, leur exécution.
 * Logs préfixés [Purge RGPD].
 */

function log(message: string): void {
  console.log(`[Purge RGPD] ${message}`);
}

/** Découpe une liste pour les filtres `in` (limite de longueur d'URL). */
function lots<T>(liste: T[], taille = 200): T[][] {
  const r: T[][] = [];
  for (let i = 0; i < liste.length; i += taille) r.push(liste.slice(i, i + taille));
  return r;
}

/**
 * Cartes de fidélité inutilisées depuis 3 ans. Supprimer la carte supprime
 * aussi, par cascade dans la même requête, ses transactions et ses
 * enregistrements d'iPhone. Les récompenses ne sont pas touchées : elles
 * appartiennent au commerce, pas au client.
 */
export async function purgerCartesInactives(maintenant = new Date()) {
  const limite = limiteInactivite(maintenant);

  // Candidates : seules les cartes créées avant la limite peuvent être inactives.
  const candidates: { id: string; created_at: string }[] = [];
  for (let page = 0; ; page++) {
    const { data, error } = await db
      .from("customers")
      .select("id, created_at")
      .lt("created_at", limite.toISOString())
      .order("id")
      .range(page * 1000, page * 1000 + 999);
    if (error) throw new Error(`lecture des cartes impossible : ${error.message}`);
    candidates.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }

  // Parmi elles, celles qui ont servi depuis la limite sont conservées.
  const utilisees = new Set<string>();
  for (const lot of lots(candidates.map((c) => c.id))) {
    const { data, error } = await db
      .from("transactions")
      .select("customer_id")
      .in("customer_id", lot)
      .gte("created_at", limite.toISOString());
    if (error) throw new Error(`lecture des transactions impossible : ${error.message}`);
    for (const t of data ?? []) utilisees.add(t.customer_id);
  }

  const aPurger = cartesAPurger(candidates, utilisees, limite);
  const bilan = { cartes: 0, transactions: 0, enregistrementsApple: 0 };

  for (const lot of lots(aPurger)) {
    // Comptées avant que la cascade les emporte, pour le log.
    const [{ count: nTx }, { count: nApple }] = await Promise.all([
      db.from("transactions").select("id", { count: "exact", head: true }).in("customer_id", lot),
      db
        .from("apple_registrations")
        .select("id, customers!inner(id)", { count: "exact", head: true })
        .in("customers.id", lot),
    ]);
    const { data: supprimees, error } = await db
      .from("customers")
      .delete()
      .in("id", lot)
      .select("id");
    if (error) throw new Error(`suppression des cartes impossible : ${error.message}`);
    bilan.cartes += supprimees?.length ?? 0;
    bilan.transactions += nTx ?? 0;
    bilan.enregistrementsApple += nApple ?? 0;
  }

  log(
    `cartes inutilisées depuis le ${limite.toISOString().slice(0, 10)} : ` +
      `${bilan.cartes} carte(s), ${bilan.transactions} transaction(s), ` +
      `${bilan.enregistrementsApple} enregistrement(s) Apple supprimés`
  );
  return bilan;
}

/**
 * Commerces résiliés depuis plus de 3 mois (merchants.resiliated_at) :
 * suppression complète, comme depuis le back-office. Un commerce dont le
 * gérant est admin plateforme n'est jamais purgé.
 */
export async function purgerCommercesResilies(maintenant = new Date()) {
  const limite = limiteResiliation(maintenant);
  const { data, error } = await db
    .from("merchants")
    .select("*")
    .not("resiliated_at", "is", null)
    .lt("resiliated_at", limite.toISOString());
  if (error) throw new Error(`lecture des commerces impossible : ${error.message}`);

  const commerces = (data ?? []) as Merchant[];
  const ids = new Set(commercesAPurger(commerces, limite));
  const bilan = { commerces: 0, ignores: 0, echecs: 0 };

  for (const merchant of commerces.filter((m) => ids.has(m.id))) {
    try {
      const compte = await gerant(merchant);
      if (compte.estAdmin) {
        bilan.ignores++;
        log(`commerce ${merchant.slug} ignoré : son gérant est admin plateforme`);
        continue;
      }
      await supprimerCommerceComplet(merchant, compte, "purge RGPD");
      bilan.commerces++;
    } catch (e) {
      bilan.echecs++;
      log(`commerce ${merchant.slug} NON supprimé : ${(e as Error).message}`);
    }
  }

  log(
    `commerces résiliés avant le ${limite.toISOString().slice(0, 10)} : ` +
      `${bilan.commerces} supprimé(s), ${bilan.ignores} ignoré(s), ${bilan.echecs} échec(s)`
  );
  return bilan;
}
