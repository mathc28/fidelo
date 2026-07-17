import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/platformAdmin";
import { db } from "@/lib/supabaseAdmin";
import { config } from "@/lib/config";

/** GET — liste des commerçants de la plateforme (back-office). */
export async function GET(req: NextRequest) {
  if (!(await requirePlatformAdmin(req))) {
    return new NextResponse("Non autorisé", { status: 401 });
  }

  const { data } = await db
    .from("merchants")
    .select("id, slug, name, program_type, subscription_status, created_at")
    .order("created_at", { ascending: false });

  const { data: customerRows } = await db.from("customers").select("merchant_id");
  const cardCounts = new Map<string, number>();
  for (const { merchant_id } of customerRows ?? []) {
    cardCounts.set(merchant_id, (cardCounts.get(merchant_id) ?? 0) + 1);
  }

  const merchants = (data ?? []).map((m) => ({ ...m, cards: cardCounts.get(m.id) ?? 0 }));
  return NextResponse.json({ merchants });
}

/**
 * POST — création d'un commerçant par l'admin plateforme :
 * 1. Invite le gérant par email (Supabase envoie le lien d'invitation)
 * 2. Crée la ligne merchants rattachée à ce nouvel utilisateur
 * 3. Crée la première récompense
 *
 * Le gérant clique le lien → /definir-mot-de-passe → son dashboard.
 */
export async function POST(req: NextRequest) {
  if (!(await requirePlatformAdmin(req))) {
    return new NextResponse("Non autorisé", { status: 401 });
  }

  const { name, slug, ownerEmail, programType, rewardLabel, rewardCost, address, lat, lng } =
    await req.json();

  if (!name || !slug || !ownerEmail || !programType) {
    return new NextResponse("name, slug, ownerEmail et programType requis", { status: 400 });
  }

  const cleanSlug = String(slug).toLowerCase().trim().replace(/[^a-z0-9-]/g, "-");
  const email = String(ownerEmail).toLowerCase().trim();

  // Slug déjà pris ?
  const { data: existingSlug } = await db
    .from("merchants").select("id").eq("slug", cleanSlug).single();
  if (existingSlug) return new NextResponse("Ce slug est déjà utilisé", { status: 409 });

  // 1. Inviter le gérant. Si le compte existe déjà (re-création après erreur),
  //    on le récupère au lieu d'échouer.
  let ownerId: string;
  const { data: invited, error: inviteError } = await db.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${config.baseUrl}/definir-mot-de-passe`,
  });

  if (inviteError) {
    const { data: list } = await db.auth.admin.listUsers();
    const existing = list?.users.find((u) => u.email?.toLowerCase() === email);
    if (!existing) {
      return new NextResponse(`Invitation impossible : ${inviteError.message}`, { status: 500 });
    }
    ownerId = existing.id;
  } else {
    ownerId = invited.user.id;
  }

  // Un gérant = un commerce (contrainte V1, index unique sur owner_id)
  const { data: existingMerchant } = await db
    .from("merchants").select("slug").eq("owner_id", ownerId).single();
  if (existingMerchant) {
    return new NextResponse(
      `Ce gérant a déjà un commerce (${existingMerchant.slug})`, { status: 409 }
    );
  }

  // 2. Créer le commerce
  const { data: merchant, error: merchantError } = await db
    .from("merchants")
    .insert({
      owner_id: ownerId,
      slug: cleanSlug,
      name: String(name).trim(),
      program_type: programType === "points" ? "points" : "visits",
      address: address || null,
      lat: lat ?? null,
      lng: lng ?? null,
    })
    .select()
    .single();

  if (merchantError) {
    return new NextResponse(`Erreur création commerce : ${merchantError.message}`, { status: 500 });
  }

  // 3. Première récompense (optionnelle)
  if (rewardLabel && rewardCost) {
    await db.from("rewards").insert({
      merchant_id: merchant.id,
      label: String(rewardLabel).trim(),
      cost_points: Number(rewardCost),
    });
  }

  return NextResponse.json({
    ok: true,
    merchant: { slug: merchant.slug, name: merchant.name },
    invitationSentTo: email,
    inscriptionUrl: `${config.baseUrl}/m/${merchant.slug}/inscription`,
  });
}
