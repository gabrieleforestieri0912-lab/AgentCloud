/**
 * Test del connettore Trello (Fase 3.3).
 *
 * Trello è il caso atipico del batch: non fa OAuth authorization_code, rimanda
 * il token già pronto come `?token=` e non ha refresh. Qui si verifica che i
 * due pezzi di Fase 2 pensati per lui (authParam, tokenInRedirect) siano usati
 * davvero, e che il token non finisca mai in un header Authorization che
 * Trello rifiuta.
 *
 * Eseguire: node --experimental-strip-types scripts/test-trello-integration.mjs
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getCatalogEntry, isImplementedProvider } from "../src/lib/integrations/catalog.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (e) {
    failed++;
    console.log(`FAIL  ${name}`);
    console.log(`      ${e.message.split("\n")[0]}`);
  }
}

console.log("\nCatalogo · Trello");

await test("presente, implementato, senza PKCE (Trello non lo supporta)", () => {
  const t = getCatalogEntry("trello");
  assert.ok(t);
  assert.equal(t.label, "Trello");
  assert.equal(t.brand, "trello");
  assert.equal(t.category, "Project Management");
  assert.equal(t.authType, "oauth2", "Trello non ha PKCE: non dichiararlo");
  assert.equal(t.hasApiProxy, true);
  assert.deepEqual([...t.scopes], ["read", "write"]);
  assert.equal(isImplementedProvider("trello"), true);
});

await test("Trello è implementato", () => {
  // Come in test-airtable: niente asserzioni sullo stato degli altri provider.
  assert.equal(isImplementedProvider("trello"), true);
});

console.log("\nAdapter · il flusso non-standard di Trello");

await test("authParam è 'token' e tokenInRedirect è attivo", async () => {
  const { trelloProvider } = await import("../src/lib/integrations/providers/trello.ts");
  assert.equal(trelloProvider.authParam, "token", "il parametro è token, non code");
  assert.equal(trelloProvider.tokenInRedirect, true);
});

await test("getAuthUrl usa /1/authorize con response_type=token", async () => {
  process.env.TRELLO_API_KEY = "app-key-123";
  const { trelloProvider } = await import("../src/lib/integrations/providers/trello.ts");
  const url = new URL(
    trelloProvider.getAuthUrl({
      state: "st",
      redirectUri: "https://example.com/api/integrations/trello/callback",
    }),
  );
  assert.equal(url.origin + url.pathname, "https://trello.com/1/authorize");
  assert.equal(url.searchParams.get("key"), "app-key-123");
  assert.equal(url.searchParams.get("response_type"), "token");
  assert.equal(url.searchParams.get("scope"), "read,write");
  assert.equal(url.searchParams.get("state"), "st");
  assert.equal(url.searchParams.get("redirect_uri"),
    "https://example.com/api/integrations/trello/callback");
});

await test("expiration è 30days, non never", async () => {
  const { trelloProvider } = await import("../src/lib/integrations/providers/trello.ts");
  const url = new URL(
    trelloProvider.getAuthUrl({ state: "st", redirectUri: "https://example.com/x" }),
  );
  assert.equal(url.searchParams.get("expiration"), "30days");
  assert.notEqual(url.searchParams.get("expiration"), "never");
});

await test("senza TRELLO_API_KEY l'adapter dice cosa manca", async () => {
  delete process.env.TRELLO_API_KEY;
  const { trelloProvider } = await import("../src/lib/integrations/providers/trello.ts");
  assert.throws(
    () => trelloProvider.getAuthUrl({ state: "st", redirectUri: "https://example.com/x" }),
    /TRELLO_API_KEY/,
  );
  process.env.TRELLO_API_KEY = "app-key-123";
});

await test("exchangeCode NON chiama la rete: il code è già il token", async () => {
  const { trelloProvider } = await import("../src/lib/integrations/providers/trello.ts");
  const realFetch = globalThis.fetch;
  let called = 0;
  globalThis.fetch = async () => {
    called++;
    return new Response("{}", { status: 200 });
  };
  let result;
  try {
    result = await trelloProvider.exchangeCode({ code: "user-token-xyz" });
  } finally {
    globalThis.fetch = realFetch;
  }
  // Solo whoami può chiamare: nessuno scambio di codice.
  assert.equal(result.accessToken, "user-token-xyz");
  assert.ok(called <= 1, `attese al massimo 1 chiamata (whoami), trovate ${called}`);
});

await test("refreshToken non esiste: Trello non rinnova", async () => {
  const { trelloProvider } = await import("../src/lib/integrations/providers/trello.ts");
  assert.equal(trelloProvider.refreshToken, undefined);
});

await test("il risultato ha refreshToken null e una expires_at", async () => {
  const { trelloProvider } = await import("../src/lib/integrations/providers/trello.ts");
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("{}", { status: 200 });
  let r;
  try {
    r = await trelloProvider.exchangeCode({ code: "tok" });
  } finally {
    globalThis.fetch = realFetch;
  }
  assert.equal(r.refreshToken, null, "nessun refresh token da cui rinnovare");
  assert.ok(r.expiresAt, "deve esserci una scadenza, altrimenti scadrebbe silenziosamente");
  // ~30 giorni
  const days = (new Date(r.expiresAt).getTime() - Date.now()) / 86_400_000;
  assert.ok(days > 29 && days < 31, `attesi ~30 giorni, trovati ${days.toFixed(1)}`);
});

await test("token vuoto rifiutato", async () => {
  const { trelloProvider } = await import("../src/lib/integrations/providers/trello.ts");
  await assert.rejects(() => trelloProvider.exchangeCode({ code: "  " }), /nessun token/i);
});

console.log("\nProxy · key e token in query string, non in header");

await test("trelloUrl mette key e token come query param", () => {
  const src = fs.readFileSync(
    path.join(ROOT, "src/lib/integrations/api-proxy.ts"),
    "utf8",
  );
  const start = src.indexOf("function trelloUrl");
  const fn = src.slice(start, src.indexOf("\n}", start));
  assert.ok(fn.includes('url.searchParams.set("key", appKey)'), "key in query");
  assert.ok(fn.includes('url.searchParams.set("token", token.accessToken)'), "token in query");
  // Trello rifiuta Authorization su quasi tutti gli endpoint: il proxy non deve
  // costruire header Bearer per questo provider.
  assert.ok(!fn.includes("Authorization"), "non deve impostare header Authorization");
});

await test("gli endpoint Trello sono quelli giusti", () => {
  const src = fs.readFileSync(
    path.join(ROOT, "src/lib/integrations/api-proxy.ts"),
    "utf8",
  );
  assert.ok(src.includes('const TRELLO_API = "https://api.trello.com/1"'));
  assert.ok(src.includes("/members/me/boards"), "list boards");
  assert.ok(src.includes("/boards/${encodeURIComponent(boardId)}/cards"), "cards per board");
  assert.ok(src.includes("/lists/${encodeURIComponent(listId)}/cards"), "cards per list");
});

await test("nessun token Trello finisce in un errore o in un log", () => {
  // Il token sta nella query string (protocollo Trello), quindi la URL non deve
  // mai comparire in un log né nell'errore riportato al modello.
  const http = fs.readFileSync(path.join(ROOT, "src/lib/integrations/http.ts"), "utf8");
  const start = http.indexOf("export async function providerRequest");
  const fn = http.slice(start);
  const logs = [...fn.matchAll(/console\.(log|error|warn|info)\(([^)]*)\)/g)];
  for (const [, , args] of logs) {
    assert.ok(!/\burl\b/.test(args), `providerRequest logga la url: console.*(${args})`);
  }
  // I messaggi d'errore compongono solo etichetta provider + status + corpo.
  const errors = [...fn.matchAll(/error:\s*[`"'].*?`/g)].map((m) => m[0]);
  for (const e of errors) {
    assert.ok(!/\burl\b/.test(e), `messaggio d'errore contiene la url: ${e}`);
  }
});

console.log("\nZona condivisa · token scaduto senza refresh");

await test("resolveIntegrationToken segnala la scadenza quando non può rinnovare", () => {
  const src = fs.readFileSync(
    path.join(ROOT, "src/lib/integrations/api-proxy.ts"),
    "utf8",
  );
  // Prima di questa correzione un token scaduto senza refresh tornava ok:true e
  // il proxy mandava la richiesta, arrivando a un 401 che il modello non sa
  // spiegare. La guardia deve esistere.
  assert.ok(
    src.includes("does not issue refresh tokens"),
    "manca il messaggio di riconnessione per i provider senza refresh",
  );
  assert.ok(src.includes("if (!refreshToken && row.expires_at && isPast(row.expires_at))"),
    "manca la guardia sulla scadenza senza refresh");
  assert.ok(src.includes("function isPast("), "manca l'helper isPast");
});

console.log("\nTool · sola lettura");

await test("i 2 tool Trello registrati, nessuna scrittura", () => {
  const src = fs.readFileSync(
    path.join(ROOT, "src/lib/agents/integration-tools.ts"),
    "utf8",
  );
  for (const n of ["trello_list_boards", "trello_list_cards"]) {
    assert.ok(src.includes(`"${n}"`), `tool mancante: ${n}`);
  }
  const names = [...src.matchAll(/"(trello_[a-z_]+)"/g)].map((m) => m[1]);
  const unique = [...new Set(names)];
  const writes = unique.filter((n) => /create|update|delete|move|comment/i.test(n));
  assert.deepEqual(writes, [], `scritture non previste: ${writes.join(", ")}`);
  assert.equal(unique.length, 2, `attesi 2 tool, trovati: ${unique.join(", ")}`);
});

await test("i tool Trello sono negli agenti giusti, non in tutti", () => {
  const reg = fs.readFileSync(path.join(ROOT, "src/lib/agents/registry.ts"), "utf8");
  assert.ok(reg.includes("const TRELLO_TOOLS = ["), "lista mancante");
  const spreads = reg.split("...TRELLO_TOOLS,").length - 1;
  assert.ok(spreads >= 2, `attesi almeno 2 agenti, trovati ${spreads}`);
  // Non dev'essere dato a tutti i 15 agenti: è il provider meno universale.
  assert.ok(spreads <= 4, `Trello è troppo diffuso: ${spreads} agenti`);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);