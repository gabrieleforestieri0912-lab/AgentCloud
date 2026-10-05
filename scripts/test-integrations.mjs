/**
 * Test integrazioni (7 provider generici, escluso Shopify).
 * Crea un account di test, prende la sessione e verifica:
 *  - esistenza tabella tenant_integrations
 *  - /api/integrations/status
 *  - /api/integrations/<p>/authorize -> URL provider (redirect_uri, client_id, scope)
 *  - callback con state mancante / falsificato (prova CSRF)
 *  - disconnect
 */
import { readFileSync } from "fs";

const env = {};
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const SUPA_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
const SITE = "https://www.agentcloud.agency";
const EMAIL = "test.integrations@agentcloud.agency";
const PASSWORD = "TestIntegrations!2026";

let pass = 0, fail = 0;
const ok = (c, m, extra = "") => {
  if (c) { pass++; console.log(`PASS  ${m}${extra ? " :: " + extra : ""}`); }
  else { fail++; console.log(`FAIL  ${m}${extra ? " :: " + extra : ""}`); }
};

// ── 1. tabella tenant_integrations ─────────────────────────────────────────
const tRes = await fetch(`${SUPA_URL}/rest/v1/tenant_integrations?select=provider&limit=1`, {
  headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` },
});
ok(tRes.status !== 404, "tabella tenant_integrations esiste", `HTTP ${tRes.status}`);

// ── 2. account di test ─────────────────────────────────────────────────────
// REST: tabelle (PostgREST) + admin users (GoTrue, path assoluto)
const admin = (p, o = {}) =>
  fetch(p.startsWith("/auth/") ? `${SUPA_URL}${p}` : `${SUPA_URL}/rest/v1${p}`, {
    ...o,
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json", ...(o.headers || {}) },
  });

let userId = null;
const created = await admin("/auth/v1/admin/users", {
  method: "POST",
  body: JSON.stringify({ email: EMAIL, password: PASSWORD, email_confirm: true }),
});
if (created.ok) {
  userId = (await created.json()).id;
  ok(true, "account di test creato", userId);
} else {
  const list = await admin("/auth/v1/admin/users?per_page=200", {});
  const body = await list.json();
  const found = (body?.users || []).find((u) => u.email === EMAIL);
  if (found) {
    userId = found.id;
    await admin(`/auth/v1/admin/users/${userId}`, { method: "PUT", body: JSON.stringify({ password: PASSWORD }) });
    ok(true, "account di test recuperato (reset password)", userId);
  } else {
    ok(false, "creazione account di test", (await created.text()).slice(0, 160));
  }
}

if (!userId) { console.log("\nImpossibile proseguire senza account."); process.exit(1); }

// profilo con auth_method_completed = true
const profProbe = await fetch(`${SUPA_URL}/rest/v1/profiles?select=id&limit=1`, {
  headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` },
});
if (profProbe.status === 404) {
  ok(false, "tabella profiles esiste", "HTTP 404");
} else {
  const prof = await admin("/rest/v1/profiles", { method: "POST", body: JSON.stringify({ id: userId, email: EMAIL, auth_method_completed: true }) });
  if (prof.ok) ok(true, "profilo test creato");
  else {
    const upd = await admin(`/profiles?id=eq.${userId}`, { method: "PATCH", body: JSON.stringify({ auth_method_completed: true }) });
    ok(upd.ok, "profilo test aggiornato", `HTTP ${upd.status} ${(await upd.text()).slice(0, 120)}`);
  }
}

// ── 3. sessione ───────────────────────────────────────────────────────────
const tok = await fetch(`${SUPA_URL}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY, "Content-Type": "application/json" },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
});
const tokJson = await tok.json();
if (!tokJson.access_token) {
  console.log("LOGIN FALLITO:", JSON.stringify(tokJson).slice(0, 300));
  process.exit(1);
}
const jar = new Map();
// @supabase/ssr usa il cookie `sb-<project-ref>-auth-token` con la sessione in JSON
const PROJECT_REF = new URL(SUPA_URL).hostname.split(".")[0];
const userRes = await fetch(`${SUPA_URL}/auth/v1/user`, {
  headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY, Authorization: `Bearer ${tokJson.access_token}` },
});
const userObj = await userRes.json();
const session = {
  access_token: tokJson.access_token,
  refresh_token: tokJson.refresh_token,
  token_type: tokJson.token_type || "bearer",
  expires_in: tokJson.expires_in,
  expires_at: Math.floor(Date.now() / 1000) + (tokJson.expires_in || 3600),
  user: userObj,
};
jar.set(`sb-${PROJECT_REF}-auth-token`, JSON.stringify(session));
ok(true, "sessione ottenuta", `uid ${tokJson.user?.id} cookie=sb-${PROJECT_REF}-auth-token`);

const cookieHeader = () => [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");

const getNoRedirect = async (path) => {
  const res = await fetch(`${SITE}${path}`, { headers: { cookie: cookieHeader() }, redirect: "manual" });
  const loc = res.headers.get("location") || "";
  for (const c of res.headers.getSetCookie?.() || []) {
    const [kv] = c.split(";"); const i = kv.indexOf("=");
    if (i > 0) jar.set(kv.slice(0, i), kv.slice(i + 1));
  }
  return { status: res.status, loc };
};

// ── 4. status ─────────────────────────────────────────────────────────────
{
  const res = await fetch(`${SITE}/api/integrations/status`, { headers: { cookie: cookieHeader() } });
  const json = await res.json();
  ok(res.status === 200, "GET /api/integrations/status", `HTTP ${res.status} providers=${json?.providers?.length}`);
}

// ── 5. authorize per ogni provider ────────────────────────────────────────
const providers = ["notion", "slack", "hubspot", "google_sheets", "github", "clickup", "asana"];
const expectedClientEnv = {
  notion: "NOTION_OAUTH_CLIENT_ID", slack: "SLACK_CLIENT_ID", hubspot: "HUBSPOT_CLIENT_ID",
  google_sheets: "GOOGLE_CLIENT_ID", github: "GITHUB_CLIENT_ID", clickup: "CLICKUP_CLIENT_ID",
  asana: "ASANA_CLIENT_ID",
};
const authUrls = {};
console.log("");
for (const p of providers) {
  const { status, loc } = await getNoRedirect(`/api/integrations/${p}/authorize`);
  if (status !== 307 || !loc) { ok(false, `authorize ${p}`, `status ${status} loc ${loc}`); continue; }
  let u;
  try { u = new URL(loc); } catch { ok(false, `authorize ${p}`, `URL non valida: ${loc}`); continue; }
  const ru = u.searchParams.get("redirect_uri") || "";
  const cid = u.searchParams.get("client_id") || "";
  const expectedRU = `${SITE}/api/integrations/${p}/callback`;
  const wantClient = env[expectedClientEnv[p]] || "?";
  const ruOk = ru === expectedRU;
  const cidOk = cid === wantClient;
  const stOk = (u.searchParams.get("state") || "").length > 10;
  authUrls[p] = { url: loc, redirectUri: ru };
  ok(ruOk && cidOk && stOk, `authorize ${p}`,
    `host=${u.host} redirect_uri=${ruOk ? "OK" : ru} client_id=${cidOk ? "OK" : "MISMATCH " + cid} state=${stOk ? "OK" : "MISSING"}`);
}

// ── 5b. reachability dei provider (il client_id esiste se l'app OAuth
//         esiste: la pagina di login si genera). NOTA: nessuno di questi
//         provider valida la redirect_uri lato server all'authorize, quindi
//         questo controllo NON prova che la redirect sia registrata. ────────
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const BADGE = /redirect_uri_mismatch|does not match the registered|invalid_redirect_uri/i;
console.log("");
for (const [p, v] of Object.entries(authUrls)) {
  try {
    const res = await fetch(v.url, { headers: { "User-Agent": UA, accept: "text/html" }, redirect: "follow" });
    const html = (await res.text()).slice(0, 30000);
    const bad = html.replace(/<[^>]+>/g, " ").match(BADGE);
    const title = (html.match(/<title[^>]*>([\s\S]{0,120}?)<\/title>/i)?.[1] || "").replace(/\s+/g, " ").trim();
    ok(res.ok && !bad, `provider ${p} raggiunge la pagina OAuth`,
      `HTTP ${res.status}${title ? ` "${title}"` : ""}${bad ? ` MISMATCH: ${bad[0]}` : ""}`);
  } catch (e) {
    ok(false, `provider ${p} raggiungibile`, String(e.message).slice(0, 70));
  }
}

// ── 6. CSRF sul callback ──────────────────────────────────────────────────
console.log("");
{
  const r1 = await getNoRedirect("/api/integrations/notion/callback?code=fake&state=fake");
  ok(r1.status === 307 && r1.loc.includes("state_mismatch"), "callback con state falso -> state_mismatch", `${r1.status} ${r1.loc}`);
  const r2 = await getNoRedirect("/api/integrations/notion/callback");
  ok(r2.status === 307 && r2.loc.includes("missing_params"), "callback senza param -> missing_params", `${r2.status} ${r2.loc}`);
  const r3 = await getNoRedirect("/api/integrations/inesistente/authorize");
  ok(r3.status === 400, "authorize provider inesistente -> 400", `HTTP ${r3.status}`);
}

// ── 7. disconnect ─────────────────────────────────────────────────────────
{
  const res = await fetch(`${SITE}/api/integrations/notion/disconnect`, {
    method: "POST", headers: { cookie: cookieHeader(), "Content-Type": "application/json" }, body: "{}",
  });
  const body = await res.text();
  // 404 not_connected = nessuna connessione da rimuovere (stato atteso per un tenant nuovo)
  const expected = res.status === 200 || (res.status === 404 && body.includes("not_connected"));
  ok(expected, "POST /api/integrations/notion/disconnect coerente", `HTTP ${res.status} ${body.slice(0, 80)}`);
}

// ── 8. pagina dashboard/integrations: deve renderizzare i link Connetti ───
{
  const res = await fetch(`${SITE}/dashboard/integrations`, { headers: { cookie: cookieHeader() }, redirect: "manual" });
  const html = await res.text();
  ok(res.status === 200, "GET /dashboard/integrations con sessione", `HTTP ${res.status}`);
  const missing = providers.filter((p) => !html.includes(`/api/integrations/${p}/authorize`));
  ok(missing.length === 0, "la pagina contiene i link Connetti per i 7 provider",
    missing.length ? `MANCANTI: ${missing.join(", ")}` : "tutti presenti");
}

console.log(`\n${pass} pass, ${fail} falliti.  userId=${userId}`);
process.exit(fail > 0 ? 1 : 0);
