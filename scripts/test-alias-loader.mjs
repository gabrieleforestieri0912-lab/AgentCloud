/**
 * Loader per i test: risolve l'alias `@/` (come fa Next.js) e le import
 * senza estensione (come fa il `moduleResolution: bundler` di TypeScript).
 *
 * Serve solo ai test: il codice dell'applicazione non lo usa.
 *
 *   node --import ./scripts/register-test-alias.mjs --test scripts/test-mcp.mjs
 */

import path from "node:path";
import { pathToFileURL } from "node:url";

const SRC = path.resolve(process.cwd(), "src");

/** Estensioni provate quando l'import non le ha. */
const CANDIDATES = [".ts", ".tsx", ".mts", ".js", ".mjs", "/index.ts", "/index.tsx"];

export async function resolve(specifier, context, nextResolve) {
  // Alias del progetto: `@/lib/x` → `src/lib/x`.
  if (specifier.startsWith("@/")) {
    const target = path.join(SRC, specifier.slice(2));
    return resolveFile(target, context, nextResolve);
  }

  // Import relativi senza estensione: `../integrations/registry`.
  if (specifier.startsWith("./") || specifier.startsWith("../")) {
    const parentPath = context.parentURL?.startsWith("file:")
      ? path.dirname(new URL(context.parentURL).pathname.replace(/^\/([A-Za-z]:)/, "$1"))
      : null;
    if (parentPath) {
      const target = path.resolve(parentPath, specifier);
      try {
        return await nextResolve(specifier, context);
      } catch {
        return resolveFile(target, context, nextResolve);
      }
    }
  }

  return nextResolve(specifier, context);
}

async function resolveFile(target, context, nextResolve) {
  for (const candidate of CANDIDATES) {
    const file = `${target}${candidate}`;
    try {
      return await nextResolve(pathToFileURL(file).href, context);
    } catch {
      // prova il candidato successivo
    }
  }
  return nextResolve(pathToFileURL(target).href, context);
}
