/**
 * Test del layer documenti Microsoft (Fase 3, step 3-6).
 *
 * I generatori (docx/xlsx/pptx) sono funzioni pure: qui si verifica il
 * roundtrip reale (costruisci → rileggi), non solo che "non lanci". L'append
 * Word è il caso più delicato: deve preservare il contenuto esistente, quindi il
 * test controlla che dopo l'append ci siano sia il testo vecchio sia il nuovo.
 *
 * Le chiamate Graph usano un client finto: nessuna rete, ma la stessa interfaccia
 * usata in produzione.
 *
 * Eseguire: npm run test:microsoft-documents
 */

import assert from "node:assert/strict";
import JSZip from "jszip";
import {
  buildDocx,
  extractDocxText,
  appendParagraphsToDocx,
  createDocument,
  appendToDocument,
  readDocument,
} from "../src/lib/integrations/microsoft/word.ts";
import { buildWorkbook, columnLetter, appendRows, readRange, writeRange } from "../src/lib/integrations/microsoft/excel.ts";
import { buildPresentation, MAX_SLIDES } from "../src/lib/integrations/microsoft/powerpoint.ts";
import {
  listNotebooks,
  listSections,
  buildPageHtml,
  createPage,
  appendToPage,
  getPageContent,
} from "../src/lib/integrations/microsoft/onenote.ts";

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

/** Client Graph finto: memorizza gli upload e restituisce i byte scaricati. */
function fakeClient({ download, json } = {}) {
  const uploads = [];
  return {
    auth: "Bearer test",
    uploads,
    request: async () => ({ ok: true, status: 200, text: "", json: {} }),
    json: async (path, opts) => {
      if (json) return json(path, opts);
      if (String(path).startsWith("/me/drive/items/")) {
        return { ok: true, data: { name: "doc.docx" } };
      }
      return { ok: true, data: {} };
    },
    ensureAgentCloudFolder: async () => ({ ok: true, data: { id: "folder", name: "AgentCloud" } }),
    getItemByPath: async () => ({ ok: false, error: "Not found in OneDrive: x" }),
    uploadFile: async (name, content, mime, mode) => {
      uploads.push({ name, content, mime, mode });
      return { ok: true, data: { id: "file1", name, webUrl: "https://x/file1" } };
    },
    downloadFile: async () => download ?? { ok: false, error: "no download" },
  };
}

console.log("\nWord · roundtrip e append");

await test("buildDocx → extractDocxText conserva titolo e testo", async () => {
  const bytes = await buildDocx({
    blocks: [{ heading: "Riepilogo Q1", text: "Fatturato in crescita." }],
  });
  assert.ok(bytes.byteLength > 0);
  const text = await extractDocxText(bytes);
  assert.ok(text.includes("Riepilogo Q1"), `testo: ${text}`);
  assert.ok(text.includes("Fatturato in crescita."));
});

await test("appendParagraphsToDocx preserva il contenuto esistente", async () => {
  const original = await buildDocx({ blocks: [{ text: "Riga originale." }] });
  const updated = await appendParagraphsToDocx(original, ["Riga aggiunta.", "Seconda aggiunta."]);
  const text = await extractDocxText(updated);
  assert.ok(text.includes("Riga originale."), "il contenuto esistente è stato perso");
  assert.ok(text.includes("Riga aggiunta."));
  assert.ok(text.includes("Seconda aggiunta."));
});

await test("appendParagraphsToDocx rifiuta un file non-docx", async () => {
  await assert.rejects(
    () => appendParagraphsToDocx(new TextEncoder().encode("non un docx"), ["x"]),
    /docx/i,
  );
});

await test("createDocument carica nella cartella come nuovo file (rename)", async () => {
  const client = fakeClient();
  const out = await createDocument(client, {
    name: "report.docx",
    blocks: [{ heading: "Report", text: "Contenuto." }],
  });
  assert.equal(out.ok, true);
  assert.equal(out.data.name, "report.docx");
  assert.ok(out.data.text.includes("Contenuto."));
  assert.equal(client.uploads.length, 1);
  assert.equal(client.uploads[0].mode, "rename", "la creazione non deve sovrascrivere");
});

await test("appendToDocument scarica, aggiunge e ricarica in replace", async () => {
  const original = await buildDocx({ blocks: [{ text: "Prima parte." }] });
  const client = fakeClient({ download: { ok: true, data: original } });
  const out = await appendToDocument(client, { itemId: "file1", paragraphs: ["Parte nuova."] });
  assert.equal(out.ok, true);
  assert.ok(out.data.text.includes("Prima parte."));
  assert.ok(out.data.text.includes("Parte nuova."));
  assert.equal(client.uploads[0].mode, "replace");
  assert.equal(client.uploads[0].name, "doc.docx");
});

await test("readDocument estrae il testo", async () => {
  const doc = await buildDocx({ blocks: [{ text: "Da leggere." }] });
  const client = fakeClient({ download: { ok: true, data: doc } });
  const out = await readDocument(client, { itemId: "file1" });
  assert.equal(out.ok, true);
  assert.ok(out.data.text.includes("Da leggere."));
});

console.log("\nExcel · workbook e range");

await test("buildWorkbook produce un .xlsx valido con i fogli attesi", async () => {
  const bytes = await buildWorkbook([{ name: "Vendite", rows: [["Prodotto", "Totale"], ["A", 10]] }]);
  const zip = await JSZip.loadAsync(bytes);
  assert.ok(zip.file("xl/workbook.xml"), "manca xl/workbook.xml");
  const wbXml = await zip.file("xl/workbook.xml").async("string");
  assert.ok(wbXml.includes("Vendite"), "il nome del foglio non è nel workbook");
});

await test("columnLetter converte le colonne", () => {
  assert.equal(columnLetter(1), "A");
  assert.equal(columnLetter(26), "Z");
  assert.equal(columnLetter(27), "AA");
  assert.equal(columnLetter(52), "AZ");
});

await test("readRange/writeRange usano il path workbook di Graph", async () => {
  const paths = [];
  const client = fakeClient({
    json: async (path, opts) => {
      paths.push({ path: String(path), method: opts?.method ?? "GET" });
      return { ok: true, data: { address: "A1:B2", values: [[1, 2]] } };
    },
  });
  const read = await readRange(client, { itemId: "x1", sheet: "Q1 2026", address: "A1:B2" });
  assert.equal(read.ok, true);
  assert.ok(paths[0].path.includes("/workbook/worksheets("), paths[0].path);
  assert.ok(paths[0].path.includes("/range(address="));

  await writeRange(client, { itemId: "x1", sheet: "S", address: "A1", values: [["v"]] });
  assert.equal(paths[1].method, "PATCH");
});

await test("appendRows scrive dopo l'ultima riga non vuota", async () => {
  const calls = [];
  const client = fakeClient({
    json: async (path, opts) => {
      calls.push({ path: String(path), method: opts?.method ?? "GET" });
      if (String(path).includes("usedRange")) {
        // 3 righe, l'ultima vuota: l'append deve partire dalla riga 3 (dopo la 2).
        return { ok: true, data: { values: [["a"], ["b"], [""]] } };
      }
      return { ok: true, data: { address: "A3:A4", values: [["c"], ["d"]] } };
    },
  });
  const out = await appendRows(client, { itemId: "x1", sheet: "S", rows: [["c"], ["d"]] });
  assert.equal(out.ok, true);
  assert.equal(calls[1].method, "PATCH");
  assert.ok(calls[1].path.includes("A3"), `indirizzo inatteso: ${calls[1].path}`);
});

console.log("\nPowerPoint · generazione");

await test("buildPresentation produce un .pptx valido", async () => {
  const bytes = await buildPresentation(
    [{ title: "Titolo", bullets: ["uno", "due"], notes: "nota" }],
    { title: "Deck" },
  );
  const zip = await JSZip.loadAsync(bytes);
  assert.ok(zip.file("ppt/presentation.xml"), "manca ppt/presentation.xml");
});

await test("buildPresentation rifiuta più slide del massimo", async () => {
  const slides = Array.from({ length: MAX_SLIDES + 1 }, () => ({ title: "x" }));
  await assert.rejects(() => buildPresentation(slides), /massimo/i);
});

console.log("\nOneNote · HTML e API");

await test("buildPageHtml impagina e fa escape del titolo", () => {
  const html = buildPageHtml("A < B", "<p>corpo</p>");
  assert.ok(html.includes("<title>A &lt; B</title>"));
  assert.ok(html.includes("<body><p>corpo</p></body>"));
});

await test("listNotebooks e listSections leggono value[]", async () => {
  const client = fakeClient({
    json: async (path) => {
      // Prima "sections": il path delle sezioni di un notebook contiene anche
      // "notebooks", quindi l'ordine dei controlli conta.
      if (String(path).includes("sections")) {
        return { ok: true, data: { value: [{ id: "s1", displayName: "Sezione" }] } };
      }
      return { ok: true, data: { value: [{ id: "n1", displayName: "Notebook" }] } };
    },
  });
  const nb = await listNotebooks(client);
  assert.equal(nb.ok, true);
  assert.equal(nb.data[0].displayName, "Notebook");
  const sec = await listSections(client, { notebookId: "n1" });
  assert.equal(sec.ok, true);
  assert.equal(sec.data[0].id, "s1");
});

await test("createPage manda text/html con il titolo nel body", async () => {
  let sent = null;
  const client = fakeClient({
    json: async (path, opts) => {
      sent = { path: String(path), body: opts?.body, contentType: opts?.headers?.["Content-Type"] };
      return { ok: true, data: { id: "p1", title: "Titolo", links: { oneNoteWebUrl: { href: "https://x/p1" } } } };
    },
  });
  const out = await createPage(client, { sectionId: "s1", title: "Titolo", html: "<p>x</p>" });
  assert.equal(out.ok, true);
  assert.equal(out.data.webUrl, "https://x/p1");
  assert.equal(sent.contentType, "text/html");
  assert.ok(sent.body.includes("<title>Titolo</title>"));
});

await test("appendToPage manda un PATCH con action=append", async () => {
  let sent = null;
  const client = {
    ...fakeClient(),
    request: async (path, opts) => {
      sent = { path: String(path), method: opts?.method, body: opts?.body };
      return { ok: true, status: 204, text: "" };
    },
  };
  const out = await appendToPage(client, { pageId: "p1", html: "<p>nuovo</p>" });
  assert.equal(out.ok, true);
  assert.equal(sent.method, "PATCH");
  const body = JSON.parse(sent.body);
  assert.equal(body[0].action, "append");
  assert.equal(body[0].target, "body");
});

await test("getPageContent restituisce l'HTML", async () => {
  const client = {
    ...fakeClient(),
    request: async () => ({ ok: true, status: 200, text: "<html>pagina</html>" }),
  };
  const out = await getPageContent(client, { pageId: "p1" });
  assert.equal(out.ok, true);
  assert.equal(out.data.html, "<html>pagina</html>");
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
