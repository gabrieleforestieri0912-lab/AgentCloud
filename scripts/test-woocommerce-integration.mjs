/**
 * Test del connettore WooCommerce (Fase 3.4).
 *
 * WooCommerce è il caso più delicato del batch: non è OAuth, l'URL dello store
 * viene dall'utente (superficie SSRF) e le credenziali sono una coppia per
 * tenant, non un token. Qui si verifica soprattutto che l'URL non possa
 * puntare alla rete interna e che le chiavi non finiscano mai dove non devono.
 *
 * Eseguire: node --experimental-strip-types scripts/test-woocommerce-integration.mjs
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  getCatalogEntry,
  isImplementedProvider,
} from "../src/lib/integrations/catalog.ts";
import {
  normalizeTenantUrl,
  assertPublicHost,
  isBlockedIp,
} from "../src/lib/integrations/safe-url.ts";
import {
  fromWooProduct,
  fromWooOrder,
  formatProduct,
  formatOrder,
  parseAmount,
} from "../src/lib/commerce/normalize.ts";

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

console.log("\nCatalogo · WooCommerce");

await test("keypair, con i due campi che l'utente deve fornire", () => {
  const w = getCatalogEntry("woocommerce");
  assert.ok(w);
  assert.equal(w.label, "WooCommerce");
  assert.equal(w.authType, "keypair", "WooCommerce non è OAuth");
  assert.equal(w.tokenUsage, undefined); // il tokenUsage sta sull'adapter
  assert.equal(w.hasApiProxy, true);
  assert.equal(isImplementedProvider("woocommerce"), true);
  assert.deepEqual([...w.scopes], ["read_write"]);

  const keys = w.tenantInput.fields.map((f) => f.key);
  assert.deepEqual(keys, ["store_url", "user_id"], "servono URL e WordPress User ID");
  assert.equal(w.tenantInput.fields[0].validateAsUrl, true, "store_url va validato come URL");
  // L'hint serve perché l'User ID non è intuibile.
  assert.ok(w.tenantInput.fields[1].hint, "serve spiegare come trovare l'User ID");
});

console.log("\nSSRF · l'URL dello store non può puntare alla rete interna");

await test("host interni rifiutati da normalizeTenantUrl", () => {
  const bad = [
    "http://localhost",
    "http://127.0.0.1",
    "http://127.0.0.1:8080/wp-json",
    "http://169.254.169.254/latest/meta-data",
    "http://10.0.0.5",
    "http://192.168.1.1",
    "http://172.16.0.1",
    "http://[::1]",
    "http://metadata.google.internal",
    "http://redis.internal",
    "http://0.0.0.0",
    "https://100.64.0.1",
  ];
  for (const u of bad) {
    assert.equal(normalizeTenantUrl(u).ok, false, `avrebbe dovuto rifiutare ${u}`);
  }
});

await test("porte non standard rifiutate (niente admin panel su porta alta)", () => {
  assert.equal(normalizeTenantUrl("https://shop.example.com:8443").ok, false);
  assert.equal(normalizeTenantUrl("https://shop.example.com:22").ok, false);
});

await test("credenziali nell'URL rifiutate", () => {
  assert.equal(normalizeTenantUrl("https://user:pass@shop.example.com").ok, false);
});

await test("redirect a IP privato via nome host viene bloccato da assertPublicHost", async () => {
  // Caso reale di DNS rebinding: il nome sembra innocuo ma risolve in locale.
  const r = await assertPublicHost("localhost");
  assert.equal(r.ok, false);
  const r2 = await assertPublicHost("127.0.0.1");
  assert.equal(r2.ok, false);
  const r3 = await assertPublicHost("169.254.169.254");
  assert.equal(r3.ok, false);
});

await test("il proxy richiama assertPublicHost prima di ogni fetch", () => {
  const src = fs.readFileSync(
    path.join(ROOT, "src/lib/integrations/api-proxy.ts"),
    "utf8",
  );
  const start = src.indexOf("async function wooStoreBase");
  assert.ok(start > -1, "wooStoreBase non trovata");
  const fn = src.slice(start, src.indexOf("\n}", start));
  assert.ok(fn.includes("assertPublicHost"), "manca il controllo DNS");
  assert.ok(fn.includes("normalizeTenantUrl"), "manca la validazione sintattica");
  // wooApiProxy deve chiamarla come prima cosa, prima di qualunque fetch.
  const api = src.slice(src.indexOf("export async function wooApiProxy"));
  const checkAt = api.indexOf("await wooStoreBase(token)");
  const firstFetch = api.indexOf("providerRequest(");
  assert.ok(checkAt > -1, "wooApiProxy non chiama wooStoreBase");
  assert.ok(
    checkAt < firstFetch,
    "il controllo SSRF deve precedere la prima chiamata di rete",
  );
});

await test("la Basic auth non finisce nella query string", () => {
  const src = fs.readFileSync(
    path.join(ROOT, "src/lib/integrations/api-proxy.ts"),
    "utf8",
  );
  const api = src.slice(src.indexOf("export async function wooApiProxy"));
  // A differenza di Trello, qui key e secret stanno nell'header Authorization.
  assert.ok(api.includes("Authorization: integrationAuth(token)"), "manca l'header");
  assert.ok(
    !/searchParams\.set\("(consumer_key|consumer_secret)"/.test(api),
    "le credenziali non devono finire nella URL",
  );
});

console.log("\nAdapter · coppia di credenziali");

await test("authParam/secretParam/tokenInRedirect/tokenUsage dichiarati", async () => {
  const { woocommerceProvider } = await import(
    "../src/lib/integrations/providers/woocommerce.ts"
  );
  assert.equal(woocommerceProvider.authParam, "consumer_key");
  assert.equal(woocommerceProvider.secretParam, "consumer_secret");
  assert.equal(woocommerceProvider.tokenInRedirect, true);
  assert.equal(woocommerceProvider.tokenUsage, "keypair");
});

await test("getAuthUrl usa /wc-auth/v1/authorize sullo store del tenant", async () => {
  process.env.WOOCOMMERCE_APP_NAME = "AgentCloud Test";
  const { woocommerceProvider } = await import(
    "../src/lib/integrations/providers/woocommerce.ts"
  );
  const url = new URL(
    woocommerceProvider.getAuthUrl({
      state: "st",
      redirectUri: "https://app.example.com/api/integrations/woocommerce/callback",
      tenantInput: { store_url: "https://shop.example.com", user_id: "7" },
    }),
  );
  assert.equal(url.origin + url.pathname, "https://shop.example.com/wp-json/wc-auth/v1/authorize");
  assert.equal(url.searchParams.get("app_name"), "AgentCloud Test");
  assert.equal(url.searchParams.get("scope"), "read_write");
  assert.equal(url.searchParams.get("user_id"), "7");
  assert.equal(url.searchParams.get("state"), "st");
  // La chiave dell'app non deve finire nell'authorize URL.
  assert.equal(url.searchParams.get("consumer_key"), null);
});

await test("User ID non numerico rifiutato", async () => {
  const { woocommerceProvider } = await import(
    "../src/lib/integrations/providers/woocommerce.ts"
  );
  assert.throws(
    () =>
      woocommerceProvider.getAuthUrl({
        state: "st",
        redirectUri: "https://x.example.com/cb",
        tenantInput: { store_url: "https://shop.example.com", user_id: "admin" },
      }),
    /deve essere un numero/i,
  );
});

await test("store mancante rifiutato", async () => {
  const { woocommerceProvider } = await import(
    "../src/lib/integrations/providers/woocommerce.ts"
  );
  assert.throws(
    () =>
      woocommerceProvider.getAuthUrl({
        state: "st",
        redirectUri: "https://x.example.com/cb",
        tenantInput: { user_id: "1" },
      }),
    /URL dello store/i,
  );
});

await test("senza Consumer Secret il risultato è un errore, non una connessione a metà", async () => {
  const { woocommerceProvider } = await import(
    "../src/lib/integrations/providers/woocommerce.ts"
  );
  await assert.rejects(
    () =>
      woocommerceProvider.exchangeCode({
        code: "ck_123",
        redirectUri: "https://x.example.com/cb",
        tenantInput: { store_url: "https://shop.example.com", user_id: "1" },
      }),
    /Consumer Secret/i,
  );
});

await test("le due credenziali finiscono in access_token e refresh_token", async () => {
  const { woocommerceProvider } = await import(
    "../src/lib/integrations/providers/woocommerce.ts"
  );
  const r = await woocommerceProvider.exchangeCode({
    code: "ck_123",
    codeSecret: "cs_456",
    redirectUri: "https://x.example.com/cb",
    tenantInput: { store_url: "https://shop.example.com", user_id: "1" },
  });
  assert.equal(r.accessToken, "ck_123");
  assert.equal(r.refreshToken, "cs_456");
  assert.equal(r.expiresAt, null, "le chiavi WooCommerce non scadono");
  assert.equal(r.metadata.store_url, "https://shop.example.com");
  assert.equal(r.externalAccountId, "shop.example.com");
});

await test("store URL malevolo rifiutato anche in exchangeCode", async () => {
  const { woocommerceProvider } = await import(
    "../src/lib/integrations/providers/woocommerce.ts"
  );
  await assert.rejects(
    () =>
      woocommerceProvider.exchangeCode({
        code: "ck",
        codeSecret: "cs",
        redirectUri: "https://x.example.com/cb",
        // Lo state è firmato, ma la validazione si rifà dove si decide dove scrivere.
        tenantInput: { store_url: "https://169.254.169.254", user_id: "1" },
      }),
    /non valido/i,
  );
});

console.log("\nNormalizzazione · formato comune prodotti e ordini");

await test("parseAmount gestisce numeri e stringhe con virgola", () => {
  assert.equal(parseAmount(12.9), 12.9);
  assert.equal(parseAmount("12.90"), 12.9);
  assert.equal(parseAmount("12,90"), 12.9);
  assert.equal(parseAmount("-5.00"), -5);
  // Formato italiano: punto = migliaia, virgola = decimale.
  assert.equal(parseAmount("€ 1.234,56"), 1234.56);
  assert.equal(parseAmount("1,234.56"), 1234.56);
});

await test("parseAmount restituisce null, non 0, su input non numerici", () => {
  // `Number("")` è 0: senza questo controllo un prodotto a prezzo variabile
  // (WooCommerce manda stringa vuota) risulterebbe "gratis" all'agente.
  assert.equal(parseAmount(""), null);
  assert.equal(parseAmount("   "), null);
  assert.equal(parseAmount("abc"), null);
  assert.equal(parseAmount(undefined), null);
  assert.equal(parseAmount(null), null);
  // 0 come numero è invece un prezzo legittimo.
  assert.equal(parseAmount("0"), 0);
  assert.equal(parseAmount(0), 0);
});

await test("prodotto in saldo: sale_price vince e regular diventa compareAt", () => {
  const p = fromWooProduct({
    id: 12,
    name: "T-Shirt",
    price: "19.90",
    regular_price: "29.90",
    sale_price: "19.90",
    stock_status: "instock",
    sku: "TS-1",
  });
  assert.equal(p.price.amount, "19.90");
  assert.equal(p.compareAtPrice.amount, "29.90");
  assert.equal(p.available, true);
  assert.equal(p.sku, "TS-1");
  assert.equal(p.id, "12");
});

await test("prodotto non in saldo: nessun compareAt", () => {
  const p = fromWooProduct({ id: 1, name: "X", price: "10.00", stock_status: "instock" });
  assert.equal(p.compareAtPrice, null);
  assert.equal(p.price.amount, "10.00");
});

await test("prodotto esaurito marcato come tale", () => {
  const p = fromWooProduct({ id: 2, name: "Y", price: "5.00", stock_status: "outofstock" });
  assert.equal(p.available, false);
  assert.match(formatProduct(p), /\[esaurito\]/);
});

await test("prodotto a prezzo variabile non viene falsato a 0", () => {
  // WooCommerce restituisce price "" per i prodotti con prezzi variabili.
  const p = fromWooProduct({ id: 3, name: "Z", price: "", regular_price: "" });
  assert.equal(p.price, null, "meglio nessun prezzo che uno 0 falso");
});

await test("ordine: numero, totale, cliente e righe", () => {
  const o = fromWooOrder({
    id: 1042,
    number: "1042",
    status: "processing",
    total: "59.80",
    currency: "EUR",
    date_created: "2026-10-01T10:00:00",
    billing: { first_name: "Ada", last_name: "Lovelace", email: "ada@example.com" },
    line_items: [
      { name: "T-Shirt", quantity: 2, total: "39.80" },
      { name: "Cappello", quantity: 1, total: "20.00" },
    ],
  });
  assert.equal(o.number, "#1042");
  assert.equal(o.total.amount, "59.80");
  assert.equal(o.customerName, "Ada Lovelace");
  assert.equal(o.customerEmail, "ada@example.com");
  assert.equal(o.lines.length, 2);
  assert.equal(o.lines[0].quantity, 2);

  const text = formatOrder(o);
  assert.match(text, /#1042 — processing/);
  assert.match(text, /59.80 EUR/);
  assert.match(text, /2× T-Shirt/);
  assert.match(text, /ada@example.com/);
});

await test("ordine senza cliente non stampa una riga vuota", () => {
  const o = fromWooOrder({ id: 1, status: "completed", total: "10.00" });
  assert.equal(o.customerName, null);
  assert.equal(o.customerEmail, null);
  assert.ok(!/Cliente:/.test(formatOrder(o)), "non deve comparire 'Cliente:' vuoto");
});

await test("formattazione prodotto non espone dettagli inutili", () => {
  const p = fromWooProduct({ id: 9, name: "Prodotto", price: "5.00", stock_status: "instock" });
  const t = formatProduct(p);
  assert.match(t, /^- Prodotto — 5.00 EUR/);
  assert.match(t, /id: 9/);
});

console.log("\nTool · sola lettura, niente scritture sensibili");

await test("i 5 tool Woo sono registrati", () => {
  const src = fs.readFileSync(
    path.join(ROOT, "src/lib/agents/integration-tools.ts"),
    "utf8",
  );
  for (const n of [
    "woo_list_products",
    "woo_get_product",
    "woo_list_orders",
    "woo_get_order",
    "woo_get_customer",
  ]) {
    assert.ok(src.includes(`"${n}"`), `tool mancante: ${n}`);
  }
  const names = [...new Set([...src.matchAll(/"(woo_[a-z_]+)"/g)].map((m) => m[1]))];
  const writes = names.filter((n) => /update|create|delete|set|change/i.test(n));
  assert.deepEqual(writes, [], `scritture non previste: ${writes.join(", ")}`);
  // Le due azioni più sensibili devono restare fuori.
  assert.ok(!names.includes("woo_update_stock"));
  assert.ok(!names.includes("woo_update_order_status"));
});

console.log("\nUI · campi raccolti con un form GET");

await test("la card usa un form GET quando il provider ha campi", () => {
  const src = fs.readFileSync(path.join(ROOT, "src/components/IntegrationSteps.tsx"), "utf8");
  assert.ok(src.includes("tenantFields"), "manca il prop tenantFields");
  assert.ok(src.includes('<form action={onConnectHref} method="get"'), "manca il form GET");
  assert.ok(src.includes("{tenantFields.map("), "i campi non sono renderizzati");
  // Nessuno stato client: il form non deve dipendere da useState per i campi.
  assert.ok(src.includes("required"), "i campi devono essere required");
});

await test("catalog, griglia e card mappano woocommerce", () => {
  for (const f of [
    "src/lib/integrations.ts",
    "src/components/IntegrationsGrid.tsx",
    "src/components/InlineConnectCard.tsx",
    "src/components/AgentIntegrationsCard.tsx",
    "src/app/agents/[slug]/deploy/deploy-client.tsx",
    "src/lib/agents/tools.ts",
    "src/lib/integrations/guides.ts",
  ]) {
    const src = fs.readFileSync(path.join(ROOT, f), "utf8");
    assert.ok(src.includes("woocommerce"), `${f} non menziona woocommerce`);
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);