import { NextRequest, NextResponse } from "next/server";
import { exigerCommercantAJour } from "@/lib/cgvServeur";
import { db } from "@/lib/supabaseAdmin";

/**
 * POST { label, cost_points } — enregistre la récompense du commerce.
 * Le commerce n'en a qu'une : la ligne active est mise à jour, ou créée à la
 * première sauvegarde (l'index unique partiel en base interdit d'en avoir
 * deux actives).
 */
export async function POST(req: NextRequest) {
  const garde = await exigerCommercantAJour(req);
  if ("reponse" in garde) return garde.reponse;
  const { merchant } = garde;

  const corps = (await req.json().catch(() => null)) as {
    label?: unknown;
    cost_points?: unknown;
  } | null;
  const label = typeof corps?.label === "string" ? corps.label.trim() : "";
  const cout = Number(corps?.cost_points);
  if (!label) return new NextResponse("Indiquez ce que le client gagne.", { status: 400 });
  if (!Number.isInteger(cout) || cout <= 0) {
    return new NextResponse("Le seuil doit être un nombre entier, 1 ou plus.", { status: 400 });
  }

  const { data: existante } = await db
    .from("rewards")
    .select("id")
    .eq("merchant_id", merchant.id)
    .eq("active", true)
    .maybeSingle();

  const { data, error } = existante
    ? await db
        .from("rewards")
        .update({ label, cost_points: cout })
        .eq("id", existante.id)
        .select()
        .single()
    : await db
        .from("rewards")
        .insert({ merchant_id: merchant.id, label, cost_points: cout })
        .select()
        .single();

  if (error || !data) {
    return new NextResponse("Enregistrement impossible. Réessayez dans un instant.", {
      status: 500,
    });
  }
  return NextResponse.json({ reward: data });
}
