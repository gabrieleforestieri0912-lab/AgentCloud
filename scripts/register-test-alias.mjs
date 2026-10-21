/**
 * Registra il loader degli alias per i test.
 *
 *   node --import ./scripts/register-test-alias.mjs --test scripts/test-mcp.mjs
 */

import { register } from "node:module";
import { pathToFileURL } from "node:url";

register("./test-alias-loader.mjs", pathToFileURL("./scripts/"));
