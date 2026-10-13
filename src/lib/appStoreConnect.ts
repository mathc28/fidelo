import jwt from "jsonwebtoken";

/*
 * Client minimal de l'API App Store Connect, pour les Pass Type IDs et leurs
 * certificats. Serveur uniquement : la clé API ouvre le compte développeur.
 *
 * Variables (jamais NEXT_PUBLIC_) :
 *   ASC_KEY_ID       identifiant de la clé API (App Store Connect → Utilisateurs
 *                    et accès → Intégrations → API App Store Connect)
 *   ASC_ISSUER_ID    identifiant de l'émetteur, même page
 *   ASC_PRIVATE_KEY  contenu du fichier .p8, encodé en base64
 */

const API = "https://api.appstoreconnect.apple.com/v1";

function variable(nom: string): string {
  const v = process.env[nom];
  if (!v) throw new Error(`Variable d'environnement manquante : ${nom}`);
  return v;
}

/** Jeton ES256 de 15 minutes (Apple refuse au-delà de 20). */
function jeton(): string {
  const maintenant = Math.floor(Date.now() / 1000);
  return jwt.sign(
    {
      iss: variable("ASC_ISSUER_ID"),
      iat: maintenant,
      exp: maintenant + 15 * 60,
      aud: "appstoreconnect-v1",
    },
    Buffer.from(variable("ASC_PRIVATE_KEY"), "base64").toString("utf8"),
    { algorithm: "ES256", header: { alg: "ES256", kid: variable("ASC_KEY_ID"), typ: "JWT" } }
  );
}

export class ErreurAppStoreConnect extends Error {
  constructor(
    public status: number,
    public details: string
  ) {
    super(`App Store Connect ${status} : ${details}`);
  }
}

async function appel<T>(methode: "GET" | "POST" | "DELETE", chemin: string, corps?: unknown) {
  const res = await fetch(`${API}${chemin}`, {
    method: methode,
    headers: {
      Authorization: `Bearer ${jeton()}`,
      ...(corps ? { "Content-Type": "application/json" } : {}),
    },
    body: corps ? JSON.stringify(corps) : undefined,
    cache: "no-store",
  });
  if (!res.ok) {
    // Apple détaille l'erreur dans errors[].detail.
    const texte = await res.text();
    let details = texte;
    try {
      const json = JSON.parse(texte) as { errors?: { detail?: string; title?: string }[] };
      details = json.errors?.map((e) => e.detail ?? e.title).join(" ; ") || texte;
    } catch {}
    throw new ErreurAppStoreConnect(res.status, details);
  }
  return (res.status === 204 ? null : await res.json()) as T;
}

type Ressource<A> = { data: { id: string; attributes: A } };
type Liste<A> = { data: { id: string; attributes: A }[] };

/** Retrouve un Pass Type ID déjà déclaré chez Apple, ou null. */
export async function trouverPassTypeId(identifier: string): Promise<string | null> {
  const r = await appel<Liste<{ identifier: string }>>(
    "GET",
    `/passTypeIds?filter[identifier]=${encodeURIComponent(identifier)}`
  );
  return r.data.find((p) => p.attributes.identifier === identifier)?.id ?? null;
}

export async function creerPassTypeId(identifier: string, name: string): Promise<string> {
  const r = await appel<Ressource<{ identifier: string }>>("POST", "/passTypeIds", {
    data: { type: "passTypeIds", attributes: { identifier, name } },
  });
  return r.data.id;
}

export type CertificatApple = { id: string; certificateContent: string; expirationDate: string };

/** Certificat PASS_TYPE_ID signé par Apple à partir de notre CSR (PEM). */
export async function creerCertificatPass(
  ascPassTypeId: string,
  csrPem: string
): Promise<CertificatApple> {
  const r = await appel<Ressource<{ certificateContent: string; expirationDate: string }>>(
    "POST",
    "/certificates",
    {
      data: {
        type: "certificates",
        attributes: { certificateType: "PASS_TYPE_ID", csrContent: csrPem },
        relationships: { passTypeId: { data: { type: "passTypeIds", id: ascPassTypeId } } },
      },
    }
  );
  return { id: r.data.id, ...r.data.attributes };
}

/** Révoque un certificat. */
export async function revoquerCertificat(ascCertificateId: string): Promise<void> {
  await appel("DELETE", `/certificates/${ascCertificateId}`);
}
