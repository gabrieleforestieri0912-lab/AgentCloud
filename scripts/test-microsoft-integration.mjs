/**
 * Test del connettore Microsoft 365 (Fase 3).
 *
 * Microsoft usa Entra ID con PKCE obbligatorio e permessi delegati. Qui si
 * verifica la parte di auth che la compilazione non controlla: che il
 * code_verifier non finisca mai nella URL, che il tenant sia validato prima di
 * entrare nell'URL di autorizzazione, che gli scope restino minimi (SharePoint
 * solo su opt-in) e che al refresh `offline_access` sia richiesto — senza quello
 * Microsoft non emette un nuovo refresh token e la connessione muore al rinnovo
 * successivo.
 *
 * Eseguire: npm run test:microsoft
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

/** Isola l'env Microsoft fra un test e l'altro. */
function resetEnv() {
  for (const k of ["MS_CLIENT_ID", "MS_CLIENT_SECRET", "MS_TENANT_ID", "MS_REDIRECT_URI", "MS_SCOPES", "MS_SHAREPOINT"]) {
    delete process.env[k];
  }
}

console.log("\nCatalogo · Microsoft");

await test("provider presente, PKCE, scope delegati minimi", () => {
  const m = getCatalogEntry("microsoft");
  assert.ok(m);
  assert.equal(m.label, "Microsoft 365");
  assert.equal(m.brand, "microsoft");
  assert.equal(m.authType, "oauth2_pkce", "Microsoft deve dichiarare PKCE");
  assert.equal(m.hasApiProxy, true);
  // Sites.ReadWrite.All NON deve stare nel default: è un opt-in (MS_SHAREPOINT).
  assert.deepEqual(
    [...m.scopes],
    ["offline_access", "User.Read", "Files.ReadWrite", "Notes.ReadWrite"],
    "gli scope di default devono restare minimi",
  );
});

await test("è fra i provider implementati", () => {
  assert.equal(isImplementedProvider("microsoft"), true);
});

console.log("\nAuth · PKCE e validazione del tenant");

await test("getAuthUrl manda code_challenge, non il verifier, su tenant common", async () => {
  resetEnv();
  process.env.MS_CLIENT_ID = "test-client-id";
  const { microsoftProvider } = await import("../src/lib/integrations/providers/microsoft.ts");
  const { codeVerifier, codeChallenge } = createPkcePair();

  const url = microsoftProvider.getAuthUrl({
    state: "st",
    redirectUri: "https://example.com/api/integrations/microsoft/callback",
    pkce: { codeChallenge },
  });

  assert.ok(
    url.startsWith("https://login.microsoftonline.com/common/oauth2/v2.0/authorize?"),
    `host inatteso: ${url}`,
  );
  const parsed = new URL(url);
  assert.equal(parsed.searchParams.get("code_challenge"), codeChallenge);
  assert.equal(parsed.searchParams.get("code_challenge_method"), "S256");
  assert.equal(parsed.searchParams.get("state"), "st");
  assert.equal(parsed.searchParams.get("response_type"), "code");
  assert.equal(parsed.searchParams.get("client_id"), "test-client-id");
  const scope = parsed.searchParams.get("scope") ?? "";
  for (const s of ["offline_access", "User.Read", "Files.ReadWrite", "Notes.ReadWrite"]) {
    assert.ok(scope.includes(s), `scope mancante: ${s}`);
  }
  assert.equal(scope.includes("Sites.ReadWrite.All"), false, "SharePoint non deve essere nel default");
  // Il punto di sicurezza: il verifier non deve comparire nella URL.
  assert.equal(url.includes(codeVerifier), false, "il code_verifier è leaked nella URL");
  assert.equal(parsed.searchParams.get("code_verifier"), null);
});

await test("MS_SHAREPOINT=1 aggiunge Sites.ReadWrite.All", async () => {
  resetEnv();
  process.env.MS_CLIENT_ID = "id";
  process.env.MS_SHAREPOINT = "1";
  const { microsoftProvider } = await import("../src/lib/integrations/providers/microsoft.ts");
  const { codeChallenge } = createPkcePair();
  const url = microsoftProvider.getAuthUrl({
    state: "st",
    redirectUri: "https://example.com/x",
    pkce: { codeChallenge },
  });
  assert.ok(new URL(url).searchParams.get("scope").includes("Sites.ReadWrite.All"));
  resetEnv();
});

await test("MS_TENANT_ID non valido viene rifiutato prima di costruire la URL", async () => {
  resetEnv();
  process.env.MS_CLIENT_ID = "id";
  process.env.MS_TENANT_ID = "ev!l/../evil";
  const { microsoftProvider } = await import("../src/lib/integrations/providers/microsoft.ts");
  const { codeChallenge } = createPkcePair();
  assert.throws(
    () =>
      microsoftProvider.getAuthUrl({
        state: "st",
        redirectUri: "https://example.com/x",
        pkce: { codeChallenge },
      }),
    /MS_TENANT_ID/,
  );
  resetEnv();
});

await test("senza PKCE l'adapter fallisce invece di mandare una URL senza challenge", async () => {
  resetEnv();
  process.env.MS_CLIENT_ID = "id";
  const { microsoftProvider } = await import("../src/lib/integrations/providers/microsoft.ts");
  assert.throws(
    () =>
      microsoftProvider.getAuthUrl({
        state: "st",
        redirectUri: "https://example.com/x",
      }),
    /PKCE/i,
  );
});

await test("senza client_id l'adapter dice cosa manca", async () => {
  resetEnv();
  const { microsoftProvider } = await import("../src/lib/integrations/providers/microsoft.ts");
  const { codeChallenge } = createPkcePair();
  assert.throws(
    () =>
      microsoftProvider.getAuthUrl({
        state: "st",
        redirectUri: "https://example.com/x",
        pkce: { codeChallenge },
      }),
    /MS_CLIENT_ID/,
  );
});

console.log("\nScambio · code_verifier e scadenza");

await test("exchangeCode richiede il code_verifier", async () => {
  resetEnv();
  process.env.MS_CLIENT_ID = "id";
  process.env.MS_CLIENT_SECRET = "secret";
  const { microsoftProvider } = await import("../src/lib/integrations/providers/microsoft.ts");
  await assert.rejects(
    () =>
      microsoftProvider.exchangeCode({
        code: "abc",
        redirectUri: "https://example.com/x",
      }),
    /code_verifier mancante/i,
  );
});

await test("exchangeCode manda code_verifier, mai code_challenge, e salva ~1h", async () => {
  resetEnv();
  process.env.MS_CLIENT_ID = "id";
  process.env.MS_CLIENT_SECRET = "secret";
  const { microsoftProvider } = await import("../src/lib/integrations/providers/microsoft.ts");

  const realFetch = globalThis.fetch;
  let sentBody = null;
  globalThis.fetch = async (url, init) => {
    if (String(url).includes("/oauth2/v2.0/token")) {
      sentBody = new URLSearchParams(init.body);
      return new Response(
        JSON.stringify({
          access_token: "at",
          refresh_token: "rt",
          expires_in: 3600,
          scope: "offline_access User.Read Files.ReadWrite Notes.ReadWrite",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    // /me (whoami): identità dell'account.
    return new Response(
      JSON.stringify({ id: "u1", mail: "user@example.com", displayName: "User" }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };

  const before = Date.now();
  let result;
  try {
    result = await microsoftProvider.exchangeCode({
      code: "the-code",
      redirectUri: "https://example.com/x",
      codeVerifier: "the-verifier",
    });
  } finally {
    globalThis.fetch = realFetch;
  }

  assert.ok(sentBody, "nessuna chiamata al token endpoint intercettata");
  assert.equal(sentBody.get("grant_type"), "authorization_code");
  assert.equal(sentBody.get("code_verifier"), "the-verifier");
  assert.equal(sentBody.get("code"), "the-code");
  assert.equal(sentBody.get("code_challenge"), null, "lo scambio usa il verifier, non la challenge");

  assert.equal(result.accessToken, "at");
  assert.equal(result.refreshToken, "rt");
  assert.equal(result.externalAccountId, "user@example.com");
  const exp = new Date(result.expiresAt).getTime();
  assert.ok(exp - before > 3_500_000 && exp - before < 3_700_000, `scadenza inattesa: ${result.expiresAt}`);
  // `raw` non deve contenere credenziali in chiaro.
  assert.equal(result.raw.access_token, undefined);
  assert.equal(result.raw.refresh_token, undefined);
});

console.log("\nRefresh · offline_access e conservazione del token");

await test("refreshToken chiede offline_access e conserva il refresh vecchio se manca il nuovo", async () => {
  resetEnv();
  process.env.MS_CLIENT_ID = "id";
  process.env.MS_CLIENT_SECRET = "secret";
  const { microsoftProvider } = await import("../src/lib/integrations/providers/microsoft.ts");

  const realFetch = globalThis.fetch;
  let sentBody = null;
  globalThis.fetch = async (url, init) => {
    sentBody = new URLSearchParams(init.body);
    // Nessun refresh_token nella risposta: è il caso che rompe il rinnovo dopo.
    return new Response(
      JSON.stringify({ access_token: "new-at", expires_in: 3600 }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };
  let result;
  try {
    result = await microsoftProvider.refreshToken({ refreshToken: "old-rt" });
  } finally {
    globalThis.fetch = realFetch;
  }

  assert.equal(sentBody.get("grant_type"), "refresh_token");
  assert.equal(sentBody.get("refresh_token"), "old-rt");
  assert.ok(
    (sentBody.get("scope") ?? "").includes("offline_access"),
    "senza offline_access Microsoft non emette un nuovo refresh token",
  );
  assert.equal(result.accessToken, "new-at");
  assert.equal(result.refreshToken, "old-rt", "il refresh precedente va conservato, non azzerato");
});

await test("refreshToken adotta il nuovo refresh token quando c'è", async () => {
  resetEnv();
  process.env.MS_CLIENT_ID = "id";
  process.env.MS_CLIENT_SECRET = "secret";
  const { microsoftProvider } = await import("../src/lib/integrations/providers/microsoft.ts");

  const realFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({ access_token: "at2", refresh_token: "rt2", expires_in: 3600 }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  let result;
  try {
    result = await microsoftProvider.refreshToken({ refreshToken: "old-rt" });
  } finally {
    globalThis.fetch = realFetch;
  }
  assert.equal(result.refreshToken, "rt2");
});

console.log("\nSicurezza · nessun segreto hardcoded");

await test("nessun client secret hardcoded nel sorgente", () => {
  const files = ["src/lib/integrations/providers/microsoft.ts"];
  for (const f of files) {
    const src = fs.readFileSync(path.join(ROOT, f), "utf8");
    assert.equal(/MS_CLIENT_SECRET\s*=\s*["'][^"']{8,}/.test(src), false, `${f} contiene un segreto`);
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
