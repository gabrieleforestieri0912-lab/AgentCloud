/**
 * Test end-to-end nel browser del toggle della sidebar della chat.
 * Guida Chrome con puppeteer-core usando l'account di test.
 *
 * Verifica:
 *  1. sidebar aperta al caricamento
 *  2. il bottone "chiudi" la restringe (larghezza 0 su desktop)
 *  3. compare il bottone "apri" e riapre
 *  4. Ctrl+B alterna
 *  5. la preferenza sopravvive al reload
 */
import { readFileSync } from "fs";
import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = process.argv[2] || "http://localhost:3000";

const env = {};
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const SUPA = env.NEXT_PUBLIC_SUPABASE_URL;
const EMAIL = "test.integrations@agentcloud.agency";
const PASSWORD = "TestIntegrations!2026";

let fail = 0;
const ok = (c, m, extra = "") => { if (!c) fail++; console.log(`${c ? "PASS " : "FAIL "} ${m}${extra ? " :: " + extra : ""}`); };

// sessione Supabase da iniettare come cookie
const tok = await fetch(`${SUPA}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY, "Content-Type": "application/json" },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
});
const tj = await tok.json();
if (!tj.access_token) { console.error("login fallito", JSON.stringify(tj).slice(0, 200)); process.exit(2); }
const ref = new URL(SUPA).hostname.split(".")[0];
const uRes = await fetch(`${SUPA}/auth/v1/user`, {
  headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY, Authorization: `Bearer ${tj.access_token}` },
});
const session = {
  access_token: tj.access_token, refresh_token: tj.refresh_token,
  token_type: tj.token_type, expires_in: tj.expires_in,
  expires_at: Math.floor(Date.now() / 1000) + (tj.expires_in || 3600),
  user: await uRes.json(),
};

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--window-size=1440,900"],
  defaultViewport: { width: 1440, height: 900 },
});
const page = await browser.newPage();

const url = new URL(BASE);
await page.setCookie({
  name: `sb-${ref}-auth-token`,
  value: encodeURIComponent(JSON.stringify(session)),
  domain: url.hostname,
  path: "/",
});

const sidebarW = () =>
  page.$eval("aside", (el) => Math.round(el.getBoundingClientRect().width));
const hasReopenBtn = () =>
  page.$$eval("button[aria-label]", (btns) =>
    btns.some((b) => (b.getAttribute("aria-label") || "").toLowerCase().includes("sidebar")),
  );
const clickByLabel = (needle) =>
  page.evaluate((n) => {
    const btn = [...document.querySelectorAll("button[aria-label]")].find((b) =>
      (b.getAttribute("aria-label") || "").toLowerCase().includes(n),
    );
    if (!btn) return false;
    btn.click();
    return true;
  }, needle);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

await page.goto(`${BASE}/chat`, { waitUntil: "networkidle2", timeout: 90000 });
await wait(1500);

ok(page.url().includes("/chat"), "/chat raggiungibile con sessione", page.url());
const w0 = await sidebarW();
ok(w0 > 200, "1. sidebar APERTA al caricamento", `larghezza ${w0}px`);

// reset preferenza per un test pulito
await page.evaluate(() => localStorage.setItem("agentcloud_chat_sidebar_open", "true"));
await page.reload({ waitUntil: "networkidle2" });
await wait(1200);

// ── chiudi
const closed = await clickByLabel("chiudi");
await wait(600);
const w1 = await sidebarW();
ok(closed, "2. bottone 'chiudi sidebar' cliccato");
ok(w1 < 10, "   sidebar RESTRETTA", `larghezza ${w1}px`);

// ── riapri
const opened = await clickByLabel("apri");
await wait(600);
const w2 = await sidebarW();
ok(opened, "3. bottone 'apri sidebar' presente e cliccato");
ok(w2 > 200, "   sidebar RIAPERTA", `larghezza ${w2}px`);

// ── Ctrl+B
await page.keyboard.down("Control");
await page.keyboard.press("b");
await page.keyboard.up("Control");
await wait(600);
const w3 = await sidebarW();
ok(w3 < 10, "4. Ctrl+B restringe la sidebar", `larghezza ${w3}px`);

// ── persistenza dopo reload
await page.reload({ waitUntil: "networkidle2" });
await wait(1200);
const w4 = await sidebarW();
ok(w4 < 10, "5. la preferenza SOPRAVVIVE al reload", `larghezza ${w4}px`);

// ── Ctrl+B per riaprire (verifica che lo stato sia tornato coerente)
await page.keyboard.down("Control");
await page.keyboard.press("b");
await page.keyboard.up("Control");
await wait(600);
const w5 = await sidebarW();
ok(w5 > 200, "6. Ctrl+B riaperto dopo reload", `larghezza ${w5}px`);

// ── Ctrl+B non deve rubare la digitazione in un campo di testo
await page.keyboard.down("Control");
await page.keyboard.press("b");
await page.keyboard.up("Control");
await wait(500);
const wBefore = await sidebarW();

// Il focus va messo DAVVERO su un campo: il click può fallire se l'elemento
// non è ancora visibile, e in quel caso il test passerebbe senza verificare nulla.
const focused = await page.evaluate(() => {
  const el = document.querySelector("textarea:not([disabled])") || document.querySelector("input[type='text']");
  if (!el) return null;
  el.focus();
  return document.activeElement === el ? (el.tagName.toLowerCase()) : null;
});
ok(focused !== null, "   focus portato su un campo di testo", `elemento: ${focused}`);
ok(wBefore < 10, "   sidebar ristretta prima del test", `larghezza ${wBefore}px`);

await page.keyboard.down("Control");
await page.keyboard.press("b");
await page.keyboard.up("Control");
await wait(500);
const w6 = await sidebarW();
ok(w6 < 10, "7. Ctrl+B con focus su input NON toggla (nessun furto di tasto)", `larghezza ${w6}px (atteso invariato <10)`);

// ripristina
await page.evaluate(() => localStorage.setItem("agentcloud_chat_sidebar_open", "true"));
await page.screenshot({ path: "logs/sidebar-toggle-test.png" });
await browser.close();

console.log(`\n${fail} falliti.`);
process.exit(fail > 0 ? 1 : 0);
