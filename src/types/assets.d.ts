/**
 * Déclaration des imports de feuilles de style à effet de bord
 * (`import "./landing.css"`).
 *
 * next/types/global.d.ts ne déclare que `*.module.css` : un import CSS global
 * n'a donc aucune déclaration de module. TypeScript 5.9 — la version du projet —
 * tolère silencieusement ce cas, mais les versions plus récentes le signalent
 * (TS2882). D'où une erreur visible dans l'éditeur, qui utilise sa propre
 * version de TypeScript, alors que `npm run typecheck` passe.
 *
 * `*.module.css` étant un motif plus spécifique, les CSS Modules gardent leur
 * type d'export par défaut : cette déclaration ne couvre que les imports
 * globaux.
 */
declare module "*.css";
