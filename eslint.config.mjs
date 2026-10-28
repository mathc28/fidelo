// ESLint 9 (config « flat »). eslint-config-next 15 est encore au format
// eslintrc : FlatCompat le traduit. Mêmes règles que l'ancien .eslintrc.json.
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "prettier"),
  { ignores: ["node_modules/**", ".next/**", "out/**", "next-env.d.ts"] },
];

export default eslintConfig;
