/**
 * Test del connettore Mailchimp (Fase 3.5).
 *
 * Il punto specifico di Mailchimp è il data center: non esiste un host unico,
 * `dc` arriva solo dalla risposta allo scambio del token, e sia le API sia il
 * refresh dipendono da quel dato. Qui si verifica che venga salvato, propagato
 * e usato, e che senza di esso l'adapter fallisca in modo esplicito invece di
 * colpire un host sbagliato.
 *
 * Eseguire: npm run test:mailchimp
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  PROVIDER_CATALOG,
  IMPLEMENTED_PROVIDERS,
  getCatalogEntry,
} from "../src/lib/integrations/catalog.ts";

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

console.log("\nBatch 2 · stato finale");

await test("tutti e 5 i provider del batch sono implementati", () => {
  for (const id of ["google_drive", "airtable", "trello", "woocommerce", "mailchimp"]) {
    assert.ok(IMPLEMENTED_PROVIDERS.includes(id), `${id} non è implementato`);
    assert.ok(
      getCatalogEntry(id),
      `${id} manca dal catalogo`,
    );
  }
});

await test("il catalogo ha esattamente i 13 provider attesi", () => {
  assert.equal(PROVIDER_CATALOG.length, 13);
  const ids = PROVIDER_CATALOG.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length, "id duplicati");
});

await test("mailchimp: OAuth senza scope, categoria Marketing", () => {
  const m = getCatalogEntry("mailchimp");
  assert.ok(m);
  assert.equal(m.label, "Mailchimp");
  assert.equal(m.brand, "mailchimp");
  assert.equal(m.category, "Marketing");
  assert.equal(m.authType, "oauth2");
  assert.equal(m.hasApiProxy, true);
  // Mailchimp non usa scope OAuth: l'accesso dipende dal tipo di integrazione.
  assert.deepEqual([...m.scopes], []);
  assert.equal(m.tenantInput, undefined, "Mailchimp non chiede dati all'utente");
});

console.log("\nData center · il pezzo specifico di Mailchimp");

await test("exchangeCode salva dc e api_url in metadata", async () => {
  process.env.MAILCHIMP_CLIENT_ID = "id";
  process.env.MAILCHIMP_CLIENT_SECRET = "secret";
  const { mailchimpProvider } = await import(
    "../src/lib/integrations/providers/mailchimp.ts"
  );
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        access_token: "at-1",
        refresh_token: "rt-1",
        expires_in: 3600,
        dc: "us21",
        api_url: "https://us21.api.mailchimp.com/3.0",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  let r;
  try {
    r = await mailchimpProvider.exchangeCode({
      code: "the-code",
      redirectUri: "https://app.example.com/api/integrations/mailchimp/callback",
    });
  } finally {
    globalThis.fetch = realFetch;
  }
  assert.equal(r.metadata.dc, "us21");
  assert.equal(r.metadata.api_url, "https://us21.api.mailchimp.com/3.0");
  assert.equal(r.metadata.basic_username, "anystring");
  assert.equal(r.expiresAt !== null, true);
});

await test("senza dc/api_url lo scambio fallisce esplicitamente", async () => {
  process.env.MAILCHIMP_CLIENT_ID = "id";
  process.env.MAILCHIMP_CLIENT_SECRET = "secret";
  const { mailchimpProvider } = await import(
    "../src/lib/integrations/providers/mailchimp.ts"
  );
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ access_token: "at" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  try {
    await assert.rejects(
      () =>
        mailchimpProvider.exchangeCode({
          code: "c",
          redirectUri: "https://app.example.com/cb",
        }),
      /data center sconosciuto/i,
    );
  } finally {
    globalThis.fetch = realFetch;
  }
});

await test("refreshToken usa il dc dai metadata, non un host generico", async () => {
  const { mailchimpProvider } = await import(
    "../src/lib/integrations/providers/mailchimp.ts"
  );
  const realFetch = globalThis.fetch;
  let seen = null;
  globalThis.fetch = async (url) => {
    seen = String(url);
    return new Response(
      JSON.stringify({ access_token: "at-2", refresh_token: "rt-2", expires_in: 3600 }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };
  try {
    await mailchimpProvider.refreshToken({
      refreshToken: "rt-1",
      metadata: { dc: "eu7" },
    });
  } finally {
    globalThis.fetch = realFetch;
  }
  assert.ok(seen, "nessuna chiamata al refresh intercettata");
  assert.ok(
    seen.startsWith("https://eu7.api.mailchimp.com/oauth2/token"),
    `atteso l'host del datacenter, trovato ${seen}`,
  );
});

await test("refreshToken ricava il dc da api_url se manca", async () => {
  const { mailchimpProvider } = await import(
    "../src/lib/integrations/providers/mailchimp.ts"
  );
  const realFetch = globalThis.fetch;
  let seen = null;
  globalThis.fetch = async (url) => {
    seen = String(url);
    return new Response(JSON.stringify({ access_token: "at" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  try {
    await mailchimpProvider.refreshToken({
      refreshToken: "rt",
      metadata: { api_url: "https://us3.api.mailchimp.com/3.0" },
    });
  } finally {
    globalThis.fetch = realFetch;
  }
  assert.ok(seen.startsWith("https://us3.api.mailchimp.com/oauth2/token"), seen);
});

await test("senza nessun dc il refresh dice di riconnettersi", async () => {
  const { mailchimpProvider } = await import(
    "../src/lib/integrations/providers/mailchimp.ts"
  );
  await assert.rejects(
    () => mailchimpProvider.refreshToken({ refreshToken: "rt", metadata: {} }),
    /riconnetti/i,
  );
});

console.log("\nZona condivisa · metadata al refresh");

await test("resolveIntegrationToken passa metadata a refreshToken", () => {
  // Senza questo, l'adapter di Mailchimp non avrebbe il dc al rinnovo e il
  // refresh fallirebbe ogni ora con un errore incomprensibile.
  const src = fs.readFileSync(
    path.join(ROOT, "src/lib/integrations/api-proxy.ts"),
    "utf8",
  );
  assert.ok(
    src.includes("refreshViaAdapter(provider, refreshToken, metadata)"),
    "i metadata non vengono passati al refresh",
  );
  const types = fs.readFileSync(
    path.join(ROOT, "src/lib/integrations/types.ts"),
    "utf8",
  );
  assert.ok(
    types.includes("metadata?: Record<string, unknown>;"),
    "il refreshToken hook non accetta metadata",
  );
});

console.log("\nAutenticazione · Basic, non Bearer");

await test("l'header è Basic anystring:token", () => {
  const src = fs.readFileSync(
    path.join(ROOT, "src/lib/integrations/api-proxy.ts"),
    "utf8",
  );
  const start = src.indexOf("function mailchimpAuth");
  const fn = src.slice(start, src.indexOf("\n}", start));
  assert.ok(fn.includes("Basic"), "manca Basic");
  assert.ok(fn.includes("anystring") || fn.includes("basic_username"), "manca lo username");
  assert.ok(fn.includes("token.accessToken"), "manca il token come password");
  assert.ok(!fn.includes("Bearer"), "Mailchimp non usa Bearer");
});

console.log("\nNessun invio di campagna");

await test("i 3 tool Mailchimp sono read-only", () => {
  const src = fs.readFileSync(
    path.join(ROOT, "src/lib/agents/integration-tools.ts"),
    "utf8",
  );
  for (const n of [
    "mailchimp_list_audiences",
    "mailchimp_get_audience_stats",
    "mailchimp_list_campaigns",
  ]) {
    assert.ok(src.includes(`"${n}"`), `tool mancante: ${n}`);
  }
  const names = [...new Set([...src.matchAll(/"(mailchimp_[a-z_]+)"/g)].map((m) => m[1]))];
  const writes = names.filter((n) => /add|create|send|delete|update|schedule/i.test(n));
  assert.deepEqual(writes, [], `scritture non previste: ${writes.join(", ")}`);
  // Il brief esclude esplicitamente l'invio automatico di campagne.
  assert.ok(!names.includes("mailchimp_add_subscriber"));
  assert.ok(!names.some((n) => /send/i.test(n)), "nessun invio campagna");
});

console.log("\nUI · tutti e 5 i provider del batch mappati");

await test("catalog, griglia, card e deploy mappano i 5 nuovi", () => {
  // I file non usano tutti la stessa chiave: il catalogo e le guide usano il
  // brand ("googledrive"), le mappe di routing usano l'id del provider
  // ("google_drive"). Si cerca l'uno o l'altro.
  const files = [
    "src/lib/integrations.ts",
    "src/components/IntegrationsGrid.tsx",
    "src/components/InlineConnectCard.tsx",
    "src/components/AgentIntegrationsCard.tsx",
    "src/app/agents/[slug]/deploy/deploy-client.tsx",
    "src/lib/agents/tools.ts",
    "src/lib/integrations/guides.ts",
  ];
  const pairs = [
    ["googledrive", "google_drive"],
    ["airtable", null],
    ["trello", null],
    ["woocommerce", null],
    ["mailchimp", null],
  ];
  for (const f of files) {
    const src = fs.readFileSync(path.join(ROOT, f), "utf8");
    for (const [brand, id] of pairs) {
      // La mappa brand→provider è condivisa in @/lib/integrations: chi la
      // importa non ripete la stringa, quindi la presenza della mappa vale come
      // la presenza del brand.
      const found = id
        ? src.includes(brand) || src.includes(id) || src.includes("BRAND_TO_PROVIDER")
        : src.includes(brand) || src.includes("BRAND_TO_PROVIDER");
      assert.ok(found, `${f} non mappa ${id ?? brand}`);
    }
  }
  // L'invariante vera: le voci devono esistere nella mappa condivisa.
  const shared = fs.readFileSync(path.join(ROOT, "src/lib/integrations.ts"), "utf8");
  for (const [brand, id] of pairs) {
    assert.ok(
      shared.includes(`${brand}: "${id ?? brand}"`),
      `la mappa condivisa non mappa ${brand} → ${id ?? brand}`,
    );
  }
});

await test("tutti e 5 sono available: true nel catalogo", () => {
  const src = fs.readFileSync(path.join(ROOT, "src/lib/integrations.ts"), "utf8");
  for (const name of ["Google Drive", "Airtable", "Trello", "WooCommerce", "Mailchimp"]) {
    const at = src.indexOf(`name: "${name}"`);
    assert.ok(at > -1, `${name} non è nel catalogo`);
    assert.ok(
      src.slice(at, at + 200).includes("available: true"),
      `${name} deve essere available: true`,
    );
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);