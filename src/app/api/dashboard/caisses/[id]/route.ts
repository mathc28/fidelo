import { NextRequest, NextResponse } from "next/server";
import { exigerCommercantAJour } from "@/lib/cgvServeur";
import { db } from "@/lib/supabaseAdmin";

/** DELETE — retire une caisse du commerce : son jeton est révoqué. */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const garde = await exigerCommercantAJour(req);
  if ("reponse" in garde) return garde.reponse;
  const { merchant } = garde;

  const { data, error } = await db
    .from("devices")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", params.id)
    .eq("merchant_id", merchant.id)
    .is("revoked_at", null)
    .select("id");

  if (error) return new NextResponse("La caisse n'a pas pu être retirée.", { status: 500 });
  if (!data?.length) return new NextResponse("Caisse introuvable", { status: 404 });
  return new NextResponse(null, { status: 204 });
}
