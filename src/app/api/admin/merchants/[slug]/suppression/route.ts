import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/platformAdmin";
import { db, getMerchantBySlug } from "@/lib/supabaseAdmin";
import { ErreurSuppression, gerant, supprimerCommerceComplet } from "@/lib/suppressionCommerce";

// Expiration des cartes Google une par une : peut prendre du temps.
export const maxDuration = 60;

/*
 * Suppression définitive d'un commerce — back-office plateforme seulement
 * (requirePlatformAdmin, en plus du middleware sur /api/admin/*).
 *
 * GET    : ce qui sera supprimé, pour l'afficher avant confirmation.
 * DELETE : la suppression, si le corps contient { confirmation: "<slug>" }.
 */

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

  try {
    return NextResponse.json(
      await supprimerCommerceComplet(merchant, compte, admin.email ?? "admin")
    );
  } catch (e) {
    if (e instanceof ErreurSuppression) {
      return new NextResponse(`Suppression annulée, aucune donnée touchée : ${e.message}`, {
        status: 500,
      });
    }
    throw e;
  }
}
