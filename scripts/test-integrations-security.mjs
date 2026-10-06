/**
 * Test di sicurezza delle integrazioni (Fase 5).
 *
 * Copre gli invarianti che, se rompono, portano a una perdita di credenziali o a
 * un accesso cross-tenant. Sono cose che la compilazione non controlla e che
 * un test funzionale normale non tocca: qui si guarda il sorgente.
 *
 * Eseguire: npm run test:security
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const exists = (p) => fs.existsSync(path.join(ROOT, p));

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

const BATCH_PROVIDERS = [
  "googleDrive",
  "airtable",
  "trello",
  "woocommerce",
  "mailchimp",
];

console.log("\nToken · non persistiti oltre le colonne cifrate");

await test("nessun token viene scritto in chiaro in una colonna libera", () => {
  // Le uniche colonne che devono contenere materiale sensibile sono access_token
  // e refresh_token, e solo cifrati. `metadata`, `scope` ed `external_account_id`
  // finiscono in chiari e sono leggibili dal client.
  const src = read("src/lib/integrations/store.ts");
  assert.ok(
    src.includes("encryptToken(opts.tokens.accessToken)"),
    "access_token deve essere cifrato prima di scriverlo",
  );
  assert.ok(
    src.includes("encryptToken(opts.tokens.refreshToken)"),
    "refresh_token deve essere cifrato prima di scriverlo",
  );
  // metadata prende solo `tokens.metadata`, mai l'intero oggetto token.
  assert.ok(
    src.includes("metadata: opts.tokens.metadata"),
    "metadata deve prendere solo il campo metadata",
  );
  assert.ok(
    !/metadata:\s*opts\.tokens\s*[,}]/.test(src),
    "metadata sta prendendo l'intero oggetto token: finirebbe in chiaro",
  );
  // `raw` non deve essere persistito: contiene la risposta grezza del provider.
  assert.ok(!/raw/.test(src), "raw non deve essere persistito in tabella");
});

await test("gli adapter del batch non tengono il token in raw", () => {
  for (const p of BATCH_PROVIDERS) {
    const src = read(`src/lib/integrations/providers/${p}.ts`);
    // `raw: json` lascerebbe access_token e refresh_token in chiaro in memoria.
    // Non è una fuga oggi (raw non viene persistito), ma è un'arma carica: basta
    // un JSON.stringify in un log futuro per bruciare la connessione.
    const rawPlain = /raw:\s*json\s*[,}]/.test(src);
    assert.ok(
      !rawPlain,
      `${p}.ts fa raw: json — token in chiaro in memoria`,
    );
  }
});

await test("la cifratura usa AES-256-GCM con IV casuale", () => {
  const src = read("src/lib/integrations/encryption.ts");
  assert.ok(src.includes("aes-256-gcm"), "l'algoritmo deve essere aes-256-gcm");
  assert.ok(src.includes("randomBytes(12)"), "l'IV deve essere casuale (12 byte)");
  assert.ok(src.includes("getAuthTag"), "serve l'auth tag per l'integrità");
  // Una chiave di sviluppo hardcoded in produzione renderebbe inutile tutto.
  assert.ok(
    src.includes("NODE_ENV === \"production\""),
    "manca l'avviso per chiave mancante in produzione",
  );
});

await test("la decifratura non solleva mai", () => {
  const src = read("src/lib/integrations/encryption.ts");
  const fn = src.slice(src.indexOf("export function decryptToken"));
  const body = fn.slice(0, fn.indexOf("\n}"));
  assert.ok(
    body.includes("catch"),
    "un errore di decifratura deve diventare null, mai un'eccezione",
  );
});

console.log("\nToken · non finiscono in risposta al client");

await test("le route OAuth non restituiscono token", () => {
  for (const f of [
    "src/app/api/integrations/[provider]/authorize/route.ts",
    "src/app/api/integrations/[provider]/callback/route.ts",
    "src/app/api/integrations/[provider]/disconnect/route.ts",
  ]) {
    const src = read(f);
    // Le route OAuth rispondono con redirect o {ok:true}: mai con il token.
    const json = [...src.matchAll(/NextResponse\.json\(\{([^}]*)\}/g)]
      .map((m) => m[1])
      .join(" ");
    for (const key of ["accessToken", "access_token", "refreshToken", "refresh_token"]) {
      assert.ok(
        !new RegExp(`${key}\\s*:`).test(json),
        `${f} restituisce ${key} al client`,
      );
    }
  }
});

await test("nessun console.log stampa un token", () => {
  for (const dir of ["src/lib/integrations", "src/lib/agents"]) {
    for (const file of walk(path.join(ROOT, dir))) {
      if (!/\.(ts|tsx)$/.test(file)) continue;
      const src = fs.readFileSync(file, "utf8");
      const logs = [...src.matchAll(/console\.(log|error|warn|info|debug)\(([^;]*)\)/g)];
      for (const [, kind, args] of logs) {
        if (/accessToken|refreshToken|consumer_secret|consumer_key|api_key/i.test(args)) {
          const rel = path.relative(ROOT, file);
          assert.ok(false, `${rel}: console.${kind} stampa una credenziale`);
        }
      }
    }
  }
});

console.log("\nSSRF · l'URL dello store");

await test("il proxy WooCommerce valida l'host prima di ogni fetch", () => {
  const src = read("src/lib/integrations/api-proxy.ts");
  const start = src.indexOf("async function wooStoreBase");
  assert.ok(start > -1, "wooStoreBase non trovata");
  const fn = src.slice(start, src.indexOf("\n}", start));
  assert.ok(fn.includes("normalizeTenantUrl"), "manca la validazione sintattica");
  assert.ok(fn.includes("assertPublicHost"), "manca il controllo del DNS");

  // L'ordine conta: il controllo deve precedere la prima chiamata di rete.
  const api = src.slice(src.indexOf("export async function wooApiProxy"));
  const check = api.indexOf("await wooStoreBase(token)");
  const fetch = api.indexOf("providerRequest(");
  assert.ok(check > -1 && check < fetch, "il controllo SSRF non precede il fetch");
});

await test("nessun altro proxy chiama un host fornito dall'utente", () => {
  // Gli altri provider hanno host fissi scritti nel codice. Solo WooCommerce
  // prende l'host da input esterno: se in futuro ne arrivasse un altro, deve
  // passare da assertPublicHost.
  const src = read("src/lib/integrations/api-proxy.ts");
  const hostVars = [...src.matchAll(/fetch\(\s*`?\$\{?\s*(base|storeUrl|host)\b/g)];
  assert.equal(
    hostVars.length,
    0,
    `trovati ${hostVars.length} fetch verso host variabile senza passare da wooStoreBase`,
  );
});

console.log("\nTenant · nessun accesso cross-tenant");

await test("ogni lettura dei token filtra per tenant_id", () => {
  const src = read("src/lib/integrations/api-proxy.ts");
  const queries = [...src.matchAll(/\.from\("tenant_integrations"\)([\s\S]{0,400}?)\.maybeSingle\(\)/g)];
  assert.ok(queries.length > 0, "nessuna query su tenant_integrations trovata");
  for (const [, q] of queries) {
    assert.ok(q.includes(".eq(\"tenant_id\""), "query senza filtro tenant_id");
    assert.ok(q.includes(".eq(\"provider\""), "query senza filtro provider");
  }
});

await test("nessun percorso legge i token senza tenant", () => {
  const src = read("src/lib/integrations/api-proxy.ts");
  const start = src.indexOf("export async function resolveIntegrationToken");
  const fn = src.slice(start, src.indexOf("\n}", src.indexOf("return {", start)));
  assert.ok(
    fn.includes("if (!tenantId) return none()"),
    "resolveIntegrationToken deve rifiutare un tenant vuoto",
  );
});

await test("il disconnect è protetto da sessione e filtrato per tenant", () => {
  const src = read("src/app/api/integrations/[provider]/disconnect/route.ts");
  assert.ok(src.includes("getSessionUser"), "manca il controllo di sessione");
  assert.ok(
    src.includes(".eq(\"tenant_id\""),
    "la DELETE deve essere filtrata per tenant_id",
  );
});

await test("le route OAuth richiedono la sessione", () => {
  for (const f of [
    "src/app/api/integrations/[provider]/authorize/route.ts",
    "src/app/api/integrations/[provider]/callback/route.ts",
  ]) {
    assert.ok(read(f).includes("getSessionUser"), `${f} non verifica la sessione`);
  }
});

console.log("\nOAuth · state e PKCE");

await test("lo state è firmato e legato a tenant e provider", () => {
  const src = read("src/lib/integrations/state.ts");
  assert.ok(src.includes("createHmac"), "lo state deve essere firmato");
  assert.ok(src.includes("timingSafeEqual"), "il confronto deve essere a tempo costante");
  // I legami che il callback verifica.
  const cb = read("src/app/api/integrations/[provider]/callback/route.ts");
  assert.ok(cb.includes("payload.p !== provider"), "manca il legame al provider");
  assert.ok(cb.includes("payload.t !== tenantId"), "manca il legame al tenant");
});

await test("il tenantInput viaggia dentro lo state firmato", () => {
  // Se il dato dell'utente (URL dello store) arrivasse da un parametro riappreso,
  // un attaccante potrebbe cambiarlo e il server chiamerebbe un host suo.
  const src = read("src/lib/integrations/state.ts");
  assert.ok(src.includes("x?: Record<string, string>"), "lo state non porta tenantInput");
  const auth = read("src/app/api/integrations/[provider]/authorize/route.ts");
  assert.ok(auth.includes("buildState(tenantId, provider, tenantInput.value)"));
  const cb = read("src/app/api/integrations/[provider]/callback/route.ts");
  assert.ok(cb.includes("tenantInput: payload.x"), "il callback non usa il dato firmato");
});

await test("il code_verifier del PKCE non transita dalla URL", () => {
  const src = read("src/lib/integrations/state.ts");
  assert.ok(src.includes("INTEGRATIONS_PKCE_COOKIE"), "manca il cookie PKCE");
  const airtable = read("src/lib/integrations/providers/airtable.ts");
  // Nel passo di autorizzazione va solo la challenge...
  assert.ok(airtable.includes("code_challenge: pkce.codeChallenge"));
  assert.ok(!airtable.includes("code_verifier: pkce"), "il verifier non deve finire nella URL");
  // ...e il verifier torna solo dal cookie httpOnly.
  assert.ok(airtable.includes("body.set(\"code_verifier\", codeVerifier)"));
});

console.log("\nSegreti · fuori dal codice");

await test("nessun client secret hardcoded", () => {
  const files = [
    ...walk(path.join(ROOT, "src")),
    ...walk(path.join(ROOT, "scripts")),
  ];
  const SECRET_KEYS =
    /(_CLIENT_SECRET|_API_SECRET|_TOKEN_ENCRYPTION_KEY|_WEBHOOK_SECRET|PAYPAL_CLIENT_SECRET)\s*=\s*["'][^"']{8,}/;
  for (const f of files) {
    if (!/\.(ts|tsx|mjs|js)$/.test(f)) continue;
    const src = fs.readFileSync(f, "utf8");
    if (SECRET_KEYS.test(src)) {
      assert.ok(false, `${path.relative(ROOT, f)} contiene un segreto hardcoded`);
    }
  }
});

await test("le chiavi dei provider arrivano da env", () => {
  const expected = {
    airtable: "AIRTABLE_CLIENT_ID",
    mailchimp: "MAILCHIMP_CLIENT_ID",
    trello: "TRELLO_API_KEY",
  };
  for (const [p, envVar] of Object.entries(expected)) {
    const src = read(`src/lib/integrations/providers/${p}.ts`);
    assert.ok(src.includes(envVar), `${p}.ts deve leggere ${envVar} da env`);
  }
});

await test("i file .env con segreti non sono tracciati", () => {
  const gi = read(".gitignore");
  assert.ok(/\.env/.test(gi), ".env deve essere in .gitignore");
  // E nessun file .env è già committato: il .gitignore non retroagisce.
  // `.env.example` invece è tracciato per scopo (è il template senza valori), e
  // il test sui segreti hardcoded sotto verifica che non contenga chiavi vere.
  const tracked = execSync("git ls-files", { cwd: ROOT, encoding: "utf8" });
  for (const line of tracked.split("\n")) {
    if (!line) continue;
    const isExample = /\.env\.example$/.test(line);
    assert.ok(
      isExample || !/\.env(\.local|\.production)?$/.test(line),
      `${line} è tracciato ma contiene segreti`,
    );
  }
});

await test(".env.example contiene solo placeholder, non valori", () => {
  const p = path.join(ROOT, ".env.example");
  if (!fs.existsSync(p)) return; // il template non è obbligatorio
  const src = fs.readFileSync(p, "utf8");
  // Ogni riga deve avere il valore vuoto: CHIAVE= senza nulla dietro.
  for (const line of src.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    const [, key, value] = m;
    if (!value.trim()) continue;
    assert.ok(
      /^(xxx|your|<|changeme|todo|PLACEHOLDER)/i.test(value.trim()) || value.includes("${"),
      `.env.example: ${key} ha un valore invece di un placeholder`,
    );
  }
});

console.log("\nWooCommerce · coppia di credenziali per tenant");

await test("le chiavi del negozio non sono env ma dati cifrati", () => {
  const src = read("src/lib/integrations/providers/woocommerce.ts");
  assert.ok(
    !/WOOCOMMERCE_CONSUMER_(KEY|SECRET)/.test(src),
    "le chiavi per-store non devono essere env",
  );
  // Vanno nelle colonne cifrate, non in metadata in chiaro.
  assert.ok(src.includes("accessToken: consumerKey"));
  assert.ok(src.includes("refreshToken: consumerSecret"));
  assert.ok(
    !/metadata:[\s\S]{0,200}consumer_secret/i.test(src),
    "la Consumer Secret non deve finire in metadata",
  );
});

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === ".next" || e.name === ".kilo") continue;
      out.push(...walk(p));
    } else out.push(p);
  }
  return out;
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);