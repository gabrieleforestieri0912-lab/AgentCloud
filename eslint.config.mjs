import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // La TUI della CLI (Ink) non è un'app React DOM: usa React solo come
  // layer di rendering del terminale, con il proprio reconciler e senza
  // React Compiler. Le regole del compiler (refs toccati durante il
  // render, memoizzazione manuale, impurità nelle funzioni del
  // componente) nascono per le app Next.js e non descrivono il pattern
  // "refs come stato" usato qui di proposito: la cronologia della chat
  // vive in un ref per non ri-renderizzare a ogni token.
  {
    files: ["cli/src/tui/**/*.tsx"],
    rules: {
      "react-hooks/refs": "off",
      "react-hooks/immutability": "off",
      "react-hooks/purity": "off",
      "react-hooks/preserve-manual-memoization": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "cli/dist/**",
    // Output compilato di Electron (build artifact, gitignored da
    // desktop/.gitignore): non è sorgente, va ignorato come gli altri.
    "desktop/out/**",
    // Script usa-e-getta gitignorati (.tmp-g è in .gitignore).
    ".tmp-g/**",
  ]),
]);

export default eslintConfig;
