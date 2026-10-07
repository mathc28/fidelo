"use client";

import { useState } from "react";
import { ConfirmButton } from "@/components/ui";
import { pluriel } from "@/lib/uiText";

type Resultat = { appareils: number; acceptes: number; commerces?: number };

/**
 * « Mettre à jour toutes les cartes » : chaque iPhone retélécharge sa carte
 * Apple Wallet, sans notification. Sert après un changement du format de la
 * carte (emplacement, mise en page), pour les clients qui ne repassent pas en
 * caisse. Le résultat affiché est celui d'Apple : envois acceptés par APNs.
 */
export function RafraichirCartes({
  url,
  jeton,
  question,
}: {
  url: string;
  jeton: string;
  question: string;
}) {
  const [enCours, setEnCours] = useState(false);
  const [resultat, setResultat] = useState<Resultat | null>(null);
  const [erreur, setErreur] = useState("");

  async function lancer() {
    setEnCours(true);
    setErreur("");
    setResultat(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${jeton}` },
      });
      if (!res.ok) {
        setErreur((await res.text()) || "La mise à jour a échoué.");
        return;
      }
      setResultat(await res.json());
    } catch {
      setErreur("Pas de connexion : aucune carte n'a été mise à jour.");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="admin-rafraichir">
      <ConfirmButton
        variant="secondary"
        size="sm"
        disabled={enCours}
        question={question}
        confirmLabel={enCours ? "Envoi…" : "Mettre à jour"}
        onConfirm={lancer}
      >
        {enCours ? "Mise à jour…" : "Mettre à jour toutes les cartes"}
      </ConfirmButton>
      <p className="admin-rafraichir-resultat" role="status">
        {resultat &&
          (resultat.appareils === 0
            ? "Aucun iPhone n'a de carte enregistrée : rien à envoyer."
            : `${pluriel(resultat.acceptes, "envoi accepté", "envois acceptés")} par Apple sur ${pluriel(resultat.appareils, "iPhone")}${
                resultat.commerces !== undefined
                  ? ` (${pluriel(resultat.commerces, "commerce")})`
                  : ""
              }.`)}
        {erreur && <span className="field-error">{erreur}</span>}
      </p>
    </div>
  );
}
