import { NextRequest, NextResponse } from "next/server";
import { log } from "@/lib/appleWebService";

/**
 * L'iPhone signale ici ses propres erreurs avec le web service (certificat,
 * réponse illisible, URL injoignable…). Premier endroit à regarder quand une
 * carte ne se met pas à jour.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { logs?: string[] } | null;
  for (const ligne of body?.logs ?? []) log(`journal de l'iPhone : ${ligne}`);
  if (!body?.logs) log(`journal de l'iPhone (format inattendu) : ${JSON.stringify(body)}`);
  return new NextResponse(null, { status: 200 });
}
