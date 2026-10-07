import type { Metadata } from "next";
import { LegalShell, ACompleter } from "@/components/LegalShell";
import { EMAIL_CONTACT } from "@/lib/site";

export const metadata: Metadata = {
  title: "Mentions légales",
  description: "Éditeur, hébergeur et conditions d'utilisation du site Fiduo.",
};

const CONTACT = EMAIL_CONTACT;

export default function MentionsLegalesPage() {
  return (
    <LegalShell titre="Mentions légales" miseAJour="1er octobre 2026">
      <p className="legal-chapeau">
        Informations prévues par l&apos;article 6 de la loi n° 2004-575 du 21 juin 2004 pour la
        confiance dans l&apos;économie numérique (LCEN).
      </p>

      <section>
        <h2>Éditeur du site</h2>
        <p>
          Le site fiduo.app est édité par <ACompleter>raison sociale et forme juridique</ACompleter>
          , <ACompleter>capital social, si société</ACompleter>.
        </p>
        <ul>
          <li>
            Siège : <ACompleter>adresse postale</ACompleter>
          </li>
          <li>
            SIRET : <ACompleter>numéro SIRET</ACompleter>
          </li>
          <li>
            Immatriculation :{" "}
            <ACompleter>RCS et ville, ou « dispensé d&apos;immatriculation »</ACompleter>
          </li>
          <li>
            TVA intracommunautaire :{" "}
            <ACompleter>numéro, ou « TVA non applicable, art. 293 B du CGI »</ACompleter>
          </li>
          <li>
            Téléphone : <ACompleter>numéro</ACompleter>
          </li>
          <li>
            Email : <a href={`mailto:${CONTACT}`}>{CONTACT}</a>
          </li>
        </ul>
        <p>
          Directeur de la publication : <ACompleter>nom et prénom</ACompleter>.
        </p>
      </section>

      <section>
        <h2>Hébergement</h2>
        <p>
          Le site est hébergé par <ACompleter>nom de l&apos;hébergeur</ACompleter>,{" "}
          <ACompleter>adresse et téléphone de l&apos;hébergeur</ACompleter>.
        </p>
        <p>
          Les données du service sont hébergées par Supabase, Inc.,{" "}
          <ACompleter>adresse de Supabase</ACompleter>, sur des serveurs situés{" "}
          <ACompleter>région du projet Supabase</ACompleter>.
        </p>
      </section>

      <section>
        <h2>Propriété intellectuelle</h2>
        <p>
          La marque Fiduo, son logo, les textes, les illustrations et le code de ce site sont la
          propriété de l&apos;éditeur. Toute reproduction, même partielle, sans autorisation écrite
          est interdite.
        </p>
        <p>
          Les noms, logos et contenus des commerces affichés sur leurs cartes de fidélité
          appartiennent à ces commerces. Apple Wallet est une marque d&apos;Apple Inc. ; Google
          Wallet est une marque de Google LLC.
        </p>
      </section>

      <section>
        <h2>Données personnelles</h2>
        <p>
          La manière dont Fiduo traite les données personnelles est décrite dans la{" "}
          <a href="/confidentialite">politique de confidentialité</a>.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Pour toute question sur le site : <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
        </p>
      </section>
    </LegalShell>
  );
}
