"use client";

import { useState } from "react";
import { Button, Field } from "@/components/ui";
import { pluriel } from "@/lib/uiText";

type Apercu = {
  gerant: { email: string | null; estAdmin: boolean; autresCommerces: number };
  donnees: {
    clients: number;
    cartesApple: number;
    transactions: number;
    promos: number;
    caisses: number;
    recompenses: number;
  };
};

type Bilan = {
  customers: number;
  apple_registrations: number;
  transactions: number;
  promos: number;
  devices: number;
  fichiers: number;
  google: { expirees: number; absentes: number; echecs: number };
  compteAuth: string;
};

/**
 * « Supprimer définitivement ce commerce » : inventaire de ce qui va
 * disparaître, puis confirmation en tapant le slug. Irréversible.
 */
export function SuppressionCommerce({
  slug,
  nom,
  jeton,
}: {
  slug: string;
  nom: string;
  jeton: string;
}) {
  const [apercu, setApercu] = useState<Apercu | null>(null);
  const [saisie, setSaisie] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");
  const [bilan, setBilan] = useState<Bilan | null>(null);

  const url = `/api/admin/merchants/${slug}/suppression`;

  async function preparer() {
    setEnCours(true);
    setErreur("");
    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${jeton}` } });
      if (!res.ok) {
        setErreur((await res.text()) || "L'inventaire n'a pas pu être chargé.");
        return;
      }
      setApercu(await res.json());
    } catch {
      setErreur("Pas de connexion.");
    } finally {
      setEnCours(false);
    }
  }

  async function supprimer() {
    setEnCours(true);
    setErreur("");
    try {
      const res = await fetch(url, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${jeton}` },
        body: JSON.stringify({ confirmation: saisie }),
      });
      if (!res.ok) {
        setErreur((await res.text()) || "La suppression a échoué.");
        return;
      }
      setBilan(await res.json());
    } catch {
      setErreur(
        "Pas de connexion : impossible de savoir si la suppression a eu lieu. Rechargez la fiche avant de réessayer."
      );
    } finally {
      setEnCours(false);
    }
  }

  if (bilan) {
    return (
      <div className="admin-danger-bilan" role="status">
        <p className="admin-ligne-titre">{nom} a été supprimé.</p>
        <ul className="admin-danger-liste">
          <li>{pluriel(bilan.customers, "client")}</li>
          <li>
            {pluriel(bilan.apple_registrations, "enregistrement Apple", "enregistrements Apple")}
          </li>
          <li>{pluriel(bilan.transactions, "transaction")}</li>
          <li>{pluriel(bilan.promos, "promo")}</li>
          <li>{pluriel(bilan.devices, "caisse")}</li>
          <li>{pluriel(bilan.fichiers, "fichier")} dans le stockage</li>
          <li>
            Google Wallet : {pluriel(bilan.google.expirees, "carte expirée", "cartes expirées")}
            {bilan.google.echecs > 0 && `, ${pluriel(bilan.google.echecs, "échec")}`}
          </li>
          <li>Compte du gérant : {bilan.compteAuth}</li>
        </ul>
        <a href="/admin" className="row-action">
          Retour au back-office
        </a>
      </div>
    );
  }

  if (!apercu) {
    return (
      <div>
        <Button variant="destructive" size="sm" disabled={enCours} onClick={preparer}>
          {enCours ? "Inventaire…" : "Supprimer définitivement ce commerce"}
        </Button>
        {erreur && (
          <p className="field-error" role="alert">
            {erreur}
          </p>
        )}
      </div>
    );
  }

  const { donnees, gerant } = apercu;

  return (
    <div className="admin-danger-confirmation">
      <p className="admin-ligne-titre">Seront supprimés définitivement :</p>
      <ul className="admin-danger-liste">
        <li>{pluriel(donnees.clients, "client")} et leurs cartes</li>
        <li>
          {pluriel(donnees.cartesApple, "carte Apple enregistrée", "cartes Apple enregistrées")} sur
          des iPhone
        </li>
        <li>{pluriel(donnees.transactions, "transaction")}</li>
        <li>{pluriel(donnees.promos, "promo")}</li>
        <li>{pluriel(donnees.caisses, "caisse")}</li>
        <li>{pluriel(donnees.recompenses, "récompense")}</li>
        <li>Le logo et ses déclinaisons dans le stockage</li>
        <li>
          Le compte du gérant ({gerant.email ?? "email inconnu"})
          {gerant.autresCommerces > 0 &&
            ` : conservé, il gère ${pluriel(gerant.autresCommerces, "autre commerce", "autres commerces")}`}
        </li>
      </ul>
      <p className="admin-note">
        Les cartes Google Wallet des clients passent en « expirées » ; la classe du commerce reste
        chez Google, qui ne permet pas de la supprimer. Les cartes Apple restent dans les iPhone
        mais ne se mettront plus à jour.
      </p>

      {gerant.estAdmin ? (
        <p className="field-error" role="alert">
          Suppression impossible : le gérant de ce commerce est un compte admin plateforme.
        </p>
      ) : (
        <>
          <Field
            label={`Pour confirmer, tapez le slug du commerce : ${slug}`}
            className="field-input--sm mono"
            autoComplete="off"
            spellCheck={false}
            value={saisie}
            onChange={(e) => setSaisie(e.target.value)}
          />
          <div className="admin-danger-actions">
            <Button
              variant="destructive"
              size="sm"
              disabled={saisie !== slug || enCours}
              onClick={supprimer}
            >
              {enCours ? "Suppression…" : "Supprimer définitivement"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={enCours}
              onClick={() => {
                setApercu(null);
                setSaisie("");
                setErreur("");
              }}
            >
              Annuler
            </Button>
          </div>
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
