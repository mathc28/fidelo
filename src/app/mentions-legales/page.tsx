import type { Metadata } from "next";
import { LegalShell } from "@/components/LegalShell";
import { DATE_PAGES_LEGALES, EDITEUR, EMAIL_CONTACT, REGION_SUPABASE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Mentions légales",
  description: "Éditeur, hébergeur et propriété intellectuelle du site Fiduo.",
};

const Email = () => <a href={`mailto:${EMAIL_CONTACT}`}>{EMAIL_CONTACT}</a>;

export default function MentionsLegalesPage() {
  return (
    <LegalShell
      titre="Mentions légales"
      sousTitre={<>Dernière mise à jour : {DATE_PAGES_LEGALES}</>}
    >
      <p className="legal-chapeau">
        Conformément à l&apos;article 6 de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans
        l&apos;économie numérique (LCEN), voici les informations relatives à l&apos;éditeur et à
        l&apos;hébergeur du site fiduo.app.
      </p>

      <section>
        <h2>Éditeur du site</h2>
        <ul>
          <li>
            <strong>Éditeur :</strong> Mathieu Cocu, Entrepreneur individuel (EI), exerçant sous le
            nom commercial « Fiduo »
          </li>
          <li>
            <strong>Adresse :</strong> {EDITEUR.adresse}
          </li>
          <li>
            <strong>SIRET :</strong> {EDITEUR.siret}
          </li>
          <li>
            <strong>Code APE :</strong> {EDITEUR.ape}
          </li>
          <li>
            <strong>Immatriculation :</strong> Registre national des entreprises (RNE)
          </li>
          <li>
            <strong>TVA :</strong> {EDITEUR.tva}
          </li>
          <li>
            <strong>E-mail :</strong> <Email />
          </li>
          <li>
            <strong>Téléphone :</strong>{" "}
            <a href={`tel:+33${EDITEUR.telephone.replace(/\s/g, "").slice(1)}`}>
              {EDITEUR.telephone}
            </a>
          </li>
          <li>
            <strong>Directeur de la publication :</strong> Mathieu Cocu
          </li>
        </ul>
      </section>

      <section>
        <h2>Hébergement</h2>
        <ul>
          <li>
            <strong>Site web :</strong> Vercel Inc. — 440 N Barranca Avenue #4133, Covina, CA 91723,
            États-Unis — <a href="https://vercel.com">vercel.com</a>
          </li>
          <li>
            <strong>Base de données et fichiers :</strong> Supabase Pte. Ltd., 65 Chulia Street
            #38-02/03, OCBC Centre, Singapour 049513 —{" "}
            <a href="https://supabase.com">supabase.com</a>. Serveurs situés dans la région{" "}
            {REGION_SUPABASE}.
          </li>
        </ul>
      </section>

      <section>
        <h2>Propriété intellectuelle</h2>
        <p>
          La marque Fiduo, son logo, les textes, illustrations, interfaces et le code du site sont
          la propriété de l&apos;éditeur. Toute reproduction ou réutilisation sans autorisation
          écrite préalable est interdite.
        </p>
        <p>
          Les noms, logos et contenus des commerces affichés sur leurs cartes de fidélité restent la
          propriété de ces commerces, qui en autorisent l&apos;usage par Fiduo dans le cadre du
          service.
        </p>
        <p>
          Apple Wallet est une marque d&apos;Apple Inc. Google Wallet est une marque de Google LLC.
        </p>
      </section>

      <section>
        <h2>Données personnelles</h2>
        <p>
          Le traitement des données personnelles est décrit dans notre{" "}
          <a href="/confidentialite">politique de confidentialité</a>.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Pour toute question : <Email />
        </p>
      </section>
    </LegalShell>
  );
}
