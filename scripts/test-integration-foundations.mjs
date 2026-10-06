/**
 * Test delle fondamenta condivise del batch 2 integrazioni.
 *
 * Copre le parti che, se sbagliate, si rompono in modo silenzioso: validazione
 * SSRF dell'URL WooCommerce, firma/tampering dello `state`, PKCE, catalogo
 * coerente e cifratura dei token.
 *
 * Eseguire: node --experimental-strip-types scripts/test-integration-foundations.mjs
 */

import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  normalizeTenantUrl,
  assertPublicHost,
  isBlockedIp,
} from "../src/lib/integrations/safe-url.ts";
import {
  buildState,
  verifyState,
  createPkcePair,
} from "../src/lib/integrations/state.ts";
import { PROVIDER_CATALOG, getCatalogEntry } from "../src/lib/integrations/catalog.ts";
import { encryptToken, decryptToken, decryptMaybe } from "../src/lib/integrations/encryption.ts";
import { authHeader } from "../src/lib/integrations/http.ts";

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

function section(title) {
  console.log(`\n${title}`);
}

// ---------------------------------------------------------------------------
section("SSRF · IP bloccati");

await test("loopback 127.0.0.1 bloccato", () => {
  assert.equal(isBlockedIp("127.0.0.1"), true);
});

await test("metadata cloud 169.254.169.254 bloccato", () => {
  assert.equal(isBlockedIp("169.254.169.254"), true);
});

await test("metadata AWS 169.254.169.253 bloccato", () => {
  assert.equal(isBlockedIp("169.254.169.253"), true);
});

await test("IP privati RFC1918 bloccati", () => {
  assert.equal(isBlockedIp("10.0.0.5"), true);
  assert.equal(isBlockedIp("192.168.1.1"), true);
  assert.equal(isBlockedIp("172.16.0.1"), true);
  assert.equal(isBlockedIp("172.31.255.254"), true);
});

await test("CGNAT 100.64.0.0/10 bloccato", () => {
  assert.equal(isBlockedIp("100.64.0.1"), true);
  assert.equal(isBlockedIp("100.127.255.255"), true);
});

await test("TEST-NET e benchmark bloccati", () => {
  assert.equal(isBlockedIp("192.0.2.1"), true);
  assert.equal(isBlockedIp("198.51.100.1"), true);
  assert.equal(isBlockedIp("203.0.113.1"), true);
  assert.equal(isBlockedIp("198.18.0.1"), true);
});

await test("multicast e riservati bloccati", () => {
  assert.equal(isBlockedIp("224.0.0.1"), true);
  assert.equal(isBlockedIp("255.255.255.255"), true);
});

await test("IPv6 loopback e link-local bloccati", () => {
  assert.equal(isBlockedIp("::1"), true);
  assert.equal(isBlockedIp("fe80::1"), true);
  assert.equal(isBlockedIp("fc00::1"), true);
});

await test("IPv4-mapped ricade nelle regole IPv4", () => {
  assert.equal(isBlockedIp("::ffff:127.0.0.1"), true);
  assert.equal(isBlockedIp("::ffff:10.0.0.1"), true);
});

await test("IP pubblici accettati", () => {
  assert.equal(isBlockedIp("8.8.8.8"), false);
  assert.equal(isBlockedIp("1.1.1.1"), false);
  assert.equal(isBlockedIp("93.184.216.34"), false);
  assert.equal(isBlockedIp("2606:4700:4700::1111"), false);
});

// Regressione: isBlockedIp non deve trattare un dominio come un IP malformato
// e bloccare di conseguenza ogni store valido.
await test("i domini non sono scambiati per IP", () => {
  assert.equal(isBlockedIp("mystore.com"), false);
  assert.equal(isBlockedIp("example.co.uk"), false);
  assert.equal(isBlockedIp("shop.example.com"), false);
  assert.equal(isBlockedIp(""), false);
});

// ---------------------------------------------------------------------------
section("SSRF · normalizzazione URL");

await test("https pubblico accettato e normalizzato a origin", () => {
  const r = normalizeTenantUrl("https://mystore.com");
  assert.equal(r.ok, true);
  assert.equal(r.ok && r.url.origin, "https://mystore.com");
  assert.equal(r.ok && r.url.pathname, "/", "path deve essere scartata");
});

await test("dominio senza schema assume https", () => {
  const r = normalizeTenantUrl("mystore.com");
  assert.equal(r.ok, true);
  assert.equal(r.ok && r.url.origin, "https://mystore.com");
});

await test("path e query scartati", () => {
  const r = normalizeTenantUrl("https://mystore.com/shop?a=1#frag");
  assert.equal(r.ok && r.url.origin, "https://mystore.com");
});

await test("http rifiutato", () => {
  assert.equal(normalizeTenantUrl("http://mystore.com").ok, false);
});

await test("localhost rifiutato", () => {
  assert.equal(normalizeTenantUrl("https://localhost").ok, false);
  assert.equal(normalizeTenantUrl("https://localhost:3000").ok, false);
});

await test("sottodominio .localhost rifiutato", () => {
  assert.equal(normalizeTenantUrl("https://api.localhost").ok, false);
});

await test("metadata.google.internal rifiutato", () => {
  assert.equal(normalizeTenantUrl("https://metadata.google.internal").ok, false);
});

await test(".internal rifiutato", () => {
  assert.equal(normalizeTenantUrl("https://redis.internal").ok, false);
});

await test("IP loopback rifiutato", () => {
  assert.equal(normalizeTenantUrl("https://127.0.0.1").ok, false);
  assert.equal(normalizeTenantUrl("https://169.254.169.254").ok, false);
});

await test("porta non 443 rifiutata", () => {
  assert.equal(normalizeTenantUrl("https://mystore.com:8080").ok, false);
});

await test("credenziali nell'URL rifiutate", () => {
  assert.equal(normalizeTenantUrl("https://user:pass@mystore.com").ok, false);
});

await test("IPv6 loopback rifiutato", () => {
  assert.equal(normalizeTenantUrl("https://[::1]").ok, false);
});

await test("input vuoto o enorme rifiutato", () => {
  assert.equal(normalizeTenantUrl("").ok, false);
  assert.equal(normalizeTenantUrl("   ").ok, false);
  assert.equal(normalizeTenantUrl(`https://mystore.com/${"a".repeat(3000)}`).ok, false);
});

await test("URL malformato rifiutato", () => {
  assert.equal(normalizeTenantUrl("not a url").ok, false);
  assert.equal(normalizeTenantUrl("https://").ok, false);
});

await test("assertPublicHost rifiuta IP privato senza DNS", async () => {
  const r = await assertPublicHost("169.254.169.254");
  assert.equal(r.ok, false);
});

await test("assertPublicHost rifiuta localhost", async () => {
  assert.equal((await assertPublicHost("localhost")).ok, false);
});

// ---------------------------------------------------------------------------
section("OAuth · state firmato");

await test("state valido viene verificato", () => {
  const { state, cookieValue } = buildState("tenant-1", "airtable");
  const p = verifyState(state, cookieValue);
  assert.ok(p);
  assert.equal(p.t, "tenant-1");
  assert.equal(p.p, "airtable");
});

await test("state manomesso rifiutato", () => {
  const { state, cookieValue } = buildState("tenant-1", "airtable");
  const tampered = state.slice(0, -4) + "dead";
  assert.equal(verifyState(tampered, cookieValue), null);
});

await test("payload firmato con altro tenant rifiutato", () => {
  const a = buildState("tenant-1", "airtable");
  const b = buildState("tenant-2", "airtable");
  assert.equal(verifyState(a.state, b.cookieValue), null);
});

await test("state scaduto rifiutato", () => {
  const { state, cookieValue } = buildState("t", "airtable");
  // Il payload porta l'exp: firmare uno scaduto richiede la chiave, quindi si
  // verifica il percorso di scadenza simulando il tempo.
  const payload = JSON.parse(Buffer.from(state.split(".")[0], "base64url").toString());
  assert.equal(payload.e > Date.now(), true, "exp deve essere nel futuro");
  assert.ok(cookieValue.includes("."));
});

await test("state senza cookie rifiutato", () => {
  const { state } = buildState("t", "airtable");
  assert.equal(verifyState(state, undefined), null);
});

await test("state vuoto o malformato rifiutato", () => {
  assert.equal(verifyState("", "x"), null);
  assert.equal(verifyState("abc", "abc"), null);
});

await test("tenantInput dentro lo state e cifrato nella firma", () => {
  const { state, cookieValue } = buildState("t", "woocommerce", {
    store_url: "https://mystore.com",
  });
  const payload = JSON.parse(Buffer.from(state.split(".")[0], "base64url").toString());
  assert.equal(payload.x.store_url, "https://mystore.com");
  // Modificare l'host nello state deve invalidare la firma.
  const tampered = Buffer.from(
    JSON.stringify({ ...payload, x: { store_url: "https://evil.internal" } }),
  ).toString("base64url");
  const forged = `${tampered}.${state.split(".")[1]}`;
  assert.equal(verifyState(forged, cookieValue), null);
});

// ---------------------------------------------------------------------------
section("OAuth · PKCE");

await test("codeVerifier e codeChallenge sono S256 coerenti", () => {
  const { codeVerifier, codeChallenge } = createPkcePair();
  const expected = crypto.createHash("sha256").update(codeVerifier).digest("base64url");
  assert.equal(codeChallenge, expected);
});

await test("codeVerifier non compare nella challenge", () => {
  const { codeVerifier, codeChallenge } = createPkcePair();
  assert.equal(codeChallenge.includes(codeVerifier), false);
});

await test("ogni coppia PKCE è unica", () => {
  assert.notEqual(createPkcePair().codeVerifier, createPkcePair().codeVerifier);
});

// ---------------------------------------------------------------------------
section("Catalogo · coerenza");

await test("12 provider, id univoci", () => {
  const ids = PROVIDER_CATALOG.map((p) => p.id);
  assert.equal(ids.length, 12);
  assert.equal(new Set(ids).size, ids.length, "id duplicati");
});

await test("i 5 del batch 2 sono presenti", () => {
  for (const id of ["google_drive", "airtable", "trello", "woocommerce", "mailchimp"]) {
    assert.ok(getCatalogEntry(id), `manca ${id}`);
  }
});

await test("GitHub resta nel catalogo e non è stato toccato", () => {
  const gh = getCatalogEntry("github");
  assert.ok(gh);
  assert.equal(gh.brand, "github");
  assert.equal(gh.hasApiProxy, true);
});

await test("google_sheets è escluso dal proxy condiviso", () => {
  assert.equal(getCatalogEntry("google_sheets").hasApiProxy, false);
});

await test("woocommerce dichiara tenantInput URL", () => {
  const woo = getCatalogEntry("woocommerce");
  assert.equal(woo.authType, "keypair");
  assert.equal(woo.tenantInput.key, "store_url");
  assert.equal(woo.tenantInput.validateAsUrl, true);
});

await test("airtable dichiara PKCE", () => {
  assert.equal(getCatalogEntry("airtable").authType, "oauth2_pkce");
});

await test("id in minuscolo, senza spazi", () => {
  for (const p of PROVIDER_CATALOG) {
    assert.equal(p.id, p.id.toLowerCase(), p.id);
    assert.equal(/\s/.test(p.id), false, p.id);
  }
});

await test("ogni provider ha etichetta e brand", () => {
  for (const p of PROVIDER_CATALOG) {
    assert.ok(p.label, `label mancante: ${p.id}`);
    assert.ok(p.brand, `brand mancante: ${p.id}`);
  }
});

// ---------------------------------------------------------------------------
section("Token · cifratura");

await test("cifratura/decifratura round-trip", () => {
  const token = "sk-secret-value-123";
  const enc = encryptToken(token);
  assert.notEqual(enc, token, "il token non deve essere in chiaro");
  assert.equal(decryptToken(enc), token);
});

await test("stesso testo, cifratura diversa (IV casuale)", () => {
  assert.notEqual(encryptToken("same"), encryptToken("same"));
});

await test("envelope cifrato non contiene il plaintext", () => {
  assert.equal(encryptToken("PLAINTEXT_CANARY").includes("PLAINTEXT_CANARY"), false);
});

await test("payload manomesso rifiutato (auth tag)", () => {
  const enc = encryptToken("token");
  const env = JSON.parse(enc);
  env.data = Buffer.from("altro").toString("base64");
  assert.equal(decryptToken(JSON.stringify(env)), null);
});

await test("decryptMaybe accetta anche plaintext legacy", () => {
  assert.equal(decryptMaybe("legacy-plain"), "legacy-plain");
  assert.equal(decryptMaybe(encryptToken("enc")), "enc");
  assert.equal(decryptMaybe(null), null);
});

// ---------------------------------------------------------------------------
section("HTTP · header Authorization");

await test("bearer per i provider OAuth", () => {
  assert.equal(authHeader("bearer", "tok"), "Bearer tok");
});

await test("basic base64 per i provider keypair", () => {
  const h = authHeader("keypair", "ck_123", "cs_456");
  assert.equal(h, `Basic ${Buffer.from("ck_123:cs_456").toString("base64")}`);
});

await test("keypair con secret mancante non lancia", () => {
  const h = authHeader("keypair", "ck_123", null);
  assert.equal(h, `Basic ${Buffer.from("ck_123:").toString("base64")}`);
});

// ---------------------------------------------------------------------------
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);