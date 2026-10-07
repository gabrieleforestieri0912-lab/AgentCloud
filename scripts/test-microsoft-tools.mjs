/**
 * Test dei tool Microsoft e del meccanismo di conferma (Fase 3, step 7).
 *
 * Due parti:
 *  - runtime: il token di conferma (firma, scadenza, manomissione) e l'insieme
 *    dei tool che richiedono conferma. Sono le invarianti di sicurezza del
 *    meccanismo: un token falsificabile equivarrebbe a nessuna conferma.
 *  - source-scan: il cablaggio dei tool. `microsoft-tools.ts` importa moduli con
 *    alias `@/`, che i test non risolvono, quindi il cablaggio si verifica sul
 *    sorgente — come fanno già i test di drive/woocommerce.
 *
 * Eseguire: npm run test:microsoft-tools
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

// Chiave nota: il modulo legge l'env a ogni chiamata, così possiamo firmare un
// token scaduto nel test senza dipendere dall'ambiente.
process.env.INTEGRATIONS_STATE_SECRET = "test-confirmation-key";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

const {
  buildApprovalToken,
  verifyApprovalToken,
  toolRequiresConfirmation,
  CONFIRMATION_TTL_MS,
} = await import("../src/lib/agents/tool-confirmation.ts");

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

const TOOL_NAMES = [
  "word_create",
  "word_append",
  "word_read",
  "excel_create",
  "excel_read_range",
  "excel_write_range",
  "powerpoint_create",
  "onenote_list",
  "onenote_create_page",
  "onenote_append",
  "onenote_read",
];

console.log("\nConferma · quali tool la richiedono");

await test("le modifiche a contenuto esistente richiedono conferma", () => {
  for (const t of ["word_append", "excel_write_range", "onenote_append"]) {
    assert.equal(toolRequiresConfirmation(t), true, `${t} deve richiedere conferma`);
  }
});

await test("le creazioni di file nuovi e le letture NON richiedono conferma", () => {
  for (const t of [
    "word_create",
    "word_read",
    "excel_create",
    "excel_read_range",
    "powerpoint_create",
    "onenote_list",
    "onenote_create_page",
    "onenote_read",
  ]) {
    assert.equal(toolRequiresConfirmation(t), false, `${t} non deve richiedere conferma`);
  }
});

console.log("\nConferma · il token firmato");

const batch = {
  t: "tenant-1",
  a: "business-manager",
  u: [
    { id: "tu1", name: "word_create", input: { name: "a.docx" } },
    { id: "tu2", name: "word_append", input: { itemId: "f1", paragraphs: ["x"] } },
  ],
  c: 1,
};

await test("un token valido conserva batch, indice e tenant", () => {
  const token = buildApprovalToken(batch);
  const decoded = verifyApprovalToken(token);
  assert.ok(decoded, "token rifiutato");
  assert.equal(decoded.t, "tenant-1");
  assert.equal(decoded.a, "business-manager");
  assert.equal(decoded.c, 1);
  assert.equal(decoded.u.length, 2);
  assert.equal(decoded.u[1].name, "word_append");
  assert.ok(decoded.e > Date.now(), "scadenza già passata");
});

await test("manomettere il payload invalida la firma", () => {
  const token = buildApprovalToken(batch);
  const [b64, sig] = token.split(".");
  // Cambio un byte del payload mantenendo la firma originale.
  const tampered = Buffer.from(b64, "base64url");
  tampered[5] = tampered[5] ^ 0xff;
  const bad = `${tampered.toString("base64url")}.${sig}`;
  assert.equal(verifyApprovalToken(bad), null);
});

await test("una firma diversa viene rifiutata", () => {
  const token = buildApprovalToken(batch);
  const [b64] = token.split(".");
  const bad = `${b64}.${"0".repeat(64)}`;
  assert.equal(verifyApprovalToken(bad), null);
});

await test("un token scaduto viene rifiutato", () => {
  const payload = { ...batch, e: Date.now() - 1000 };
  const b64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", process.env.INTEGRATIONS_STATE_SECRET)
    .update(b64)
    .digest("hex");
  assert.equal(verifyApprovalToken(`${b64}.${sig}`), null);
});

await test("un token malformato o vuoto non lancia", () => {
  assert.equal(verifyApprovalToken(""), null);
  assert.equal(verifyApprovalToken("nonsense"), null);
  assert.equal(verifyApprovalToken("a.b"), null);
});

await test("la finestra di validità è breve (minuti, non ore)", () => {
  assert.ok(CONFIRMATION_TTL_MS > 0 && CONFIRMATION_TTL_MS <= 15 * 60 * 1000);
});

console.log("\nCablaggio · tool registrati");

await test("i tool Microsoft sono definiti con schema, description e required", () => {
  const src = read("src/lib/agents/microsoft-tools.ts");
  for (const t of TOOL_NAMES) {
    assert.ok(src.includes(`"${t}"`), `nome mancante: ${t}`);
    assert.ok(src.includes(`name: "${t}"`), `definizione mancante: ${t}`);
  }
  // Conteggio: ogni tool ha una description.
  const defs = src.split("  name: \"").length - 1;
  assert.ok(defs >= TOOL_NAMES.length, `definizioni trovate: ${defs}`);
  assert.ok(src.includes("input_schema: {"), "manca input_schema");
  assert.ok(src.includes("required:"), "manca required nei tool che lo prevedono");
});

await test("integration-tools cabla i tool Microsoft (nomi, definizioni, dispatch)", () => {
  const src = read("src/lib/agents/integration-tools.ts");
  assert.ok(src.includes("...MICROSOFT_TOOL_NAMES,"), "nomi non innestati");
  assert.ok(src.includes("...MICROSOFT_TOOL_DEFINITIONS,"), "definizioni non innestate");
  assert.ok(src.includes("isMicrosoftTool(name)"), "dispatch non delegato");
  assert.ok(src.includes("executeMicrosoftTool("), "handler non chiamato");
});

await test("i tool sono in ALL_TOOLS_LIST e in MICROSOFT_TOOLS del registry", () => {
  const flags = read("src/lib/agents/feature-flags.ts");
  const registry = read("src/lib/agents/registry.ts");
  assert.ok(registry.includes("const MICROSOFT_TOOLS = ["), "lista registry mancante");
  for (const t of TOOL_NAMES) {
    assert.ok(flags.includes(`"${t}"`), `non in ALL_TOOLS_LIST: ${t}`);
    assert.ok(registry.includes(`"${t}"`), `non in MICROSOFT_TOOLS: ${t}`);
  }
  const spreads = registry.split("...MICROSOFT_TOOLS,").length - 1;
  assert.ok(spreads >= 10, `MICROSOFT_TOOLS innestata in pochi agenti: ${spreads}`);
});

await test("i tool Microsoft si espongono solo se la connessione è attiva", () => {
  const src = read("src/app/api/agent/run/route.ts");
  assert.ok(src.includes("isMicrosoftConnected(effectiveTenant)"), "manca il filtro per connessione");
  assert.ok(src.includes("isMicrosoftToolName(t)"), "il filtro non usa il nome del tool");
});

console.log("\nConferma · lato route");

await test("la route mette in pausa e riprende con il token", () => {
  const src = read("src/app/api/agent/run/route.ts");
  assert.ok(src.includes("buildApprovalToken("), "non genera il token");
  assert.ok(src.includes("verifyApprovalToken(approval.token)"), "non verifica il token alla ripresa");
  assert.ok(src.includes('type: "tool_confirm"'), "non emette l'evento di conferma");
  assert.ok(src.includes('type: "awaiting_confirmation"'), "non segnala la pausa");
  assert.ok(src.includes("toolRequiresConfirmation"), "non usa l'insieme di conferma");
});

console.log("\nOsservabilità · nessun contenuto di documento nei log");

await test("la route logga durata e byte, non il risultato del tool", () => {
  const src = read("src/app/api/agent/run/route.ts");
  assert.ok(src.includes('logAudit("tool_exec"'), "manca il log strutturato");
  assert.ok(src.includes("resultBytes: result.length"), "manca la metrica di dimensione");
  assert.equal(
    /logAudit\("tool_exec"[\s\S]{0,300}content: result/.test(src),
    false,
    "il log non deve salvare il contenuto del documento",
  );
});

await test("i moduli documenti non usano console.log", () => {
  for (const f of ["word", "excel", "powerpoint", "onenote", "graph"]) {
    const src = read(`src/lib/integrations/microsoft/${f}.ts`);
    assert.equal(src.includes("console.log"), false, `${f}.ts logga`);
  }
});

console.log("\nBilling e privacy");

await test("le run registrano tool_calls", () => {
  assert.ok(read("supabase/schema.sql").includes("tool_calls integer default 0"));
  assert.ok(read("src/lib/billing/usage-tracking.ts").includes("tool_calls: usage.tool_calls ?? 0"));
  assert.ok(read("src/app/api/agent/run/route.ts").includes("tool_calls: toolCalls"));
});

await test("la privacy policy cita Microsoft in tutte le lingue", () => {
  const src = read("src/lib/i18n/legal.ts");
  const count = src.split("Microsoft 365 (Word, Excel, PowerPoint, OneNote)").length - 1;
  assert.equal(count, 5, `menzioni trovate: ${count} (attese 5, una per lingua)`);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
