/**
 * Hook di risoluzione per i test sotto `node --experimental-strip-types`.
 *
 * Fa due cose che il resolver di Node non fa da solo:
 *  1. risolve gli import RELATIVI senza estensione (`from "./catalog"` →
 *     `catalog.ts`), come fa il bundler con `moduleResolution: "bundler"`;
 *  2. risolve l'alias `@/` (la root `src/` del progetto) usato in tutto il
 *     codice di produzione.
 *
 * Perché serve il punto 2: i moduli sotto test importano i loro vicini con
 * `@/lib/...`. Senza questo hook i test dovrebbero costringere il codice di
 * produzione a import con path relativi — una deviazione dallo stile del repo
 * dovuta solo ai test. Meglio risolvere l'alias qui, una volta sola.
 */

import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** Root del progetto: questo file vive in `<root>/scripts/`. */
const ROOT = new URL("../", import.meta.url);

/** Estensioni provate, in ordine: `.ts` sta davanti a `.tsx` per chiarezza. */
const EXTENSIONS = [".ts", ".tsx", "/index.ts", "/index.tsx"];

/**
 * Restituisce l'URL risolto se il file esiste, altrimenti `null`.
 * `base` è un URL (file o directory): ci si appende l'estensione.
 */
function resolveWithExtensions(base) {
  for (const ext of EXTENSIONS) {
    const candidate = new URL(base.href + ext);
    if (existsSync(fileURLToPath(candidate))) {
      return { url: candidate.href, shortCircuit: true, format: "module-typescript" };
    }
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    // Gli import con estensione esplicita sono già risolti dal resolver
    // standard: se falliscono qui è un errore vero, non un caso da aiutare.
    if (/\.[cm]?[jt]sx?$/.test(specifier)) throw err;

    // Alias `@/x` → `<root>/src/x`.
    if (specifier.startsWith("@/")) {
      const resolved = resolveWithExtensions(new URL(`src/${specifier.slice(2)}`, ROOT));
      if (resolved) return resolved;
      throw err;
    }

    // Import relativi senza estensione.
    if (!specifier.startsWith(".")) throw err;
    if (!context.parentURL?.startsWith("file:")) throw err;
    const resolved = resolveWithExtensions(new URL(specifier, context.parentURL));
    if (resolved) return resolved;
    throw err;
  }
}
