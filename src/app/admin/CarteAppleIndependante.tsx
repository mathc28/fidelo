"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { pluriel } from "@/lib/uiText";

type Etat = {
  certificat: { identifier: string; expiresAt: string } | null;
  cartes: { dediees: number; partagees: number };
};

/**
 * Carte Apple indépendante : le commerce a son propre Pass Type ID, ses
 * cartes ne s'empilent plus avec celles des autres commerces dans Wallet.
 */
export function CarteAppleIndependante({ slug, jeton }: { slug: string; jeton: string }) {
  const [etat, setEtat] = useState<Etat | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");

  const url = `/api/admin/merchants/${slug}/carte-apple`;

  useEffect(() => {
    fetch(url, { headers: { Authorization: `Bearer ${jeton}` } })
      .then(async (res) => (res.ok ? setEtat(await res.json()) : setErreur(await res.text())))
      .catch(() => setErreur("Pas de connexion."));
  }, [url, jeton]);

  async function activer() {
    setEnCours(true);
    setErreur("");
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${jeton}` },
      });
      if (!res.ok) {
        setErreur((await res.text()) || "La création a échoué.");
        return;
      }
      setEtat(await res.json());
    } catch {
      setErreur("Pas de connexion : rien n'a été créé.");
    } finally {
      setEnCours(false);
    }
  }

  if (!etat && !erreur) return <p className="admin-note">Chargement…</p>;

  return (
    <div>
      {etat?.certificat ? (
        <>
          <p className="admin-ligne-titre mono">{etat.certificat.identifier}</p>
          <p className="admin-ligne-meta">
            Certificat valable jusqu&apos;au{" "}
            {new Date(etat.certificat.expiresAt).toLocaleDateString("fr-FR")}, renouvelé
            automatiquement.
          </p>
          <p className="admin-note">
            {pluriel(etat.cartes.dediees, "carte indépendante", "cartes indépendantes")} ·{" "}
            {pluriel(etat.cartes.partagees, "carte", "cartes")} encore sur l&apos;identifiant
            partagé (créées avant l&apos;activation : elles le gardent).
          </p>
        </>
      ) : (
        <>
          <p className="admin-note">
            Les cartes de ce commerce utilisent l&apos;identifiant partagé et s&apos;empilent avec
            celles des autres commerces dans Apple Wallet. Les cartes créées après l&apos;activation
            seront indépendantes ; celles déjà installées ne changent pas.
          </p>
          <Button size="sm" disabled={enCours} onClick={activer}>
            {enCours
              ? "Création chez Apple…"
              : erreur
                ? "Réessayer"
                : "Activer une carte Apple indépendante"}
          </Button>
        </>
      )}
      {erreur && (
        <p className="field-error" role="alert">
          {erreur}
        </p>
      )}
    </div>
  );
}
