import type { Metadata } from "next";
import { LegalShell } from "@/components/LegalShell";
import { DATE_PAGES_LEGALES, EDITEUR, EMAIL_CONTACT, REGION_SUPABASE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description:
    "Quelles données Fiduo traite, pourquoi, combien de temps, et comment exercer vos droits.",
};

const Email = () => <a href={`mailto:${EMAIL_CONTACT}`}>{EMAIL_CONTACT}</a>;

const FINALITES = [
  [
    "Créer, afficher et mettre à jour votre carte de fidélité",
    "Exécution du service proposé par le commerce",
  ],
  [
    "Envoyer les offres du commerce sous forme de notification sur la carte",
    "Intérêt légitime du commerce ; vous pouvez désactiver les notifications à tout moment dans les réglages de la carte",
  ],
  [
    "Fournir le service aux commerçants (compte, carte, caisse, facturation)",
    "Exécution du contrat",
  ],
  [
    "Envoyer les e-mails liés au compte commerçant (invitation, réinitialisation du mot de passe)",
    "Exécution du contrat",
  ],
  ["Sécuriser le service (inscriptions automatisées, tentatives d'intrusion)", "Intérêt légitime"],
  ["Conserver les factures", "Obligation légale"],
] as const;

export default function ConfidentialitePage() {
  return (
    <LegalShell
      titre="Politique de confidentialité"
      sousTitre={<>Dernière mise à jour : {DATE_PAGES_LEGALES}</>}
    >
      <p className="legal-chapeau">
        Fiduo permet aux commerces de proximité de proposer une carte de fidélité dans Apple Wallet
        et Google Wallet. Nous collectons uniquement les données nécessaires au fonctionnement du
        service. Pas de publicité, pas de revente de données, pas de mesure d&apos;audience.
      </p>

      <section>
        <h2>1. Qui est responsable de vos données ?</h2>
        <ul>
          <li>
            <strong>Vous êtes client d&apos;un commerce et possédez une carte de fidélité :</strong>{" "}
            le <strong>commerce</strong> est responsable du traitement de vos données. Fiduo agit
            comme <strong>sous-traitant</strong> : nous traitons vos données pour son compte et
            selon ses instructions.
          </li>
          <li>
            <strong>Vous êtes commerçant ou visiteur du site :</strong> Fiduo est responsable du
            traitement.
          </li>
        </ul>
        <p>
          Fiduo : Mathieu Cocu, Entrepreneur individuel, {EDITEUR.adresse}, SIRET {EDITEUR.siret}.
          Contact : <Email />.
        </p>
      </section>

      <section>
        <h2>2. Données collectées</h2>

        <h3>Titulaires d&apos;une carte de fidélité</h3>
        <ul>
          <li>prénom et adresse e-mail ;</li>
          <li>historique d&apos;utilisation de la carte (passages, tampons, récompenses) ;</li>
          <li>identifiant de la carte ;</li>
          <li>
            pour Apple Wallet : identifiant technique de l&apos;appareil et jeton de notification,
            nécessaires aux mises à jour de la carte.
          </li>
        </ul>
        <p>
          Votre position n&apos;est jamais transmise à Fiduo : le rappel de proximité est géré
          directement par votre téléphone.
        </p>

        <h3>Commerçants</h3>
        <ul>
          <li>
            adresse e-mail du compte et mot de passe (stocké sous forme chiffrée, jamais en clair) ;
          </li>
          <li>
            informations du commerce (nom, logo, couleurs, adresse, convertie en coordonnées GPS
            pour le rappel de proximité) ;
          </li>
          <li>messages promotionnels envoyés aux clients ;</li>
          <li>téléphones de caisse appairés ;</li>
          <li>date d&apos;acceptation des conditions générales de vente.</li>
        </ul>

        <h3>Tous les utilisateurs</h3>
        <ul>
          <li>
            adresse IP, utilisée uniquement pour la prévention des abus (limitation des requêtes),
            supprimée au plus tard au bout d&apos;une heure.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. Pourquoi et sur quelle base ?</h2>
        <div className="legal-tableau">
          <table>
            <thead>
              <tr>
                <th scope="col">Finalité</th>
                <th scope="col">Base légale</th>
              </tr>
            </thead>
            <tbody>
              {FINALITES.map(([finalite, base]) => (
                <tr key={finalite}>
                  <td>{finalite}</td>
                  <td>{base}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2>4. Qui reçoit vos données ?</h2>
        <p>
          Chaque commerce n&apos;a accès qu&apos;aux données de ses propres clients. Nous faisons
          appel aux prestataires suivants :
        </p>
        <div className="legal-tableau">
          <table>
            <thead>
              <tr>
                <th scope="col">Prestataire</th>
                <th scope="col">Rôle</th>
                <th scope="col">Localisation</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  Supabase Pte. Ltd., 65 Chulia Street #38-02/03, OCBC Centre, Singapour 049513
                </td>
                <td>Base de données et stockage des logos</td>
                <td>Serveurs : {REGION_SUPABASE}</td>
              </tr>
              <tr>
                <td>Vercel Inc.</td>
                <td>Hébergement du site et tâches planifiées</td>
                <td>États-Unis / réseau mondial</td>
              </tr>
              <tr>
                <td>Resend Inc.</td>
                <td>Envoi des e-mails aux commerçants (invitation, réinitialisation)</td>
                <td>États-Unis</td>
              </tr>
              <tr>
                <td>Apple Inc.</td>
                <td>Mise à jour et notifications des cartes Apple Wallet</td>
                <td>États-Unis</td>
              </tr>
              <tr>
                <td>Google LLC</td>
                <td>Mise à jour et notifications des cartes Google Wallet</td>
                <td>États-Unis</td>
              </tr>
              <tr>
                <td>OpenStreetMap (Nominatim)</td>
                <td>
                  Conversion de l&apos;adresse du commerce en coordonnées GPS (adresse du commerce
                  uniquement)
                </td>
                <td>Union européenne</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Lorsque vous ajoutez une carte à Apple Wallet ou Google Wallet, ces services traitent
          également vos données selon leurs propres politiques :{" "}
          <a href="https://www.apple.com/legal/privacy/">Apple</a> ·{" "}
          <a href="https://policies.google.com/privacy">Google</a>.
        </p>
        <p>
          <strong>Transferts hors Union européenne :</strong> certains prestataires sont situés aux
          États-Unis. Ces transferts sont encadrés par le Data Privacy Framework UE–États-Unis
          lorsque le prestataire y est certifié, et/ou par les clauses contractuelles types de la
          Commission européenne.
        </p>
      </section>

      <section>
        <h2>5. Durées de conservation</h2>
        <ul>
          <li>
            <strong>Cartes de fidélité :</strong> supprimées 3 ans après la dernière utilisation de
            la carte, ou dès la fermeture du compte du commerce.
          </li>
          <li>
            <strong>Comptes commerçants :</strong> conservés pendant toute la durée de
            l&apos;abonnement, puis supprimés dans les 3 mois suivant la résiliation.
          </li>
          <li>
            <strong>Factures :</strong> 10 ans (obligation légale).
          </li>
          <li>
            <strong>Adresses IP :</strong> 1 heure maximum.
          </li>
        </ul>
        <p>
          Supprimer la carte de votre téléphone ne supprime pas vos données chez nous. Pour cela,
          écrivez-nous (voir section 7).
        </p>
      </section>

      <section>
        <h2>6. Cookies</h2>
        <p>
          Aucun cookie publicitaire ni de mesure d&apos;audience. Le seul stockage utilisé dans le
          navigateur sert à maintenir la connexion des commerçants à leur espace.
        </p>
      </section>

      <section>
        <h2>7. Vos droits</h2>
        <p>
          Vous disposez d&apos;un droit d&apos;accès, de rectification, d&apos;effacement, de
          portabilité, d&apos;opposition et de limitation du traitement. Pour l&apos;exercer :{" "}
          <strong>
            <Email />
          </strong>
          .
        </p>
        <p>
          Si votre demande concerne une carte de fidélité, nous la transmettons au commerce
          concerné, responsable du traitement, et l&apos;aidons à y répondre. Nous répondons dans un
          délai d&apos;un mois.
        </p>
        <p>
          Vous pouvez introduire une réclamation auprès de la CNIL (
          <a href="https://www.cnil.fr">cnil.fr</a>).
        </p>
        <p>
          <strong>Utilisateurs en Suisse :</strong> vous disposez de droits équivalents en vertu de
          la loi fédérale sur la protection des données (nLPD). L&apos;autorité compétente est le
          Préposé fédéral à la protection des données et à la transparence (PFPDT,{" "}
          <a href="https://www.edoeb.admin.ch">edoeb.admin.ch</a>).
        </p>
      </section>

      <section>
        <h2>8. Sécurité</h2>
        <p>
          Connexions chiffrées (HTTPS), isolation des données de chaque commerce assurée par la base
          de données, mots de passe et jetons techniques jamais stockés en clair, clés de signature
          des cartes chiffrées.
        </p>
      </section>

      <section>
        <h2>9. Modifications</h2>
        <p>
          Nous pouvons mettre à jour cette politique. La date de dernière mise à jour figure en haut
          de la page.
        </p>
      </section>
    </LegalShell>
  );
}
