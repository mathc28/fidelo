/**
 * Texte affiché sur l'écran verrouillé quand le client passe près de la
 * boutique (relevantText du pass Apple). Partagé par le générateur de pass
 * (applePass.ts, serveur) et la landing (client) : le module ne dépend de
 * rien côté serveur.
 */
export function texteProximite(nomCommerce: string): string {
  return `${nomCommerce} est juste à côté. Votre carte est prête.`;
}
