/**
 * Loader ESM che risolve gli import relativi senza estensione come fa il
 * bundler di Next (`moduleResolution: "bundler"`).
 *
 * `node --experimental-strip-types` non lo fa da solo: nei sorgenti gli import
 * sono senza `.ts` (es. `from "../safe-url"`), quindi importare un adapter da
 * un test fallisce con ERR_MODULE_NOT_FOUND. I test non devono costringere il
 * codice di produzione a portare l'estensione, che sarebbe una deviazione dallo
 * stile del repo solo per colpa dei test.
 *
 * Uso: node --experimental-strip-types --import ./scripts/ts-resolve.mjs test.mjs
 */

import { register } from "node:module";
import { pathToFileURL } from "node:url";

register("./ts-ext-resolve.mjs", pathToFileURL("./scripts/"));