import type { Metadata } from "next";
import { LegalShell, ACompleter } from "@/components/LegalShell";
import { EMAIL_CONTACT } from "@/lib/site";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description:
    "Quelles données Fiduo traite, pourquoi, combien de temps, et comment exercer vos droits.",
};

const CONTACT = EMAIL_CONTACT;

export default function ConfidentialitePage() {
  return (
    <LegalShell titre="Politique de confidentialité" miseAJour="1er octobre 2026">
      <p className="legal-chapeau">
        Fiduo met la carte de fidélité des commerces de quartier dans Apple Wallet et Google Wallet.
        Cette page explique quelles données nous traitons pour cela, pourquoi, pendant combien de
        temps, et comment exercer vos droits. Nous collectons le strict nécessaire : pas de
        publicité, pas de revente, pas de mesure d&apos;audience.
      </p>

      <section>
        <h2>1. Qui sommes-nous</h2>
        <p>
          Fiduo est édité par <ACompleter>raison sociale et forme juridique</ACompleter>, dont le
          siège est situé <ACompleter>adresse postale</ACompleter>, immatriculé sous le numéro{" "}
          <ACompleter>SIRET</ACompleter>.
        </p>
        <p>
          Pour toute question sur vos données : <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
        </p>
      </section>

      <section>
        <h2>2. Qui est responsable de vos données</h2>
        <p>Cela dépend de qui vous êtes.</p>
        <ul>
          <li>
            <strong>Vous avez une carte de fidélité chez un commerce.</strong> C&apos;est le
            commerce qui décide de son programme de fidélité : il est responsable du traitement.
            Fiduo agit pour son compte, comme sous-traitant, et n&apos;utilise jamais vos données à
            ses propres fins.
          </li>
          <li>
            <strong>Vous êtes commerçant ou vous visitez ce site.</strong> Fiduo est responsable du
            traitement des données de votre compte et de votre visite.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. Les données que nous traitons</h2>

        <h3>Si vous avez une carte de fidélité</h3>
        <ul>
          <li>Votre prénom et votre adresse email, saisis à l&apos;inscription.</li>
          <li>
            L&apos;historique de votre carte : passages, points gagnés, récompenses utilisées, avec
            leur date. Pour les programmes à points, le montant de vos achats sert à calculer les
            points.
          </li>
          <li>
            Un identifiant de carte, et, si vous utilisez Apple Wallet, un identifiant technique de
            votre appareil et un jeton de notification fournis par Apple. Ils servent uniquement à
            mettre votre carte à jour.
          </li>
        </ul>
        <p>
          <strong>Votre position ne nous est jamais transmise.</strong> La carte contient
          l&apos;adresse du commerce : c&apos;est votre téléphone, de lui-même, qui affiche la carte
          sur l&apos;écran verrouillé quand vous passez à proximité. Ce calcul reste sur votre
          téléphone.
        </p>

        <h3>Si vous êtes commerçant</h3>
        <ul>
          <li>L&apos;adresse email de votre compte et votre mot de passe (chiffré).</li>
          <li>
            Les informations de votre commerce : nom, adresse, logo, réglages du programme et
            récompenses. L&apos;adresse est convertie en coordonnées GPS pour les rappels de
            proximité.
          </li>
          <li>Les messages promotionnels que vous envoyez, et leur date.</li>
          <li>Les téléphones et tablettes de caisse que vous associez à votre compte.</li>
        </ul>

        <h3>Pour tout le monde</h3>
        <p>
          Votre adresse IP est enregistrée quand vous vous inscrivez, consultez votre carte ou
          associez une caisse, pour bloquer les tentatives abusives. Elle est effacée
          automatiquement au bout d&apos;une heure au plus.
        </p>
      </section>

      <section>
        <h2>4. Pourquoi nous les utilisons</h2>
        <ul>
          <li>
            <strong>Faire fonctionner votre carte de fidélité</strong> : la créer, compter vos
            passages ou vos points, la mettre à jour dans votre téléphone. C&apos;est nécessaire au
            programme de fidélité auquel vous vous inscrivez.
          </li>
          <li>
            <strong>Vous transmettre les offres du commerce</strong> sous forme de notification sur
            la carte. Vous pouvez les couper à tout moment dans les réglages de la carte, dans Apple
            Wallet ou Google Wallet.
          </li>
          <li>
            <strong>Fournir le service aux commerçants</strong> : gérer leur compte, leur programme
            et leur abonnement. C&apos;est nécessaire au contrat qui nous lie.
          </li>
          <li>
            <strong>Protéger le service</strong> contre les inscriptions automatisées et les
            tentatives d&apos;intrusion. C&apos;est notre intérêt légitime.
          </li>
        </ul>
        <p>Nous ne vendons ni ne louons aucune donnée, et nous ne faisons pas de publicité.</p>
      </section>

      <section>
        <h2>5. Qui y a accès</h2>
        <p>
          Le commerce auprès duquel vous avez une carte voit votre prénom, votre email et
          l&apos;historique de votre carte chez lui, et seulement chez lui. Un commerce ne voit
          jamais vos cartes chez d&apos;autres commerces.
        </p>
        <p>Pour faire fonctionner le service, nous faisons appel à :</p>
        <ul>
          <li>
            <strong>Supabase</strong>, pour la base de données, les comptes commerçants et le
            stockage des logos <ACompleter>région d&apos;hébergement du projet Supabase</ACompleter>
            .
          </li>
          <li>
            <strong>
              <ACompleter>hébergeur du site, par exemple Vercel</ACompleter>
            </strong>
            , pour l&apos;hébergement du site.
          </li>
          <li>
            <strong>Apple</strong> et <strong>Google</strong>, pour afficher et mettre à jour votre
            carte dans Apple Wallet ou Google Wallet, et pour vous envoyer les notifications de la
            carte.
          </li>
          <li>
            <strong>OpenStreetMap (Nominatim)</strong>, pour convertir l&apos;adresse d&apos;un
            commerce en coordonnées GPS. Seule l&apos;adresse du commerce lui est envoyée, aucune
            donnée de client.
          </li>
        </ul>
        <p>
          Certains de ces prestataires sont établis hors de l&apos;Union européenne, notamment aux
          États-Unis. Ces transferts sont encadrés par les garanties prévues par le RGPD : décision
          d&apos;adéquation (Data Privacy Framework) ou clauses contractuelles types de la
          Commission européenne.
        </p>
      </section>

      <section>
        <h2>6. Combien de temps nous les gardons</h2>
        <ul>
          <li>
            <strong>Carte de fidélité</strong> :{" "}
            <ACompleter>
              durée, par exemple jusqu&apos;à la suppression de la carte ou 3 ans après le dernier
              passage
            </ACompleter>
            .
          </li>
          <li>
            <strong>Compte commerçant</strong> :{" "}
            <ACompleter>
              durée, par exemple pendant l&apos;abonnement puis 3 ans après sa fin
            </ACompleter>
            . Les factures sont conservées 10 ans, comme l&apos;exige la loi.
          </li>
          <li>
            <strong>Adresse IP anti-abus</strong> : une heure au plus.
          </li>
        </ul>
        <p>
          Retirer la carte de votre téléphone ne supprime pas vos données : écrivez-nous pour cela
          (voir ci-dessous).
        </p>
      </section>

      <section>
        <h2>7. Cookies</h2>
        <p>
          Ce site ne dépose aucun cookie publicitaire ni de mesure d&apos;audience. Le seul stockage
          utilisé dans votre navigateur sert à garder un commerçant connecté à son tableau de bord.
          Il est indispensable au service et ne demande donc pas de consentement.
        </p>
      </section>

      <section>
        <h2>8. Vos droits</h2>
        <p>
          Vous pouvez à tout moment accéder à vos données, les faire corriger ou supprimer, en
          obtenir une copie, vous opposer à leur utilisation ou en demander la limitation.
        </p>
        <p>
          Écrivez-nous à <a href={`mailto:${CONTACT}`}>{CONTACT}</a> en précisant le commerce
          concerné si vous êtes client. Si votre demande relève du commerce, nous la lui
          transmettons. Nous répondons sous un mois.
        </p>
        <p>
          Si vous estimez que vos droits ne sont pas respectés, vous pouvez adresser une réclamation
          à la CNIL, sur <a href="https://www.cnil.fr">cnil.fr</a>.
        </p>
      </section>

      <section>
        <h2>9. Sécurité</h2>
        <p>
          Les échanges avec le site sont chiffrés. Chaque commerce n&apos;accède qu&apos;à ses
          propres clients, cloisonnement appliqué directement par la base de données. Les mots de
          passe et les jetons des caisses ne sont jamais stockés en clair.
        </p>
      </section>

      <section>
        <h2>10. Modifications</h2>
        <p>
          Nous pouvons mettre à jour cette politique, par exemple si le service évolue. La date en
          haut de page indique la dernière version.
        </p>
      </section>
    </LegalShell>
  );
}
