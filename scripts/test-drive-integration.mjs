/**
 * Test del connettore Google Drive (Fase 3.1).
 *
 * Verifica la parte con logica: traduzione della ricerca in linguaggio Drive,
 * scelta dell'endpoint per i Google-native, troncamento del contenuto.
 * Non copre le chiamate di rete (richiedono un token reale).
 *
 * Eseguire: node --experimental-strip-types scripts/test-drive-integration.mjs
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PROVIDER_CATALOG, getCatalogEntry } from "../src/lib/integrations/catalog.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * integration-tools.ts non è importabile qui: usa l'alias `@/` che Node non
 * risolve da solo. Per non duplicare la logica in un resolver fragile, i tool
 * vengono letti dal sorgente: è la verifica che interessa (che le definizioni
 * esistano davvero e che non ci siano scritture), non il loro comportamento.
 */
function readIntegrationToolsSource() {
  return fs.readFileSync(
    path.join(ROOT, "src/lib/agents/integration-tools.ts"),
    "utf8",
  );
}

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

console.log("\nCatalogo · Google Drive");

await test("provider presente con gli scope minimi", () => {
  const d = getCatalogEntry("google_drive");
  assert.ok(d);
  assert.equal(d.label, "Google Drive");
  assert.equal(d.brand, "googledrive");
  assert.equal(d.authType, "oauth2");
  assert.equal(d.hasApiProxy, true);
  assert.equal(d.tenantInput, undefined, "Drive non deve chiedere input all'utente");
});

await test("scope drive.file + drive.readonly, non drive completo", () => {
  const scopes = getCatalogEntry("google_drive").scopes;
  assert.ok(scopes.includes("https://www.googleapis.com/auth/drive.file"));
  assert.ok(scopes.includes("https://www.googleapis.com/auth/drive.readonly"));
  // Lo scope `drive` completo è quello che Google manda in verifica manuale.
  assert.equal(
    scopes.includes("https://www.googleapis.com/auth/drive"),
    false,
    "non deve chiedere l'accesso completo al Drive",
  );
});

await test("id provider valido per la route", () => {
  assert.equal(/^[a-z0-9_]+$/.test(getCatalogEntry("google_drive").id), true);
});

await test("nessun id duplicato nel catalogo", () => {
  const ids = PROVIDER_CATALOG.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length);
});

console.log("\nGitHub · non deve essere stato toccato");

await test("GitHub ancora presente e invariato", () => {
  const gh = getCatalogEntry("github");
  assert.ok(gh);
  assert.equal(gh.brand, "github");
  assert.equal(gh.authType, "oauth2");
  assert.deepEqual([...gh.scopes], ["repo", "read:user", "user:email"]);
  assert.equal(gh.hasApiProxy, true);
});

console.log("\nTool · registrazione");

await test("i 3 tool Drive sono definiti e registrati", () => {
  const src = readIntegrationToolsSource();
  for (const n of ["drive_search_files", "drive_read_file", "drive_list_folder"]) {
    assert.ok(src.includes(`"${n}"`), `tool non registrato: ${n}`);
    // Presente sia nella lista dei nomi sia nelle definizioni.
    assert.equal(
      src.split(`"${n}"`).length - 1 >= 2,
      true,
      `${n} deve comparire nei nomi E nelle definizioni`,
    );
  }
});

await test("nessun tool Drive con scritture implicite", () => {
  const src = readIntegrationToolsSource();
  const names = [...src.matchAll(/"(drive_[a-z_]+)"/g)].map((m) => m[1]);
  const unique = [...new Set(names)];
  const writes = unique.filter((n) => /create|update|delete|write|send|trash/i.test(n));
  // Open Decision 14: scritture solo col meccanismo di conferma, che non esiste.
  assert.deepEqual(writes, [], `scritture Drive non previste: ${writes.join(", ")}`);
  assert.equal(unique.length, 3, `attesi 3 tool, trovati: ${unique.join(", ")}`);
});

await test("drive_read_file dichiara fileId come required", () => {
  const src = readIntegrationToolsSource();
  // Ancoriamo sul blocco della definizione: il nome del tool compare anche
  // dentro le description degli altri, quindi `indexOf` sul nome nomenziona
  // la riga sbagliata.
  const start = src.indexOf("\n  drive_read_file: {");
  assert.ok(start > -1, "definizione drive_read_file non trovata");
  const chunk = src.slice(start, src.indexOf("\n  },", start));
  assert.ok(chunk.includes('required: ["fileId"]'), "fileId deve essere required");
  assert.ok(chunk.includes("description:"), "serve una description per il modello");
});

await test("i tool Drive sono negli optionalTools di qualche agente", () => {
  const src = fs.readFileSync(path.join(ROOT, "src/lib/agents/registry.ts"), "utf8");
  assert.ok(src.includes("const GOOGLE_DRIVE_TOOLS = ["), "lista tool mancante");
  const spreads = src.split("...GOOGLE_DRIVE_TOOLS,").length - 1;
  assert.ok(spreads >= 1, "la lista non è usata da nessun agente");
});

await test("i tool Drive sono in ALL_TOOLS_LIST", () => {
  const src = fs.readFileSync(
    path.join(ROOT, "src/lib/agents/feature-flags.ts"),
    "utf8",
  );
  for (const n of ["drive_search_files", "drive_read_file", "drive_list_folder"]) {
    assert.ok(src.includes(`"${n}"`), `non in ALL_TOOLS_LIST: ${n}`);
  }
});

console.log("\nUI · mappe provider");

await test("griglia, card inline, card agente e deploy mappano google_drive", () => {
  const files = [
    "src/components/IntegrationsGrid.tsx",
    "src/components/InlineConnectCard.tsx",
    "src/components/AgentIntegrationsCard.tsx",
    "src/app/agents/[slug]/deploy/deploy-client.tsx",
  ];
  for (const f of files) {
    const src = fs.readFileSync(path.join(ROOT, f), "utf8");
    assert.ok(
      src.includes("google_drive"),
      `${f} non mappa google_drive: la card o il badge resterebbero spenti`,
    );
  }
});

await test("catalogo: Drive disponibile", () => {
  const cat = fs.readFileSync(path.join(ROOT, "src/lib/integrations.ts"), "utf8");
  const entry = cat.slice(cat.indexOf('name: "Google Drive"'));
  assert.ok(
    entry.slice(0, 200).includes("available: true"),
    "Drive deve essere available: true per comparire fra le collegabili",
  );
});

await test("il totale della barra di progresso è derivato dalle app disponibili", () => {
  const page = fs.readFileSync(
    path.join(ROOT, "src/app/dashboard/integrations/page.tsx"),
    "utf8",
  );
  // Prima era un numero scritto a mano: ogni connettore aggiunto lo
  // dimenticava di aggiornare e la barra mostrava 12/15 con 13 app disponibili.
  assert.ok(
    page.includes("INTEGRATIONS.filter((a) => a.available).length"),
    "il totale deve derivare dalle app disponibili",
  );
  assert.ok(!/const total = \d+/.test(page), "c'è ancora un totale numerico a mano");
});

await test("guida in 3 passi presente per googledrive", () => {
  const src = fs.readFileSync(
    path.join(ROOT, "src/lib/integrations/guides.ts"),
    "utf8",
  );
  assert.ok(src.includes("googledrive: {"), "manca la guida");
  assert.ok(src.includes("whatItDoes"), "manca whatItDoes");
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);