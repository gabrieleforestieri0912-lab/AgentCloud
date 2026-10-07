// Verifica che i client dell'ecosistema (CLI, estensione, mobile) restino
// allineati alla piattaforma web:
//   1. catalogo agenti   → src/lib/agents.ts
//   2. catalogo integrazioni → src/lib/integrations.ts
//   3. contratto API/SSE e conferma umana → src/app/api/agent/run/route.ts
//
// Gira senza dipendenze: `node scripts/test-clients-alignment.mjs`.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(resolve(ROOT, p), "utf8");

let passed = 0;
let failed = 0;
function assert(ok, message) {
  if (ok) {
    passed++;
  } else {
    failed++;
    console.error(`  ✗ ${message}`);
  }
}
function section(title) {
  console.log(`\n${title}`);
}

// ─── 1. Catalogo agenti ─────────────────────────────────────────────────────

/** Estrae gli agenti da src/lib/agents.ts (blocchi con slug/name/category/price). */
function parseWebAgents() {
  const text = read("src/lib/agents.ts");
  const seedStart = text.indexOf("const SEEDS: AgentSeed[] = [");
  const seedEnd = text.indexOf("\nexport const AGENTS", seedStart);
  const body = text.slice(seedStart, seedEnd);
  const lines = body.split("\n");
  const agents = [];
  let current = null;
  for (const line of lines) {
    const slug = line.match(/^\s{4}slug: "([^"]+)"/);
    if (slug) {
      current = { slug: slug[1], name: "", category: "", price: "" };
      agents.push(current);
      continue;
    }
    if (!current) continue;
    const name = line.match(/^\s{4}name: "([^"]+)"/);
    if (name) current.name = name[1];
    const category = line.match(/^\s{4}category: "([^"]+)"/);
    if (category) current.category = category[1];
    const price = line.match(/^\s{4}price: "([^"]+)"/);
    if (price) current.price = price[1];
  }
  // I primi 15 seed sono abilitati dai feature flag (ACTIVE_15_AGENTS); i 7
  // successivi sono "Prossimamente". L'ordine dei seed è la fonte di verità.
  return agents.map((a, i) => ({ ...a, comingSoon: i >= 15 }));
}

function extractQuoted(line) {
  return [...line.matchAll(/"([^"]*)"/g)].map((m) => m[1]);
}

/** Estrae gli agenti da un file con righe tipo ["slug", "Name", "Cat", "€x"]. */
function parseRowAgents(path) {
  const text = read(path);
  const agents = [];
  let comingSoon = false;
  for (const raw of text.split("\n")) {
    if (/COMING_SOON/.test(raw)) comingSoon = true;
    const m = raw.match(/^\s*\["([^"]+)",\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)"\]/);
    if (m) agents.push({ slug: m[1], name: m[2], category: m[3], price: m[4], comingSoon });
  }
  return agents;
}

/** Estrae gli agenti da extension/shared/catalog.js. */
function parseExtensionAgents() {
  const text = read("extension/shared/catalog.js");
  const agents = [];
  const re = /slug: "([^"]+)", name: "([^"]+)", category: "([^"]+)", price: "([^"]+)", comingSoon: (true|false)/g;
  let m;
  while ((m = re.exec(text))) {
    agents.push({ slug: m[1], name: m[2], category: m[3], price: m[4], comingSoon: m[5] === "true" });
  }
  return agents;
}

/** Estrae gli agenti da mobile/lib/src/models/agent.dart. */
function parseMobileAgents() {
  const text = read("mobile/lib/src/models/agent.dart");
  const listStart = text.indexOf("static const List<Agent> all = [");
  const body = text.slice(listStart);
  const chunks = body.split(/\n\s*Agent\(/).slice(1);
  const agents = [];
  for (const chunk of chunks) {
    const slug = chunk.match(/slug: '([^']+)'/);
    const name = chunk.match(/\bname: '([^']+)'/);
    const category = chunk.match(/category: '([^']+)'/);
    const price = chunk.match(/displayPrice: '([^']+)'/);
    if (!slug || !name || !category || !price) continue;
    agents.push({ slug: slug[1], name: name[1], category: category[1], price: price[1], comingSoon: /active: false/.test(chunk) });
  }
  return agents;
}

function compareAgents(label, expected, actual) {
  const bySlug = new Map(actual.map((a) => [a.slug, a]));
  assert(actual.length === expected.length, `${label}: ${actual.length} agenti invece di ${expected.length}`);
  for (const exp of expected) {
    const got = bySlug.get(exp.slug);
    if (!got) {
      assert(false, `${label}: manca l'agente ${exp.slug}`);
      continue;
    }
    assert(got.name === exp.name, `${label}: ${exp.slug} nome "${got.name}" ≠ "${exp.name}"`);
    assert(got.category === exp.category, `${label}: ${exp.slug} categoria "${got.category}" ≠ "${exp.category}"`);
    assert(got.price === exp.price, `${label}: ${exp.slug} prezzo "${got.price}" ≠ "${exp.price}"`);
    assert(got.comingSoon === exp.comingSoon, `${label}: ${exp.slug} comingSoon ${got.comingSoon} ≠ ${exp.comingSoon}`);
  }
}

section("Catalogo agenti (fonte: src/lib/agents.ts)");
const webAgents = parseWebAgents();
assert(webAgents.length === 22, `web: attesi 22 agenti, trovati ${webAgents.length}`);
compareAgents("CLI", webAgents, parseRowAgents("cli/src/catalog.ts"));
compareAgents("estensione", webAgents, parseExtensionAgents());
compareAgents("mobile", webAgents, parseMobileAgents());

// ─── 2. Catalogo integrazioni ───────────────────────────────────────────────

/** Estrae le integrazioni da src/lib/integrations.ts (INTEGRATIONS). */
function parseWebIntegrations() {
  const text = read("src/lib/integrations.ts");
  const start = text.indexOf("export const INTEGRATIONS: Integration[] = [");
  const end = text.indexOf("\n];", start);
  const body = text.slice(start, end);
  const chunks = body.split(/\{\s*\n/).slice(1);
  const items = [];
  for (const chunk of chunks) {
    const name = chunk.match(/name: "([^"]+)"/);
    if (!name) continue;
    const available = /available: true/.test(chunk);
    items.push({ name: name[1], available });
  }
  return items;
}

/** Estrae le integrazioni da mobile/lib/src/models/integration.dart. */
function parseMobileIntegrations() {
  const text = read("mobile/lib/src/models/integration.dart");
  const start = text.indexOf("static const List<Integration> all = [");
  const end = text.indexOf("\n  ];", start);
  const body = text.slice(start, end);
  const items = [];
  const re = /name: '([^']+)', brand: '[^']+', category: '[^']+'(?:, available: true)?/g;
  let m;
  while ((m = re.exec(body))) {
    items.push({ name: m[1], available: /available: true/.test(m[0]) });
  }
  return items;
}

section("Catalogo integrazioni (fonte: src/lib/integrations.ts)");
const webIntegrations = parseWebIntegrations();
const mobileIntegrations = parseMobileIntegrations();
assert(webIntegrations.length === 43, `web: attese 43 card integrazione, trovate ${webIntegrations.length}`);
assert(
  mobileIntegrations.length === webIntegrations.length,
  `mobile: ${mobileIntegrations.length} card invece di ${webIntegrations.length}`,
);
const mobileByName = new Map(mobileIntegrations.map((i) => [i.name, i]));
for (const exp of webIntegrations) {
  const got = mobileByName.get(exp.name);
  if (!got) {
    assert(false, `mobile: manca l'integrazione ${exp.name}`);
    continue;
  }
  assert(got.available === exp.available, `mobile: ${exp.name} available ${got.available} ≠ ${exp.available}`);
}

// ─── 3. Contratto API/SSE e conferma umana ──────────────────────────────────

section("Contratto SSE: conferma umana (tool_confirm / approval)");
const route = read("src/app/api/agent/run/route.ts");
assert(route.includes('type: "tool_confirm"'), "web: la route non emette tool_confirm");
assert(route.includes('type: "awaiting_confirmation"'), "web: la route non emette awaiting_confirmation");
assert(/approval\?\.token/.test(route), "web: la route non gestisce approval.token");

const extensionWorker = read("extension/background/service-worker.js");
assert(extensionWorker.includes("tool_confirm"), "estensione: il service worker non gestisce tool_confirm");
assert(extensionWorker.includes("awaiting_confirmation"), "estensione: il service worker non gestisce awaiting_confirmation");
assert(extensionWorker.includes("approvalToken"), "estensione: il service worker non invia approvalToken");
const extensionPanel = read("extension/sidepanel/sidepanel.js");
assert(extensionPanel.includes("tool_confirm"), "estensione: il pannello non gestisce tool_confirm");
assert(extensionPanel.includes("approvePendingRun") && extensionPanel.includes("denyPendingRun"), "estensione: mancano approva/annulla");

const cliIndex = read("cli/src/index.ts");
const cliApi = read("cli/src/api.ts");
assert(cliIndex.includes("tool_confirm"), "CLI: non gestisce tool_confirm");
assert(cliIndex.includes("approvalToken"), "CLI: non riprende con approvalToken");
assert(cliApi.includes("approvalToken"), "CLI: streamAgent non accetta approvalToken");

const mobileClient = read("mobile/lib/src/api/agentcloud_client.dart");
assert(mobileClient.includes("tool_confirm"), "mobile: il client non gestisce tool_confirm");
assert(mobileClient.includes("awaiting_confirmation"), "mobile: il client non gestisce awaiting_confirmation");
assert(mobileClient.includes("approvalToken"), "mobile: il client non invia approvalToken");
assert(mobileClient.includes("PendingApproval"), "mobile: manca il tipo PendingApproval");
const mobileChat = read("mobile/lib/src/screens/chat/chat_screen.dart");
assert(mobileChat.includes("Approva") && mobileChat.includes("Annulla"), "mobile: la chat non ha approva/annulla");

// ─── 4. Documentazione allineata ────────────────────────────────────────────

section("Documentazione");
assert(read("cli/docs/api-contracts.md").includes("tool_confirm"), "CLI: api-contracts.md non documenta tool_confirm");
assert(read("extension/README.md").includes("tool_confirm"), "estensione: README non documenta tool_confirm");
const ecosystem = read("docs/ECOSYSTEM.md");
assert(ecosystem.includes("/api/extension/session"), "docs/ECOSYSTEM.md non cita /api/extension/session");
assert(ecosystem.includes("/api/user/usage"), "docs/ECOSYSTEM.md non cita /api/user/usage");
assert(ecosystem.includes("tool_confirm"), "docs/ECOSYSTEM.md non documenta la conferma umana");
assert(ecosystem.includes("Side Panel") || ecosystem.includes("side panel"), "docs/ECOSYSTEM.md non cita il side panel");

// ─── Riepilogo ──────────────────────────────────────────────────────────────

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
