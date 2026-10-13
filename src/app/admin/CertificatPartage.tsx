"use client";

import { useEffect, useState } from "react";

type Etat = { identifier: string; expiresAt: string; joursRestants: number; alerte: boolean };

/**
 * Échéance du certificat partagé (.env). Pas de renouvellement automatique
 * pour celui-là : l'alerte s'affiche à moins de 45 jours.
 */
export function CertificatPartage({ jeton }: { jeton: string }) {
  const [etat, setEtat] = useState<Etat | null>(null);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    fetch("/api/admin/certificat-partage", { headers: { Authorization: `Bearer ${jeton}` } })
      .then(async (res) => (res.ok ? setEtat(await res.json()) : setErreur(await res.text())))
      .catch(() => setErreur("Pas de connexion."));
  }, [jeton]);

  if (erreur) {
    return (
      <div className="flash flash-error admin-certificat" role="alert">
        <strong>Certificat Apple partagé</strong>
        {erreur}
      </div>
    );
  }
  if (!etat) return null;

  const date = new Date(etat.expiresAt).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  if (etat.alerte) {
    return (
      <div className="flash flash-warning admin-certificat" role="alert">
        <strong>
          Certificat Apple partagé :{" "}
          {etat.joursRestants < 0 ? "expiré" : `expire dans ${etat.joursRestants} jours`}
        </strong>
        {etat.identifier}, valable jusqu&apos;au {date}. À renouveler à la main dans le portail
        Apple Developer, puis à remplacer dans les variables APPLE_SIGNER_CERT_BASE64 et
        APPLE_SIGNER_KEY_BASE64. Sans lui, les cartes sur l&apos;identifiant partagé ne se mettent
        plus à jour.
      </div>
    );
  }
  return (
    <p className="admin-note admin-certificat">
      Certificat Apple partagé <span className="mono">{etat.identifier}</span> valable jusqu&apos;au{" "}
      {date} ({etat.joursRestants} jours).
    </p>
  );
}
