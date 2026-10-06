/**
 * Test del connettore Airtable (Fase 3.2).
 *
 * Airtable è il primo provider che usa davvero il PKCE, quindi qui si verifica
 * che il verifier non finisca mai nella URL di autorizzazione e che arrivi allo
 * scambio. Verifica anche la traduzione del filtro in filterByFormula, che
 * è la parte con logica.
 *
 * Eseguire: node --experimental-strip-types scripts/test-airtable-integration.mjs
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getCatalogEntry, isImplementedProvider } from "../src/lib/integrations/catalog.ts";
import { createPkcePair } from "../src/lib/integrations/state.ts";

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

console.log("\nCatalogo · Airtable");

await test("provider presente, PKCE, scope attesi", () => {
  const a = getCatalogEntry("airtable");
  assert.ok(a);
  assert.equal(a.label, "Airtable");
  assert.equal(a.brand, "airtable");
  assert.equal(a.category, "Database");
  assert.equal(a.authType, "oauth2_pkce", "Airtable deve dichiarare PKCE");
  assert.equal(a.hasApiProxy, true);
  assert.deepEqual([...a.scopes], [
    "data.records:read",
    "data.records:write",
    "schema.bases:read",
  ]);
});

await test("è fra i provider implementati", () => {
  assert.equal(isImplementedProvider("airtable"), true);
});

await test("Airtable è implementato", () => {
  // Nota: i test di un connettore non asseriscono MAI "gli altri provider del
  // batch non sono ancora implementati". Quella forma è fallita quattro volte di
  // fila (ogni connettore rompeva il test del precedente) e non dava alcuna
  // sicurezza: il fatto che gli altri siano implementati è già garantito dal
  // typecheck su Record<ImplementedProvider, IntegrationProvider> e dai test del
  // rispettivo connettore.
  assert.equal(isImplementedProvider("airtable"), true);
});

console.log("\nPKCE · il verifier non deve mai finire nella URL");

await test("getAuthUrl manda code_challenge, non il verifier", async () => {
  process.env.AIRTABLE_CLIENT_ID = "test-client-id";
  const { airtableProvider } = await import("../src/lib/integrations/providers/airtable.ts");
  const { codeVerifier, codeChallenge } = createPkcePair();

  const url = airtableProvider.getAuthUrl({
    state: "st",
    redirectUri: "https://example.com/api/integrations/airtable/callback",
    pkce: { codeChallenge },
  });

  assert.ok(url.startsWith("https://airtable.com/oauth2/v1/authorize?"));
  const parsed = new URL(url);
  assert.equal(parsed.searchParams.get("code_challenge"), codeChallenge);
  assert.equal(parsed.searchParams.get("code_challenge_method"), "S256");
  assert.equal(parsed.searchParams.get("state"), "st");
  // Il punto di sicurezza: il verifier non deve comparire nella URL.
  assert.equal(url.includes(codeVerifier), false, "il code_verifier è leaked nella URL");
  assert.equal(parsed.searchParams.get("code_verifier"), null);
});

await test("senza PKCE l'adapter fallisce invece di mandare una URL senza challenge", async () => {
  const { airtableProvider } = await import("../src/lib/integrations/providers/airtable.ts");
  assert.throws(
    () =>
      airtableProvider.getAuthUrl({
        state: "st",
        redirectUri: "https://example.com/api/integrations/airtable/callback",
      }),
    /PKCE/i,
  );
});

await test("senza client_id l'adapter dice cosa manca", async () => {
  delete process.env.AIRTABLE_CLIENT_ID;
  const { airtableProvider } = await import("../src/lib/integrations/providers/airtable.ts");
  const { codeChallenge } = createPkcePair();
  assert.throws(
    () =>
      airtableProvider.getAuthUrl({
        state: "st",
        redirectUri: "https://example.com/x",
        pkce: { codeChallenge },
      }),
    /AIRTABLE_CLIENT_ID/,
  );
});

await test("exchangeCode richiede il code_verifier", async () => {
  const { airtableProvider } = await import("../src/lib/integrations/providers/airtable.ts");
  process.env.AIRTABLE_CLIENT_ID = "id";
  process.env.AIRTABLE_CLIENT_SECRET = "secret";
  await assert.rejects(
    () =>
      airtableProvider.exchangeCode({
        code: "abc",
        redirectUri: "https://example.com/x",
      }),
    /code_verifier mancante/i,
  );
});

await test("exchangeCode manda code_verifier, mai code_challenge", async () => {
  const { airtableProvider } = await import("../src/lib/integrations/providers/airtable.ts");
  // Intercettiamo il fetch globale per ispezionare il body dello scambio.
  const realFetch = globalThis.fetch;
  let sentBody = null;
  globalThis.fetch = async (url, init) => {
    if (String(url).includes("/oauth2/v1/token")) {
      sentBody = new URLSearchParams(init.body);
    }
    return new Response(
      JSON.stringify({ access_token: "at", refresh_token: "rt", expires_in: 3600 }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };
  const { codeVerifier } = createPkcePair();
  try {
    await airtableProvider.exchangeCode({
      code: "the-code",
      redirectUri: "https://example.com/x",
      codeVerifier,
    });
  } finally {
    globalThis.fetch = realFetch;
  }
  assert.ok(sentBody, "nessuna chiamata a /token intercettata");
  assert.equal(sentBody.get("grant_type"), "authorization_code");
  assert.equal(sentBody.get("code_verifier"), codeVerifier);
  assert.equal(sentBody.get("code"), "the-code");
  assert.equal(sentBody.get("code_challenge"), null, "lo scambio usa il verifier, non la challenge");
});

console.log("\nProxy · traduzione del filtro in filterByFormula");

await test("campo: valore → formula con campo tra graffe", async () => {
  const src = fs.readFileSync(
    path.join(ROOT, "src/lib/integrations/api-proxy.ts"),
    "utf8",
  );
  const start = src.indexOf("function buildAirtableFormula");
  assert.ok(start > -1, "buildAirtableFormula non trovata");
  const fn = src.slice(start, src.indexOf("\n}", start));
  assert.ok(fn.includes('`{${field}}=${airtableFormulaString(value)}`'), "forma campo: valore");
  assert.ok(fn.includes('raw.match(/^([^:=]+?)\\s*[:=]\\s*(.+)$/)'), "forma chiave = valore");
});

await test("escape delle virgolette nella formula", async () => {
  const src = fs.readFileSync(
    path.join(ROOT, "src/lib/integrations/api-proxy.ts"),
    "utf8",
  );
  const start = src.indexOf("function airtableFormulaString");
  const fn = src.slice(start, src.indexOf("\n}", start));
  // Una stringa con apici non deve poter iniettare una formula.
  assert.ok(fn.includes('replace(/"/g'), "le virgolette vanno escaped");
  assert.ok(fn.includes('\\\\'), "i backslash vanno escaped");
});

await test("gli endpoint Airtable sono quelli giusti", async () => {
  const src = fs.readFileSync(
    path.join(ROOT, "src/lib/integrations/api-proxy.ts"),
    "utf8",
  );
  assert.ok(src.includes('const AIRTABLE_API = "https://api.airtable.com/v0"'));
  assert.ok(src.includes("/meta/bases`"), "list bases");
  assert.ok(src.includes("/meta/bases/${encodeURIComponent(baseId)}/tables"), "list tables");
  assert.ok(src.includes('url.searchParams.set("filterByFormula", formula)'), "filtro");
});

console.log("\nTool · sola lettura");

await test("i 3 tool Airtable sono registrati, nessuna scrittura", () => {
  const src = fs.readFileSync(
    path.join(ROOT, "src/lib/agents/integration-tools.ts"),
    "utf8",
  );
  for (const n of ["airtable_list_bases", "airtable_list_tables", "airtable_list_records"]) {
    assert.ok(src.includes(`"${n}"`), `tool mancante: ${n}`);
  }
  const names = [...src.matchAll(/"(airtable_[a-z_]+)"/g)].map((m) => m[1]);
  const unique = [...new Set(names)];
  const writes = unique.filter((n) => /create|update|delete/i.test(n));
  assert.deepEqual(writes, [], `scritture non previste: ${writes.join(", ")}`);
  assert.equal(unique.length, 3, `attesi 3 tool, trovati: ${unique.join(", ")}`);
});

await test("airtable_list_records richiede baseId e tableId", () => {
  const src = fs.readFileSync(
    path.join(ROOT, "src/lib/agents/integration-tools.ts"),
    "utf8",
  );
  const start = src.indexOf("\n  airtable_list_records: {");
  const chunk = src.slice(start, src.indexOf("\n  },", start));
  assert.ok(chunk.includes('required: ["baseId", "tableId"]'));
});

await test("tool in ALL_TOOLS_LIST e negli agenti", () => {
  const flags = fs.readFileSync(
    path.join(ROOT, "src/lib/agents/feature-flags.ts"),
    "utf8",
  );
  assert.ok(flags.includes('"airtable_list_bases"'), "non in ALL_TOOLS_LIST");
  const reg = fs.readFileSync(path.join(ROOT, "src/lib/agents/registry.ts"), "utf8");
  assert.ok(reg.includes("const AIRTABLE_TOOLS = ["), "lista mancante");
  assert.ok(reg.includes("...AIRTABLE_TOOLS,"), "lista non usata");
});

console.log("\nUI · mappature");

await test("catalog, griglia, card e deploy mappano airtable", () => {
  for (const f of [
    "src/lib/integrations.ts",
    "src/components/IntegrationsGrid.tsx",
    "src/components/InlineConnectCard.tsx",
    "src/components/AgentIntegrationsCard.tsx",
    "src/app/agents/[slug]/deploy/deploy-client.tsx",
    "src/lib/agents/tools.ts",
  ]) {
    const src = fs.readFileSync(path.join(ROOT, f), "utf8");
    assert.ok(src.includes("airtable"), `${f} non menziona airtable`);
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);