/**
 * Test del client Microsoft Graph (Fase 3, step 2).
 *
 * Il client è usato da Word/Excel/PowerPoint/OneNote, quindi gli invarianti da
 * verificare sono trasversali: il retry sui 429, il comportamento di conflitto
 * sull'upload, il limite di dimensione applicato PRIMA di chiamare la rete, la
 * lettura binaria (res.text() corromperebbe un file) e il messaggio chiaro
 * quando la connessione non esiste.
 *
 * Eseguire: npm run test:microsoft-graph
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createGraphClient, encodeDrivePath, asDriveItem, MAX_UPLOAD_BYTES } from "../src/lib/integrations/microsoft/graph.ts";

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

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Esegue `fn` con un fetch finto, ripristinando sempre il fetch reale. */
async function withFetch(fake, fn) {
  const real = globalThis.fetch;
  globalThis.fetch = fake;
  try {
    return await fn();
  } finally {
    globalThis.fetch = real;
  }
}

console.log("\nHelper · path e item");

await test("encodeDrivePath codifica i segmenti ma non i separatori", () => {
  assert.equal(encodeDrivePath("AgentCloud/report 2026#1.docx"), "AgentCloud/report%202026%231.docx");
  assert.equal(encodeDrivePath("/a/b/"), "a/b");
  assert.equal(encodeDrivePath(""), "");
});

await test("asDriveItem normalizza e rifiuta le forme inattese", () => {
  const item = asDriveItem({ id: "i1", name: "f.docx", webUrl: "https://x", size: 12 });
  assert.deepEqual(item, { id: "i1", name: "f.docx", webUrl: "https://x", size: 12 });
  assert.equal(asDriveItem({ id: "i1" }), null);
  assert.equal(asDriveItem(null), null);
});

console.log("\nRichieste · retry e limiti");

await test("ritenta sui 429 e poi riesce", async () => {
  const client = createGraphClient("Bearer test");
  let calls = 0;
  const out = await withFetch(
    async () => {
      calls++;
      if (calls === 1) {
        return new Response("slow down", { status: 429, headers: { "retry-after": "0" } });
      }
      return jsonResponse({ ok: true });
    },
    () => client.json("/me"),
  );
  assert.equal(out.ok, true);
  assert.equal(calls, 2, "il 429 doveva essere ritentato una volta");
});

await test("un 404 diventa un errore leggibile, non un ok con dato vuoto", async () => {
  const client = createGraphClient("Bearer test");
  const out = await withFetch(
    async () => jsonResponse({ error: { message: "Item not found" } }, 404),
    () => client.getItemByPath("AgentCloud/missing.docx"),
  );
  assert.equal(out.ok, false);
  assert.ok(out.error.includes("Not found"), `errore inatteso: ${out.error}`);
});

await test("uploadFile rifiuta i file oltre il limite senza chiamare la rete", async () => {
  const client = createGraphClient("Bearer test");
  let called = false;
  const big = new Uint8Array(MAX_UPLOAD_BYTES + 1);
  const out = await withFetch(
    async () => {
      called = true;
      return jsonResponse({});
    },
    () => client.uploadFile("big.docx", big, "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
  );
  assert.equal(out.ok, false);
  assert.ok(out.error.includes("troppo grande"));
  assert.equal(called, false, "il limite va applicato prima della rete");
});

console.log("\nCartella AgentCloud");

await test("crea la cartella quando non esiste (404 sul path, POST sui children)", async () => {
  const client = createGraphClient("Bearer test");
  const seen = [];
  const out = await withFetch(
    async (url, init) => {
      seen.push({ url: String(url), method: init?.method ?? "GET" });
      if (String(url).includes("/me/drive/root:/AgentCloud") && !String(url).includes("/content")) {
        return jsonResponse({ error: { message: "not found" } }, 404);
      }
      if (String(url).endsWith("/me/drive/root/children")) {
        return jsonResponse({ id: "folder1", name: "AgentCloud", webUrl: "https://x/folder1" });
      }
      return jsonResponse({}, 500);
    },
    () => client.ensureAgentCloudFolder(),
  );
  assert.equal(out.ok, true);
  assert.equal(out.data.id, "folder1");
  assert.ok(seen.some((s) => s.url.endsWith("/me/drive/root/children") && s.method === "POST"));
});

await test("non ricrea la cartella se esiste già", async () => {
  const client = createGraphClient("Bearer test");
  let posts = 0;
  const out = await withFetch(
    async (_url, init) => {
      if ((init?.method ?? "GET") === "POST") posts++;
      return jsonResponse({ id: "folder1", name: "AgentCloud" });
    },
    () => client.ensureAgentCloudFolder(),
  );
  assert.equal(out.ok, true);
  assert.equal(posts, 0, "una cartella esistente non va ricreata");
});

console.log("\nUpload e download");

await test("upload usa conflictBehavior=rename di default e =replace su richiesta", async () => {
  const client = createGraphClient("Bearer test");
  const urls = [];
  const fake = async (url) => {
    urls.push(String(url));
    if (String(url).includes(":/content")) {
      return jsonResponse({ id: "file1", name: "doc.docx", webUrl: "https://x/file1" });
    }
    // La cartella esiste.
    return jsonResponse({ id: "folder1", name: "AgentCloud" });
  };
  const body = new TextEncoder().encode("hello");

  const created = await withFetch(fake, () =>
    client.uploadFile("doc.docx", body, "application/octet-stream"),
  );
  assert.equal(created.ok, true);
  assert.ok(urls.some((u) => u.includes("conflictBehavior=rename")), "default deve rinominare");

  urls.length = 0;
  const replaced = await withFetch(fake, () =>
    client.uploadFile("doc.docx", body, "application/octet-stream", "replace"),
  );
  assert.equal(replaced.ok, true);
  assert.ok(urls.some((u) => u.includes("conflictBehavior=replace")));
});

await test("download legge byte, non testo", async () => {
  const client = createGraphClient("Bearer test");
  const payload = new Uint8Array([0x50, 0x4b, 0x03, 0x04]); // magic di uno zip/OOXML
  const out = await withFetch(
    async () => new Response(payload, { status: 200 }),
    () => client.downloadFile("file1"),
  );
  assert.equal(out.ok, true);
  assert.deepEqual([...out.data], [...payload]);
});

console.log("\nRiuso · un solo punto per token e refresh");

await test("tenant.ts risolve il token via resolveIntegrationToken, senza duplicare decrypt/refresh", () => {
  const src = fs.readFileSync(
    path.join(ROOT, "src/lib/integrations/microsoft/tenant.ts"),
    "utf8",
  );
  assert.ok(
    src.includes('resolveIntegrationToken(tenantId, "microsoft")'),
    "deve usare il resolve condiviso, non una query propria",
  );
  assert.ok(
    src.includes("integrationAuth(resolved.token)"),
    "l'header Authorization va costruito da integrationAuth",
  );
  // graph.ts deve restare senza alias @/, altrimenti non è importabile dai test.
  const graph = fs.readFileSync(
    path.join(ROOT, "src/lib/integrations/microsoft/graph.ts"),
    "utf8",
  );
  assert.equal(
    /^import .*@\//m.test(graph),
    false,
    "graph.ts non deve importare tramite l'alias @/ (i test non lo risolvono)",
  );
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
