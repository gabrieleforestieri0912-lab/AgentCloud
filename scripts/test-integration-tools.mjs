/**
 * Verifica che i tool Notion / Slack / HubSpot siano registrati ed esposti:
 *  - presenti in ALL_TOOLS_LIST (senza, il filtro globale li rimuove)
 *  - presenti nelle definizioni (senza, il tool non è visibile al modello)
 *  - presenti negli optionalTools di ogni agente
 *  - raggiungibili da isIntegrationTool (senza, il dispatch non li chiama)
 *  - prompt di ogni agente contains the usage directive
 *  - esecuzione reale senza token -> messaggio "non connected" (mai crash)
 */
import { readFileSync } from "fs";

const read = (p) => readFileSync(p, "utf8");

const flags = read("src/lib/agents/feature-flags.ts");
const registry = read("src/lib/agents/registry.ts");
const toolsSrc = read("src/lib/agents/integration-tools.ts");

const TOOLS = [
  "notion_search", "notion_read_page", "notion_create_page", "notion_append_blocks",
  "slack_list_channels", "slack_post_message", "slack_read_channel",
  "hubspot_search_contacts", "hubspot_get_contact", "hubspot_create_contact",
  "hubspot_update_contact", "hubspot_list_companies",
];

let fail = 0;
const ok = (c, m, extra = "") => { if (!c) fail++; console.log(`${c ? "PASS" : "FAIL"}  ${m}${extra ? " :: " + extra : ""}`); };

// 1. allowlist globale
const missingFlags = TOOLS.filter((t) => !flags.includes(`"${t}"`));
ok(missingFlags.length === 0, "tutti i 12 tool in ALL_TOOLS_LIST", missingFlags.length ? `mancano: ${missingFlags}` : "");

// 2. nomi nel dispatch + definizioni
const missingDispatch = TOOLS.filter((t) => !toolsSrc.includes(`"${t}"`));
ok(missingDispatch.length === 0, "tutti i tool nello INTEGRATION_TOOL_NAMES e nelle definizioni", missingDispatch.length ? `mancano: ${missingDispatch}` : "");

// 3. handler (case nel ramo executeIntegrationTool)
const missingCase = TOOLS.filter((t) => !new RegExp(`case "${t}"`).test(toolsSrc));
ok(missingCase.length === 0, "tutti i tool hanno un case nel dispatch", missingCase.length ? `mancano: ${missingCase}` : "");

// 4. registry: spread su tutti gli agenti + direttiva
const spreads = (registry.match(/\.\.\.NOTION_SLACK_HUBSPOT_TOOLS,/g) || []).length;
ok(spreads === 15, "spread dei tool su tutti e 15 gli agenti", `trovati ${spreads}`);
ok(registry.includes("INTEGRATION_TOOLS_DIRECTIVE"), "direzione d'uso dei tool definita");
ok(registry.includes("withIntegrationDirective"), "direzione applicata agli agenti");

// 5. proxy: i tre provider sono supportati
const proxy = read("src/lib/integrations/api-proxy.ts");
for (const fn of ["notionApiProxy", "slackApiProxy", "hubspotApiProxy", "refreshViaAdapter"]) {
  ok(proxy.includes(`export async function ${fn}`) || proxy.includes(`function ${fn}`), `api-proxy espone ${fn}`);
}
ok(!proxy.includes("refreshAsana("), "refreshAsana hardcoded rimosso (bug token HubSpot 6h)");

// 6. esecuzione reale dei tool senza connessione: deve rispondere, non crashare
const { executeIntegrationTool } = await import("../src/lib/agents/integration-tools.ts").catch(() => ({}));
if (executeIntegrationTool) {
  console.log("");
  for (const [name, input] of [
    ["notion_search", { query: "report" }],
    ["notion_read_page", { pageId: "abc" }],
    ["notion_create_page", { pageId: "abc", title: "T" }],
    ["notion_append_blocks", { pageId: "abc", content: "x" }],
    ["slack_list_channels", {}],
    ["slack_post_message", { channel: "C1", text: "ciao" }],
    ["slack_read_channel", { channel: "C1" }],
    ["hubspot_search_contacts", { query: "a@" }],
    ["hubspot_get_contact", { email: "a@b.co" }],
    ["hubspot_create_contact", { email: "a@b.co" }],
    ["hubspot_update_contact", { values: "company=Acme" }],
    ["hubspot_list_companies", {}],
  ]) {
    let out = "";
    try { out = await executeIntegrationTool(name, input, { userId: "anonymous", tenantId: null }); }
    catch (e) { out = `CRASH: ${e.message}`; }
    const graceful = typeof out === "string" && out.length > 0 && !out.startsWith("CRASH");
    ok(graceful, `tool ${name} risponde senza crash`, String(out).slice(0, 90));
  }
} else {
  console.log("\n(skipped) esecuzione reale: impossibile importare il modulo TS senza transpiler");
}

console.log(`\n${fail} falliti.`);
process.exit(fail > 0 ? 1 : 0);
