import type { Metadata } from "next";
import { LegalShell } from "@/components/LegalShell";
import { CGV_VERSION, DATE_PAGES_LEGALES, EDITEUR, EMAIL_CONTACT } from "@/lib/site";

export const metadata: Metadata = {
  title: "Conditions générales de vente",
  description:
    "Conditions générales de vente du service Fiduo pour les commerçants, accord de sous-traitance des données inclus.",
};

const Email = () => <a href={`mailto:${EMAIL_CONTACT}`}>{EMAIL_CONTACT}</a>;

export default function CgvPage() {
  return (
    <LegalShell
      titre="Conditions générales de vente"
      sousTitre={
        <>
          Version {CGV_VERSION} — en vigueur au {DATE_PAGES_LEGALES}
        </>
      }
    >
      <section>
        <h2>1. Objet</h2>
        <p>
          Les présentes conditions générales de vente (« CGV ») régissent l&apos;utilisation du
          service Fiduo (le « Service ») par les professionnels (le « Commerçant »). Fiduo est édité
          par Mathieu Cocu, Entrepreneur individuel, {EDITEUR.adresse}, SIRET {EDITEUR.siret} («
          Fiduo »).
        </p>
        <p>
          Le Service permet au Commerçant de proposer à ses clients une carte de fidélité
          dématérialisée compatible avec Apple Wallet et Google Wallet, de gérer les passages en
          caisse, les récompenses et l&apos;envoi de messages promotionnels.
        </p>
        <p>
          Le Service est réservé aux professionnels. L&apos;activation du compte vaut acceptation
          des présentes CGV.
        </p>
      </section>

      <section>
        <h2>2. Compte</h2>
        <p>
          Le Commerçant crée son accès via l&apos;invitation envoyée par Fiduo. Il est responsable
          de la confidentialité de ses identifiants et des actions réalisées depuis son compte et
          ses téléphones de caisse appairés.
        </p>
      </section>

      <section>
        <h2>3. Prix et paiement</h2>
        <p>Tarifs communiqués sur devis.</p>
        <p>
          En cas de retard de paiement, des pénalités au taux de trois fois le taux d&apos;intérêt
          légal ainsi qu&apos;une indemnité forfaitaire de 40 € pour frais de recouvrement sont dues
          de plein droit (art. L441-10 du Code de commerce).
        </p>
      </section>

      <section>
        <h2>4. Durée et résiliation</h2>
        <p>
          Sans engagement, résiliable à tout moment. Le Commerçant peut résilier son abonnement à
          tout moment par e-mail à <Email /> ; la résiliation prend effet à la fin de la période en
          cours.
        </p>
        <p>
          Fiduo peut suspendre ou résilier le compte en cas de manquement grave aux présentes CGV
          (contenu illicite, usage abusif des notifications, défaut de paiement), après mise en
          demeure restée sans effet pendant 15 jours, sauf urgence.
        </p>
        <p>
          À la fin du contrat, les cartes du Commerçant cessent d&apos;être mises à jour et les
          données sont supprimées selon l&apos;article 9.
        </p>
      </section>

      <section>
        <h2>5. Licence d&apos;utilisation de la marque du Commerçant</h2>
        <p>
          Le Commerçant concède à Fiduo, pour la durée du contrat et pour le monde entier, une
          licence non exclusive et gratuite d&apos;utilisation de son nom commercial, de son logo,
          de ses couleurs et des visuels qu&apos;il fournit,{" "}
          <strong>
            dans le seul but de générer, afficher et mettre à jour ses cartes de fidélité
          </strong>{" "}
          dans Apple Wallet, Google Wallet et sur les pages du Service.
        </p>
        <p>
          Le Commerçant garantit qu&apos;il détient les droits sur ces éléments et qu&apos;ils ne
          portent atteinte aux droits d&apos;aucun tiers. Il garantit Fiduo contre toute réclamation
          à ce sujet.
        </p>
      </section>

      <section>
        <h2>6. Obligations du Commerçant</h2>
        <p>Le Commerçant s&apos;engage à :</p>
        <ul>
          <li>fournir des informations exactes sur son commerce et son programme de fidélité ;</li>
          <li>proposer des récompenses réelles et honorer celles obtenues par ses clients ;</li>
          <li>
            n&apos;envoyer que des messages en lien avec son commerce, non trompeurs et non
            offensants, en respectant les limites de fréquence du Service ;
          </li>
          <li>
            ne pas promouvoir de produits ou d&apos;offres interdits ou réglementés (notamment
            l&apos;incitation à la consommation d&apos;alcool, en conformité avec la loi Évin), ni
            de contenu illicite ;
          </li>
          <li>
            respecter les règles d&apos;utilisation d&apos;Apple et de Google applicables aux cartes
            Wallet ;
          </li>
          <li>
            informer ses clients du traitement de leurs données (Fiduo met à disposition une{" "}
            <a href="/confidentialite">politique de confidentialité</a> à cet effet).
          </li>
        </ul>
      </section>

      <section>
        <h2>7. Disponibilité du Service</h2>
        <p>
          Fiduo s&apos;efforce d&apos;assurer un fonctionnement continu du Service, sans garantie
          d&apos;absence d&apos;interruption. Le Service dépend de prestataires tiers (notamment
          Apple, Google, Supabase, Vercel) ; Fiduo ne peut être tenu responsable d&apos;une
          indisponibilité ou d&apos;un changement de règles de leur part.
        </p>
      </section>

      <section>
        <h2>8. Responsabilité</h2>
        <p>
          Fiduo est tenu d&apos;une obligation de moyens. Sa responsabilité est limitée aux dommages
          directs et plafonnée au montant payé par le Commerçant au titre des 12 derniers mois.
          Fiduo n&apos;est pas responsable des contenus créés par le Commerçant ni des relations
          entre le Commerçant et ses clients.
        </p>
      </section>

      <section id="sous-traitance">
        <h2>9. Données personnelles — Accord de sous-traitance (article 28 du RGPD)</h2>
        <p>
          Pour les données des clients du Commerçant, le{" "}
          <strong>Commerçant est responsable du traitement</strong> et{" "}
          <strong>Fiduo est sous-traitant</strong>. Les parties conviennent de ce qui suit :
        </p>
        <ul>
          <li>
            <strong>Objet et durée :</strong> gestion des cartes de fidélité des clients du
            Commerçant, pendant toute la durée du contrat.
          </li>
          <li>
            <strong>Données traitées :</strong> prénom, adresse e-mail, identifiant de carte,
            historique d&apos;utilisation, identifiants techniques Apple Wallet.
          </li>
          <li>
            <strong>Personnes concernées :</strong> les clients du Commerçant titulaires d&apos;une
            carte.
          </li>
          <li>
            <strong>Instructions :</strong> Fiduo traite les données uniquement pour fournir le
            Service et sur instruction documentée du Commerçant, constituée par les présentes CGV et
            l&apos;utilisation du Service.
          </li>
          <li>
            <strong>Confidentialité :</strong> les personnes autorisées à traiter les données sont
            soumises à une obligation de confidentialité.
          </li>
          <li>
            <strong>Sécurité :</strong> Fiduo met en œuvre les mesures décrites dans sa{" "}
            <a href="/confidentialite">politique de confidentialité</a> (chiffrement des connexions,
            isolation des données par commerce, absence de stockage en clair des secrets).
          </li>
          <li>
            <strong>Sous-traitants ultérieurs :</strong> le Commerçant autorise Fiduo à recourir aux
            prestataires listés dans la politique de confidentialité (Supabase, Vercel, Resend,
            Apple, Google, OpenStreetMap). Fiduo informe le Commerçant de tout ajout ou
            remplacement, qui peut s&apos;y opposer en résiliant le contrat.
          </li>
          <li>
            <strong>Assistance :</strong> Fiduo aide le Commerçant à répondre aux demandes
            d&apos;exercice des droits de ses clients et transmet sans délai toute demande reçue
            directement.
          </li>
          <li>
            <strong>Violation de données :</strong> Fiduo notifie au Commerçant toute violation de
            données dans un délai de 48 heures après en avoir pris connaissance.
          </li>
          <li>
            <strong>Fin du contrat :</strong> Fiduo supprime les données des clients du Commerçant
            dans un délai de 3 mois après la fin du contrat, sauf obligation légale de conservation.
            Le Commerçant peut demander une exportation avant la suppression.
          </li>
          <li>
            <strong>Audit :</strong> Fiduo met à disposition du Commerçant, sur demande, les
            informations nécessaires pour démontrer le respect de ces obligations.
          </li>
        </ul>
        <p>
          Pour les données propres au Commerçant (compte, facturation), Fiduo est responsable du
          traitement dans les conditions de sa{" "}
          <a href="/confidentialite">politique de confidentialité</a>.
        </p>
      </section>

      <section>
        <h2>10. Propriété du Service</h2>
        <p>
          Le Service, son code, ses interfaces et la marque Fiduo restent la propriété exclusive de
          Fiduo. Aucun droit n&apos;est cédé au Commerçant en dehors du droit d&apos;utiliser le
          Service pendant la durée du contrat.
        </p>
      </section>

      <section>
        <h2>11. Modification des CGV</h2>
        <p>
          Fiduo peut modifier les présentes CGV. Le Commerçant est informé par e-mail au moins 30
          jours avant l&apos;entrée en vigueur de la nouvelle version et peut résilier son
          abonnement s&apos;il la refuse.
        </p>
      </section>

      <section>
        <h2>12. Droit applicable et litiges</h2>
        <p>
          Les présentes CGV sont soumises au droit français, y compris pour les Commerçants établis
          en Suisse. En cas de litige, et à défaut d&apos;accord amiable, compétence exclusive est
          attribuée aux tribunaux de Lyon.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          <Email />
        </p>
      </section>
    </LegalShell>
  );
}
