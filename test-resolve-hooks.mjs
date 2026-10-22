/**
 * Resolve hook per i test: fa girare i sorgenti TypeScript del progetto con
 * il runner integrato di Node (`node --test`), senza aggiungere dipendenze.
 *
 * Perché serve: il codice del progetto importa con l'alias `@/...`
 * (configurato in tsconfig.json) e con import relativi senza estensione. Node
 * non conosce nessuna delle due forme, quindi questo hook le traduce in
 * percorsi di file reali.
 *
 * Uso:
 *   node --test --import ./scripts/test-resolve-hooks.mjs src/lib/memory/tests
 *
 * Non è parte del bundle applicativo: gira solo nei test.
 */

import { registerHooks } from "node:module";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "src");

/** Candidate paths of a module, in resolution order. */
function candidates(target) {
  const out = [target];
  if (!target.endsWith(".ts")) {
    out.push(`${target}.ts`, path.join(target, "index.ts"));
  }
  return out;
}

/** First candidate that exists and is a file. */
function resolveFile(target) {
  for (const candidate of candidates(target)) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    // Alias del progetto: "@/lib/memory/store" -> <root>/src/lib/memory/store.ts
    if (specifier.startsWith("@/")) {
      const target = resolveFile(path.join(SRC, specifier.slice(2)));
      if (target) {
        return {
          url: pathToFileURL(target).href,
          format: "module-typescript",
          shortCircuit: true,
        };
      }
    }

    // Import relativi senza estensione: "./scope" -> "./scope.ts"
    if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
      const parentDir = path.dirname(fileURLToPath(context.parentURL));
      const target = resolveFile(path.resolve(parentDir, specifier));
      if (target) {
        return {
          url: pathToFileURL(target).href,
          format: "module-typescript",
          shortCircuit: true,
        };
      }
    }

    return nextResolve(specifier, context);
  },
});
