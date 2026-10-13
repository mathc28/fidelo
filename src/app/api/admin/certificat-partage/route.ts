import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/platformAdmin";
import { expirationCertificatPartage } from "@/lib/passCerts";

/** Seuil d'alerte du back-office avant l'expiration du certificat partagé. */
const ALERTE_JOURS = 45;

/** GET — échéance du certificat partagé (pass.com.fidelo.loyalty, .env). */
export async function GET(req: NextRequest) {
  if (!(await requirePlatformAdmin(req))) {
    return new NextResponse("Non autorisé", { status: 401 });
  }
  try {
    const { identifier, expiresAt } = expirationCertificatPartage();
    const joursRestants = Math.floor((expiresAt.getTime() - Date.now()) / (24 * 3600 * 1000));
    return NextResponse.json({
      identifier,
      expiresAt: expiresAt.toISOString(),
      joursRestants,
      alerte: joursRestants < ALERTE_JOURS,
    });
  } catch (e) {
    return new NextResponse(`Certificat partagé illisible : ${(e as Error).message}`, {
      status: 500,
    });
  }
}
