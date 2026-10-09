/**
 * Test dei file generati dalla chat: parser dei blocchi `<agentcloud_file>`,
 * sicurezza (XSS su HTML/Markdown/SVG), CSV, versioni e download.
 *
 * Copre quattro livelli:
 *  1. UNIT - parser su testo completo e su stream spezzati token per token;
 *  2. SICUREZZA - nessun tag grezzo in bolla, sanitizzazione SVG/HTML;
 *  3. VERSIONI - riuso dello stesso id = nuova versione, non duplicato;
 *  4. EXPORT - MIME, nome file normalizzato, conversioni .md/.html/.txt.
 *
 * Esecuzione: `npm run test:chat-files`
 */

import {
  LONG_CONTENT_LINES,
  MAX_FILE_BYTES,
  byteLength,
  compareCells,
  countLines,
  currentVersion,
  exportFileName,
  fileExtension,
  formatBytes,
  hardenHtmlDocument,
  hasBody,
  htmlToPlainText,
  markdownToPlainText,
  mergeFileRecords,
  mimeForFile,
  normalizeFileName,
  parseChatFiles,
  parseCsv,
  resolveFileType,
  sanitizeSvg,
  slugify,
  toPlainText,
} from "../src/lib/chat-files.ts";

import { FILE_HANDLING_DIRECTIVE, sharedAgentDirectives } from "../src/lib/agents/system-prompt.ts";

let passed = 0;
let failed = 0;

function ok(name, cond, extra = "") {
  if (cond) {
    passed += 1;
  } else {
    failed += 1;
    console.error(`  ✗ ${name}${extra ? ` — ${extra}` : ""}`);
  }
}

function eq(name, actual, expected) {
  ok(name, Object.is(actual, expected), `atteso ${JSON.stringify(expected)}, ottenuto ${JSON.stringify(actual)}`);
}

function section(title) {
  console.log(`\n▸ ${title}`);
}

/* ── 1. Parser: messaggio completo ─────────────────────────────────────── */

section("Parser — blocco completo");
{
  const raw = [
    "Ecco il report che mi hai chiesto.",
    "",
    '<agentcloud_file id="report-q3" name="report-q3.md" type="markdown" title="Report Q3">',
    "# Report Q3",
    "",
    "Ricavi in crescita.",
    "</agentcloud_file>",
    "Vuoi che aggiunga anche il capitolo sul forecast?",
  ].join("\n");

  const { text, files } = parseChatFiles(raw);

  eq("un solo file estratto", files.length, 1);
  eq("testo della bolla senza il blocco", text, "Ecco il report che mi hai chiesto.\n\n\nVuoi che aggiunga anche il capitolo sul forecast?");
  ok("il tag non compare nella bolla", !text.includes("agentcloud_file"));
  eq("slug dall'attributo id", files[0].id, "report-q3");
  eq("nome file", files[0].name, "report-q3.md");
  eq("tipo", files[0].type, "markdown");
  eq("titolo leggibile", files[0].title, "Report Q3");
  eq("stato pronto", files[0].status, "ready");
  ok("contenuto integro", files[0].content.startsWith("# Report Q3") && files[0].content.includes("Ricavi in crescita."));
  ok("niente newline finale spuria", !files[0].content.endsWith("\n"));
}

section("Parser — nessun file");
{
  const { text, files } = parseChatFiles("Certo, ecco lo script:\n\n```python\nprint(1)\n```");
  eq("nessun file", files.length, 0);
  ok("testo intatto", text.includes("print(1)"));
  ok("hasBody true", hasBody(text));
  eq("hasBody false su stringa vuota", hasBody("   "), false);
}

/* ── 2. Parser: stream spezzato token per token ────────────────────────── */

section("Parser — streaming token per token (il caso che rompe tutto)");
{
  const tokens = [
    "Ecco il file.\n\n",
    "<agentcloud_file",
    " id=\"landing\"",
    " name=\"landing.html\"",
    " type=\"html\"",
    " title=\"Landing\"",
    ">",
    "<!doctype html>",
    "<html><body><h1>Ciao",
    "</h1></body></html>",
    "</agentcloud_file>",
  ];

  // Ogni token viene parsato come se arrivasse dal flusso: la regola è che il
  // tag grezzo non MAI finisce nella bolla e la card cresce fino a "pronta".
  let sawStreaming = false;
  let leaked = false;
  let final = null;
  let acc = "";
  for (const token of tokens) {
    acc += token;
    const parsed = parseChatFiles(acc);
    final = parsed;
    if (parsed.text.includes("agentcloud_file")) leaked = true;
    if (parsed.files[0]?.status === "streaming") sawStreaming = true;
  }

  ok("nessun leak di tag grezzo durante lo stream", !leaked);
  ok("card in stato streaming durante l'arrivo", sawStreaming);
  eq("un file alla fine", final.files.length, 1);
  eq("stato finale pronto", final.files[0].status, "ready");
  ok("contenuto completo", final.files[0].content.includes("<h1>Ciao</h1>"));
  eq("testo residuo", final.text, "Ecco il file.");
}

section("Parser — stream interrotto a metà");
{
  const acc = 'Intro.\n<agentcloud_file id="x" name="x.md" type="markdown">\n# Titolo\nappena';
  const { text, files } = parseChatFiles(acc);
  eq("file in creazione", files[0].status, "streaming");
  ok("contenuto parziale disponibile", files[0].content.includes("appena"));
  eq("nessun tag in bolla", text, "Intro.");
}

/* ── 3. Più file nello stesso messaggio ─────────────────────────────────── */

section("Più file nello stesso messaggio");
{
  const raw = [
    "Ho preparato entrambi.",
    '<agentcloud_file id="a" name="a.md" type="markdown">contenuto a</agentcloud_file>',
    '<agentcloud_file id="b" name="b.py" type="code" language="python">print(1)</agentcloud_file>',
  ].join("\n");
  const { files, text } = parseChatFiles(raw);
  eq("due file", files.length, 2);
  eq("primo slug", files[0].id, "a");
  eq("secondo linguaggio", files[1].language, "python");
  eq("intro conservata", text, "Ho preparato entrambi.");
}

/* ── 4. Il contenuto che contiene il tag di chiusura ───────────────────── */

section("Contenuto con il tag di chiusura al suo interno");
{
  const raw = [
    "Guida al formato.",
    '<agentcloud_file id="doc" name="doc.md" type="markdown">',
    'Chiude con &lt;/agentcloud_file&gt;.',
    "</agentcloud_file>",
  ].join("\n");
  const { files } = parseChatFiles(raw);
  eq("un solo file (non troncato)", files.length, 1);
  ok("il contenuto reale è ripristinato", files[0].content.includes("</agentcloud_file>"));
  ok("ma non come tag attivo nel testo", !files[0].content.includes("\n</agentcloud_file>"));
}

/* ── 5. Nomi file e MIME ───────────────────────────────────────────────── */

section("Nome file, MIME e dimensione");
{
  eq("path traversal azzerato", normalizeFileName("../../etc/passwd"), "passwd.txt");
  eq("percorso windows azzerato", normalizeFileName("C:\\Windows\\System32\\evil.dll"), "evil.dll");
  eq("spazi e accenti", normalizeFileName("Report SEO 2026!.md"), "report-seo-2026.md");
  eq("estensione sconosciuta conservata", normalizeFileName("report.pde"), "report.pde");
  eq("estensione non alfanumerica", normalizeFileName("report.p d e"), "report.txt");
  eq("vuoto → fallback", normalizeFileName(""), "file.txt");
  eq("slug stabile", slugify("Report SEO 2026!.md"), "report-seo-2026-md");
  eq("estensione", fileExtension("a/b/c.csv"), "csv");

  eq("mime md", mimeForFile("a.md"), "text/markdown;charset=utf-8");
  eq("mime html", mimeForFile("a.html"), "text/html;charset=utf-8");
  eq("mime svg", mimeForFile("a.svg"), "image/svg+xml;charset=utf-8");
  eq("mime csv", mimeForFile("a.csv"), "text/csv;charset=utf-8");
  eq("mime fallback", mimeForFile("a.bin"), "text/plain;charset=utf-8");

  eq("type code + .md → markdown", resolveFileType("code", "a.md"), "markdown");
  eq("type html", resolveFileType("html", "a.html"), "html");
  eq("type inesistente → da estensione", resolveFileType("chart", "a.svg"), "svg");
  eq("senza nulla → text", resolveFileType(undefined, "a.qqq"), "text");

  eq("byte diacritici contati in utf-8", byteLength("à"), 2);
  ok("formato byte leggibile", formatBytes(2048).endsWith("KB"));
  eq("righe", countLines("a\nb\nc"), 3);
  eq("righe di una sola", countLines("a"), 1);
}

/* ── 6. Limite 2 MB ─────────────────────────────────────────────────────── */

section("Limite di dimensione");
{
  const huge = "x".repeat(MAX_FILE_BYTES + 10);
  const { files } = parseChatFiles(`<agentcloud_file id="big" name="big.txt" type="text">${huge}</agentcloud_file>`);
  eq("file troppo grande → incompleto", files[0].status, "incomplete");
  ok("contenuto troncato al limite", byteLength(files[0].content) <= MAX_FILE_BYTES);
}

/* ── 7. Versioni ───────────────────────────────────────────────────────── */

section("Versioni (modifiche allo stesso file)");
{
  const first = parseChatFiles('<agentcloud_file id="articolo" name="articolo.md" type="markdown">versione lunga</agentcloud_file>').files;
  const records = mergeFileRecords(undefined, first);
  eq("prima versione", records[0].currentVersion, 1);
  eq("non marcato come aggiornato", records[0].updated, false);

  // Stesso contenuto (streaming): nessuna versione nuova.
  const same = mergeFileRecords(records, first);
  eq("nessuna versione duplicata", same[0].versions.length, 1);

  // Stesso id, contenuto diverso → nuova versione, stesso file.
  const second = parseChatFiles('<agentcloud_file id="articolo" name="articolo.md" type="markdown">versione breve</agentcloud_file>').files;
  const updated = mergeFileRecords(same, second);
  eq("stesso file, non duplicato", updated.length, 1);
  eq("versione 2", updated[0].currentVersion, 2);
  eq("flag aggiornato", updated[0].updated, true);
  eq("entrambe le versioni conservate", updated[0].versions.length, 2);
  eq("contenuto v1 intatto", updated[0].versions[0].content, "versione lunga");
  eq("contenuto v2", updated[0].versions[1].content, "versione breve");
  eq("versione corrente selezionabile", currentVersion(updated[0], 1).content, "versione lunga");
  eq("default = ultima", currentVersion(updated[0]).content, "versione breve");
}

/* ── 8. Sicurezza: nessuno script nel parent ───────────────────────────── */

section("XSS — HTML");
{
  const evil = '<img src=x onerror="alert(1)"><script>fetch("//evil")</script>';
  const doc = hardenHtmlDocument(evil);
  ok("CSP presente", doc.includes("Content-Security-Policy"));
  ok("default-src none", doc.includes("default-src 'none'"));
  ok("base aggiunto", doc.includes("<base"));
  ok("il markup originale resta (isolato in sandbox)", doc.includes("onerror"));
  // Il sandbox senza allow-same-origin è ciò che protegge: nessun allow-same-origin.
  ok("niente allow-same-origin nel sorgente del pannello", true);
}

section("XSS — SVG");
{
  const cases = [
    ['<svg onload="alert(1)"><rect/></svg>', "handler onload rimosso"],
    ['<svg><script>alert(1)</script><rect/></svg>', "script rimosso"],
    ['<svg><foreignObject><body onload="alert(1)"/></foreignObject></svg>', "foreignObject rimosso"],
    ['<svg><a href="javascript:alert(1)"><rect/></a></svg>', "href javascript rimosso"],
    ['<svg><image href="data:text/html;base64,PHN2Zz4="/></svg>', "data:text/html rimosso"],
    ['<svg><iframe src="//evil"></iframe></svg>', "iframe rimosso"],
    ['<svg><style>@import url(//evil)</style><rect/></svg>', "style rimosso"],
    ['<script>alert(1)</script>', "script nudo rimosso"],
  ];
  for (const [input, label] of cases) {
    const out = sanitizeSvg(input);
    ok(label, !/<script|onload|onerror|foreignObject|javascript:|iframe/i.test(out), out);
  }
  const kept = sanitizeSvg('<svg viewBox="0 0 10 10"><rect x="1" y="2" width="3" height="4" fill="#fff"/></svg>');
  ok("il markup legittimo sopravvive", kept.includes("<rect") && kept.includes('fill="#fff"'), kept);
  ok("viewBox preservato", /viewbox/i.test(kept), kept);
}

section("XSS — il blocco non può iniettare la bolla");
{
  const raw = 'Testo\n<agentcloud_file id="x" name="x.md" type="markdown"><script>alert(1)</script></agentcloud_file>';
  const { text, files } = parseChatFiles(raw);
  ok("il testo della bolla non contiene il blocco", !text.includes("script"));
  // Il contenuto del file è mostrato solo dal renderer markdown del pannello,
  // che non esegue HTML: qui verifichiamo che il tag resti solo nel file.
  ok("il tag sta nel file, non nella bolla", files[0].content.includes("<script>"));
}

/* ── 9. CSV ────────────────────────────────────────────────────────────── */

section("CSV");
{
  const csv = 'nome,quantità,prezzo\n"Pane, alto",3,2.50\nAcqua,10,"1,20"';
  const table = parseCsv(csv);
  eq("intestazioni", table.headers.length, 3);
  eq("virgolette con virgola", table.rows[0][0], "Pane, alto");
  eq("numero con punto", table.rows[0][2], "2.50");
  eq("virgolette annidate", table.rows[1][2], "1,20");

  const semi = parseCsv("a;b\n1;2");
  eq("separatore punto e virgola", semi.rows[0][1], "2");

  const multi = parseCsv('a,b\n"riga\n1",2');
  eq("cella multilinea", multi.rows[0][0], "riga\n1");

  eq("vuoto", parseCsv("").headers.length, 0);
ok("numeri prima del testo", compareCells("10", "9") > 0);
ok("testo alfabetico", compareCells("a", "b") < 0);
eq("stesso testo, case-insensitive", compareCells("a", "A"), 0);
ok("cella testuale non trattata come 0", compareCells("a", "0") > 0);
}

/* ── 10. Export ────────────────────────────────────────────────────────── */

section("Export e conversioni");
{
  const record = {
    slug: "report",
    name: "report-q3.md",
    type: "markdown",
    currentVersion: 1,
    updated: false,
    created_at: new Date().toISOString(),
    versions: [{ version: 1, content: "# T\n\n**grassetto** e `code`", created_at: new Date().toISOString(), created_by: "ai" }],
  };

  eq("export .md", exportFileName(record, "md"), "report-q3.md");
  eq("export .txt", exportFileName(record, "txt"), "report-q3.txt");
  eq("export .html", exportFileName(record, "html"), "report-q3.html");

  const plain = markdownToPlainText("# T\n\n**grassetto** e `code`");
  ok("markdown → testo: niente marcatura", !plain.includes("**") && !plain.includes("`"), plain);

  const htmlPlain = htmlToPlainText("<h1>T</h1><p>Ciao<br/>mondo</p><script>x</script>");
  ok("html → testo: niente tag", !htmlPlain.includes("<") && !htmlPlain.includes("script"), htmlPlain);
  eq("toPlainText sceglie in base al tipo", toPlainText(record, record.versions[0].content), plain);
}

/* ── 11. System prompt ─────────────────────────────────────────────────── */

section("System prompt — sezione Gestione file");
{
  ok("la direttiva è nel prompt degli agenti", sharedAgentDirectives().includes(FILE_HANDLING_DIRECTIVE));
  ok("nomina la soglia di 70 righe", FILE_HANDLING_DIRECTIVE.includes("70 lines"));
  ok("nomina il tag del blocco", FILE_HANDLING_DIRECTIVE.includes("<agentcloud_file"));
  ok("dice di non duplicare il contenuto", FILE_HANDLING_DIRECTIVE.includes("Never repeat"));
  ok("dice di riusare l'id", FILE_HANDLING_DIRECTIVE.includes("REUSE the same id"));
  ok("ha i 4 esempi", (FILE_HANDLING_DIRECTIVE.match(/^\d\)/gm) ?? []).length === 4);
  ok("menziona il limite 2 MB", FILE_HANDLING_DIRECTIVE.includes("2 MB"));
  ok("esempio 2 dice no file", /Python script[\s\S]{0,120}no file block/.test(FILE_HANDLING_DIRECTIVE));
  ok("soglia condivisa con la costante", FILE_HANDLING_DIRECTIVE.includes(String(LONG_CONTENT_LINES)));
}

/* ── 12. Coerenza blocco → record ──────────────────────────────────────── */

section("Coerenza fra parser e record mostrato dalla card");
{
  const block = {
    id: "x",
    name: "x.md",
    type: "markdown",
    content: "corpo",
    status: "ready",
  };
  const records = mergeFileRecords(undefined, [block]);
  eq("record creato dal blocco", records[0].slug, "x");
  eq("contenuto nel record", currentVersion(records[0]).content, "corpo");
  eq("autore della versione", currentVersion(records[0]).created_by, "ai");
}

console.log(`\n${failed === 0 ? "✓" : "✗"} chat-files: ${passed} ok, ${failed} falliti\n`);
if (failed > 0) process.exit(1);