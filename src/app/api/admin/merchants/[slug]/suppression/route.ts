import { NextRequest, NextResponse } from "next/server";
import { isPlatformAdminEmail, requirePlatformAdmin } from "@/lib/platformAdmin";
import { db, getMerchantBySlug, type Merchant } from "@/lib/supabaseAdmin";
import { expireLoyaltyObjects } from "@/lib/googleWallet";
import { revoquerCertificat } from "@/lib/appStoreConnect";

// Expiration des cartes Google une par une : peut prendre du temps.
export const maxDuration = 60;

/*
 * Suppression définitive d'un commerce — back-office plateforme seulement
 * (requirePlatformAdmin, en plus du middleware sur /api/admin/*).
 *
 * GET    : ce qui sera supprimé, pour l'afficher avant confirmation.
 * DELETE : la suppression, si le corps contient { confirmation: "<slug>" }.
 */

type Gerant = { email: string | null; estAdmin: boolean; autresCommerces: number };

async function gerant(merchant: Merchant): Promise<Gerant> {
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

async function inventaire(merchantId: string) {
  const compter = (table: string) =>
    db
      .from(table)
      .select("*", { count: "exact", head: true })
      .eq("merchant_id", merchantId)
      .then((r) => r.count ?? 0);

  const [clients, transactions, promos, caisses, recompenses, cartesApple] = await Promise.all([
    compter("customers"),
    compter("transactions"),
    compter("promos"),
    compter("devices"),
    compter("rewards"),
    // Enregistrements d'iPhone, rattachés aux clients par leur numéro de série.
    db
      .from("apple_registrations")
      .select("id, customers!inner(merchant_id)", { count: "exact", head: true })
      .eq("customers.merchant_id", merchantId)
      .then((r) => r.count ?? 0),
  ]);
  return { clients, cartesApple, transactions, promos, caisses, recompenses };
}

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  if (!(await requirePlatformAdmin(req))) {
    return new NextResponse("Non autorisé", { status: 401 });
  }
  const merchant = await getMerchantBySlug(params.slug);
  if (!merchant) return new NextResponse("Commerce introuvable", { status: 404 });

  const [compte, donnees] = await Promise.all([gerant(merchant), inventaire(merchant.id)]);
  return NextResponse.json({ gerant: compte, donnees });
}

export async function DELETE(req: NextRequest, { params }: { params: { slug: string } }) {
  const admin = await requirePlatformAdmin(req);
  if (!admin) return new NextResponse("Non autorisé", { status: 401 });

  const merchant = await getMerchantBySlug(params.slug);
  if (!merchant) return new NextResponse("Commerce introuvable", { status: 404 });

  const corps = (await req.json().catch(() => null)) as { confirmation?: string } | null;
  if (corps?.confirmation !== merchant.slug) {
    return new NextResponse("Confirmation incorrecte : tapez exactement le slug du commerce", {
      status: 400,
    });
  }

  const compte = await gerant(merchant);
  if (compte.estAdmin) {
    return new NextResponse(
      "Refusé : le gérant de ce commerce est un compte admin plateforme. Retirez-le de PLATFORM_ADMIN_EMAILS ou changez le gérant avant de supprimer.",
      { status: 403 }
    );
  }

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
    return new NextResponse(`Suppression annulée, aucune donnée touchée : ${error.message}`, {
      status: 500,
    });
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
    `[Admin] suppression commerce ${merchant.slug} (${merchant.id}) par ${admin.email} — ` +
      `${bilan.customers} client(s), ${bilan.apple_registrations} enregistrement(s) Apple, ` +
      `${bilan.transactions} transaction(s), ${bilan.promos} promo(s), ${bilan.rewards} récompense(s), ` +
      `${bilan.devices} caisse(s), ${bilan.pairing_codes} code(s) d'appairage, ` +
      `${fichiersSupprimes}/${chemins.length} fichier(s) Storage, ` +
      `Google : ${google.expirees} carte(s) expirée(s), ${google.absentes} absente(s), ${google.echecs} échec(s) ; ` +
      `la classe ${merchant.google_class_id ?? "(aucune)"} reste chez Google ; ` +
      `certificat Apple : ${certificatApple} ; ` +
      `compte du gérant ${compte.email ?? "?"} ${compteAuth}`
  );

  return NextResponse.json(bilan);
}
