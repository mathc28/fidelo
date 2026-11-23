/**
 * Face avant de la carte Apple Wallet : source unique des champs, partagée
 * par le générateur de pass (applePass.ts, serveur) et l'aperçu
 * (WalletPreview.tsx, client). Comme rewardText.ts, le module ne dépend de
 * rien côté serveur.
 */
import {
  separerRecompense,
  texteCompteur,
  texteRecompense,
  type RecompenseAffichable,
} from "./rewardText";

export type ChampCarte = {
  key: string;
  label: string;
  /** Un nombre est formaté par iOS (espace des milliers) ; une chaîne, affichée telle quelle. */
  value: string | number;
  textAlignment?: "PKTextAlignmentRight";
};

export type FaceAvant = {
  headerFields: ChampCarte[];
  primaryFields: ChampCarte[];
  secondaryFields: ChampCarte[];
  barcodeAltText: string;
};

export type EntreeCarte = {
  programType: "visits" | "points";
  points: number;
  reward: RecompenseAffichable | null;
  firstName: string;
  serial: string;
};

export function champsCarte({
  programType,
  points,
  reward,
  firstName,
  serial,
}: EntreeCarte): FaceAvant {
  const isVisits = programType === "visits";
  const { reachedReward, nextReward } = separerRecompense(reward, points);

  return {
    // En-tête : le prénom, à droite du logo du commerce.
    headerFields: [{ key: "member", label: "MEMBRE", value: firstName }],

    // Volontairement vide : la zone principale reste libre (un bandeau de
    // progression y est prévu), les informations descendent d'une rangée.
    primaryFields: [],

    // Rangée secondaire : le compteur et la récompense côte à côte. Le
    // libellé y est au-dessus de la valeur et prend la labelColor du thème,
    // ce que la rangée principale ne permet pas.
    //
    // Pas de changeMessage : ces champs changent à chaque passage en caisse,
    // quand le client a son téléphone en main. Une notification à chaque scan
    // l'inciterait à couper celles de la carte, et avec elles les promos.
    secondaryFields: [
      {
        key: "balance",
        label: isVisits ? "VOS PASSAGES" : "VOS POINTS",
        // Sans objectif, la valeur reste un nombre et non une chaîne : Apple
        // lui applique alors le formatage local, donc l'espace des milliers.
        value: nextReward ? texteCompteur(points, nextReward.cost_points, isVisits) : points,
      },
      {
        key: "reward",
        label: "RÉCOMPENSE",
        value: texteRecompense(reachedReward, nextReward, points),
        // Calé à droite pour fermer la rangée : le compteur garde l'alignement
        // à gauche par défaut, les deux champs s'appuient sur les bords.
        textAlignment: "PKTextAlignmentRight",
      },
    ],

    // Sous le QR : les 8 premiers caractères du serial, lisibles à voix haute.
    barcodeAltText: serial.slice(0, 8).toUpperCase(),
  };
}
