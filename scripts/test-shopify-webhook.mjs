/**
 * Test locale dei webhook Shopify (firma HMAC).
 *
 * Uso (funziona identico in PowerShell e cmd):
 *   1. npm run dev                      # terminale 1, aspetta "Ready"
 *   2. node scripts/test-shopify-webhook.mjs [baseUrl]   # terminale 2
 *
 * Legge SHOPIFY_API_SECRET (il nome reale usato dall'app) da .env.local,
 * costruisce un payload fittizio per ciascun topic, calcola la firma
 * HMAC-SHA256 in base64 e verifica:
 *   - firma valida       -> 200
 *   - firma errata        -> 401
 *   - header firma assente -> 401
 *   - topic sconosciuto con firma valida -> 400
 *   - stesso X-Shopify-Webhook-Id inviato due volte -> 200 + duplicate:true
 *
 * NIENTE dati reali nei payload: shop ed email sono inventati.
 */
import { createHmac, randomBytes } from "crypto";
import { readFileSync } from "fs";
import { resolve } from "path";

const BASE = process.argv[2] || "http://localhost:3000";
const COMPLIANCE_URL = `${BASE}/api/webhooks/shopify/compliance`;
const UNINSTALLED_URL = `${BASE}/api/webhooks/shopify/app-uninstalled`;

// --- Legge una variabile da .env.local (niente dipendenze esterne) ---
function loadEnvVar(name) {
  const raw = readFileSync(resolve(".env.local"), "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(new RegExp(`^\\s*${name}\\s*=\\s*(.+?)\\s*$`));
    if (m) return m[1].replace(/^["']|["']$/g, "");
  }
  return undefined;
}

// Dati fittizi: MAI reali.
const FAKE_SHOP = "webhook-test-shop.myshopify.com";
const payloads = {
  "customers/data_request": {
    shop_id: 424242,
    shop_domain: FAKE_SHOP,
    customer: { id: 1, email: "customer@example.invalid", phone: null },
    orders_to_redact: [],
  },
  "customers/redact": {
    shop_id: 424242,
    shop_domain: FAKE_SHOP,
    customer: { id: 1, email: "customer@example.invalid", phone: null },
    orders_to_redact: [1001],
  },
  "shop/redact": {
    shop_id: 424242,
    shop_domain: FAKE_SHOP,
  },
  "app/uninstalled": {
    id: 424242,
    name: "webhook-test-shop",
    email: "owner@example.invalid",
    domain: FAKE_SHOP,
  },
};
function sign(rawBody, secret) {
  return createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
}

async function post(url, { topic, shop, payload, secret, withHmac = true }) {
  const rawBody = JSON.stringify(payload);
  const headers = {
    "Content-Type": "application/json",
    "X-Shopify-Topic": topic,
    "X-Shopify-Shop-Domain": shop,
    "X-Shopify-Webhook-Id": randomBytes(8).toString("hex"),
  };
  if (withHmac) headers["X-Shopify-Hmac-Sha256"] = sign(rawBody, secret);
  const res = await fetch(url, { method: "POST", headers, body: rawBody });
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { status: res.status, body };
}

let failures = 0;
function check(label, actual, expected, extra = "") {
  const ok = actual === expected;
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}: got ${actual}, want ${expected}${extra}`);
}

const secret = loadEnvVar("SHOPIFY_API_SECRET");
if (!secret) {
  console.error("SHOPIFY_API_SECRET non trovato in .env.local");
  process.exit(2);
}

// La verifica di idempotenza richiede la tabella di audit della Fase 2
// (supabase/schema-shopify-compliance.sql applicata). Se manca, il test
// viene saltato: senza tabella non c'è dedup su webhook-id.
async function auditTableExists() {
  const url = loadEnvVar("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = loadEnvVar("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return false;
  try {
    const res = await fetch(`${url}/rest/v1/shopify_compliance_events?select=id&limit=1`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    });
    return res.status !== 404;
  } catch {
    return false;
  }
}
const hasAuditTable = await auditTableExists();

// 1. Firma valida -> 200 (endpoint compliance, 3 topic)
for (const topic of ["customers/data_request", "customers/redact", "shop/redact"]) {
  const r = await post(COMPLIANCE_URL, {
    topic,
    shop: FAKE_SHOP,
    payload: payloads[topic],
    secret,
  });
  check(`compliance ${topic} firma valida`, r.status, 200);
}

// 2. Firma valida -> 200 (endpoint app-uninstalled)
{
  const r = await post(UNINSTALLED_URL, {
    topic: "app/uninstalled",
    shop: FAKE_SHOP,
    payload: payloads["app/uninstalled"],
    secret,
  });
  check("app-uninstalled firma valida", r.status, 200);
}

// 3. Firma errata -> 401
{
  const r = await post(COMPLIANCE_URL, {
    topic: "shop/redact",
    shop: FAKE_SHOP,
    payload: payloads["shop/redact"],
    secret: "firma-sbagliata",
  });
  check("compliance firma errata", r.status, 401);
}

// 4. Header firma mancante -> 401
{
  const r = await post(COMPLIANCE_URL, {
    topic: "shop/redact",
    shop: FAKE_SHOP,
    payload: payloads["shop/redact"],
    secret,
    withHmac: false,
  });
  check("compliance header assente", r.status, 401);
}

// 5. Topic sconosciuto con firma valida -> 400
{
  const r = await post(COMPLIANCE_URL, {
    topic: "bogus/topic",
    shop: FAKE_SHOP,
    payload: { hello: "world" },
    secret,
  });
  check("compliance topic sconosciuto", r.status, 400);
}

// 6. Idempotenza: stesso webhook-id due volte -> 200 + duplicate:true
if (!hasAuditTable) {
  console.log("SKIP  idempotenza stesso webhook-id: tabella shopify_compliance_events non applicata (vedi supabase/schema-shopify-compliance.sql)");
} else {
  const rawBody = JSON.stringify(payloads["customers/data_request"]);
  const fixedId = randomBytes(8).toString("hex");
  const headers = {
    "Content-Type": "application/json",
    "X-Shopify-Topic": "customers/data_request",
    "X-Shopify-Shop-Domain": FAKE_SHOP,
    "X-Shopify-Webhook-Id": fixedId,
    "X-Shopify-Hmac-Sha256": sign(rawBody, secret),
  };
  const opts = { method: "POST", headers, body: rawBody };
  const first = await (await fetch(COMPLIANCE_URL, opts)).json().catch(() => null);
  const secondRes = await fetch(COMPLIANCE_URL, opts);
  const second = await secondRes.json().catch(() => null);
  const ok = secondRes.status === 200 && second?.duplicate === true;
  if (!ok) failures += 1;
  console.log(
    `${ok ? "PASS" : "FAIL"}  idempotenza stesso webhook-id: got ${secondRes.status} duplicate=${second?.duplicate}, want 200 duplicate=true (primo invio: ${JSON.stringify(first)})`,
  );
}

if (failures > 0) {
  console.error(`\n${failures} test falliti.`);
  process.exit(1);
}
console.log("\nTutti i test passati.");
