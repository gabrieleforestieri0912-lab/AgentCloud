/**
 * Hook di risoluzione: se un import relativo non ha estensione e il file
 * esiste come .ts, lo risolve. Cosa serve per i test sotto node --experimental-strip-types.
 */

import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    // Solo import relativi senza estensione: gli alias @/ restano al bundler.
    if (!specifier.startsWith(".") || /\.[cm]?[jt]sx?$/.test(specifier)) throw err;
    const parentPath = context.parentURL?.startsWith("file:")
      ? fileURLToPath(context.parentURL)
      : null;
    if (!parentPath) throw err;
    const base = new URL(specifier, context.parentURL);
    for (const ext of [".ts", ".tsx", "/index.ts"]) {
      const candidate = new URL(base.href + ext);
      if (existsSync(fileURLToPath(candidate))) {
        return { url: candidate.href, shortCircuit: true, format: "module-typescript" };
      }
    }
    throw err;
  }
}