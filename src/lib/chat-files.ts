/**
 * File generati dalla chat: parsing dei blocchi `<agentcloud_file>`, sicurezza
 * e utility di rendering condivise da FileCard, PreviewPanel e API.
 *
 * Il modello emette il blocco strutturato dentro il normale messaggio:
 *
 *   <agentcloud_file id="slug" name="report.md" type="markdown" title="Titolo">
 *   ...contenuto...
 *   </agentcloud_file>
 *
 * Il parser è stream-safe: va chiamato a ogni token e deve distinguere
 * tre situazioni senza mai mostrare il tag grezzo in chat.
 */

/* ── Tipi ─────────────────────────────────────────────────────────────── */

export type ChatFileType = "markdown" | "html" | "code" | "csv" | "svg" | "text";

/** Stati mostrati dalla card: in creazione, pronta, interrotta, aggiornata. */
export type ChatFileStatus = "streaming" | "ready" | "incomplete";

export interface ChatFileBlock {
  /** Slug univoco: se il modello riusa lo stesso id si tratta di una nuova versione. */
  id: string;
  name: string;
  type: ChatFileType;
  language?: string;
  title?: string;
  content: string;
  status: ChatFileStatus;
}

export interface ParsedChatMessage {
  /** Testo da mostrare nella bolla, senza i blocchi file. */
  text: string;
  files: ChatFileBlock[];
}

export interface ChatFileVersion {
  version: number;
  content: string;
  created_at: string;
  created_by: "ai" | "user";
}

/** Come viene salvato un file lato client (localStorage) e lato DB. */
export interface ChatFileRecord {
  slug: string;
  name: string;
  type: ChatFileType;
  language?: string;
  title?: string;
  currentVersion: number;
  updated: boolean;
  created_at: string;
  versions: ChatFileVersion[];
}

/* ── Limiti ───────────────────────────────────────────────────────────── */

/** Oltre 2 MB il file non viene creato: l'anteprima e il download si fermano. */
export const MAX_FILE_BYTES = 2 * 1024 * 1024;

/** Soglia oltre la quale il modello è invitato a produrre un file (§1 del prompt). */
export const LONG_CONTENT_LINES = 70;

const OPEN_TAG_RE = /<agentcloud_file\b([^>]*)>/i;
const ATTR_RE = /([a-zA-Z_][a-zA-Z0-9_-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
const TYPE_BY_EXT: Record<string, ChatFileType> = {
  md: "markdown", markdown: "markdown", mdx: "markdown",
  html: "html", htm: "html",
  csv: "csv", tsv: "csv",
  svg: "svg",
  txt: "text", log: "text", json: "text", yaml: "text", yml: "text",
};

/* ── Nomi file ────────────────────────────────────────────────────────── */

/**
 * Nome file sicuro: kebab-case, niente path traversal, niente caratteri
 * speciali, estensione conservata. Fallback `file.txt` se non è ricostruibile.
 */
export function normalizeFileName(raw: string, fallback = "file.txt"): string {
  const base = (raw || "")
    .split(/[\\/]/)
    .pop()!
    .trim();
  const dot = base.lastIndexOf(".");
  const ext = dot > 0 ? base.slice(dot + 1).toLowerCase() : "";
  const stemRaw = dot > 0 ? base.slice(0, dot) : base;
  const stem = stemRaw
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  const safeExt = /^[a-z0-9]{1,10}$/.test(ext) ? ext : "";
  if (!stem) return fallback;
  return safeExt ? `${stem}.${safeExt}` : `${stem}.txt`;
}

/** Slug stabile per id/debounce: `Report SEO 2026!.md` → `report-seo-2026-md`. */
export function slugify(raw: string, fallback = "file"): string {
  const slug = (raw || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return slug || fallback;
}

export function fileExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
}

const VALID_TYPES = new Set<ChatFileType>(["markdown", "html", "code", "csv", "svg", "text"]);

/**
 * Tipo dichiarato dal modello, corretto con l'estensione quando il tipo è
 * generico: `type="code"` + `report.md` → markdown, perché è l'estensione a
 * decidere il MIME type del download.
 */
export function resolveFileType(type: string | undefined, name: string): ChatFileType {
  const declared = (type || "").trim().toLowerCase() as ChatFileType;
  const fromExt = TYPE_BY_EXT[fileExtension(name)];
  if (VALID_TYPES.has(declared)) {
    return declared === "text" || declared === "code" ? fromExt ?? declared : declared;
  }
  return fromExt ?? "text";
}

export function mimeForFile(name: string, type?: string): string {
  const ext = fileExtension(name);
  switch (ext) {
    case "md": case "markdown": return "text/markdown;charset=utf-8";
    case "html": case "htm": return "text/html;charset=utf-8";
    case "svg": return "image/svg+xml;charset=utf-8";
    case "csv": return "text/csv;charset=utf-8";
    case "json": return "application/json;charset=utf-8";
    case "js": return "text/javascript;charset=utf-8";
    case "css": return "text/css;charset=utf-8";
    default:
      break;
  }
  if (type === "markdown") return "text/markdown;charset=utf-8";
  if (type === "html") return "text/html;charset=utf-8";
  if (type === "svg") return "image/svg+xml;charset=utf-8";
  if (type === "csv") return "text/csv;charset=utf-8";
  return "text/plain;charset=utf-8";
}

export function byteLength(content: string): number {
  return new TextEncoder().encode(content).length;
}

export function countLines(content: string): number {
  if (!content) return 0;
  return content.replace(/\n$/, "").split("\n").length;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* ── Parsing dei blocchi ──────────────────────────────────────────────── */

function readAttributes(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  ATTR_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ATTR_RE.exec(raw)) !== null) {
    attrs[m[1].toLowerCase()] = decodeEntities((m[2] ?? m[3] ?? "").trim());
  }
  return attrs;
}

function decodeEntities(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

/**
 * Chiusura escapata: se il contenuto di un file deve contenere il tag
 * `<agentcloud_file>` (es. documentazione sul formato), il modello scrive
 * `&lt;/agentcloud_file&gt;` e noi lo riportiamo al testo reale in fase di
 * download/anteprima. È il delimitatore robusto del parser: il contenuto
 * termina sempre al primo `</agentcloud_file>` non escapato.
 */
const CLOSING_ESCAPED = /&lt;\/?agentcloud_file&gt;/gi;

function unescapeContent(content: string): string {
  CLOSING_ESCAPED.lastIndex = 0;
  if (!CLOSING_ESCAPED.test(content)) return content;
  CLOSING_ESCAPED.lastIndex = 0;
  return content
    .replace(/&lt;\/agentcloud_file&gt;/gi, "</agentcloud_file>")
    .replace(/&lt;agentcloud_file\b/gi, "<agentcloud_file");
}

/**
 * Estrae i blocchi file da un testo (completo o in streaming).
 *
 * Regole:
 *  - il testo della bolla non contiene mai `<agentcloud_file>`;
 *  - un blocco senza chiusura è `streaming` e cresce a ogni token;
 *  - un tag di apertura appena iniziato (`<agentcloud_`) è già "nascosto":
 *    non compare nella bolla finché i suoi attributi non sono leggibili.
 */
export function parseChatFiles(raw: string): ParsedChatMessage {
  const text = raw ?? "";
  const files: ChatFileBlock[] = [];
  let plain = "";
  let cursor = 0;

  for (;;) {
    const rest = text.slice(cursor);
    const open = OPEN_TAG_RE.exec(rest);
    // Apertura incompleta: niente bolla, niente card finché gli attributi non ci sono.
    const partialIndex = rest.indexOf("<agentcloud_file");
    if (!open) {
      if (partialIndex !== -1) plain += rest.slice(0, partialIndex);
      else plain += rest;
      break;
    }
    const openIndex = cursor + open.index;
    if (partialIndex !== -1 && partialIndex < open.index) {
      plain += rest.slice(0, partialIndex);
      break;
    }

    plain += rest.slice(0, open.index);
    const afterOpen = openIndex + open[0].length;
    const closeIndex = text.indexOf("</agentcloud_file>", afterOpen);
    const body = closeIndex === -1 ? text.slice(afterOpen) : text.slice(afterOpen, closeIndex);
    const complete = closeIndex !== -1;

    const attrs = readAttributes(open[1] ?? "");
    const name = normalizeFileName(attrs.name ?? attrs.title ?? "");
    const content = body.replace(/^\n/, "").replace(/\s+$/, "");
    const tooBig = byteLength(content) > MAX_FILE_BYTES;

    files.push({
      id: slugify(attrs.id || name),
      name,
      type: resolveFileType(attrs.type, name),
      language: attrs.language || undefined,
      title: attrs.title || undefined,
      content: tooBig ? content.slice(0, MAX_FILE_BYTES) : unescapeContent(content),
      status: complete ? (tooBig ? "incomplete" : "ready") : "streaming",
    });

    if (!complete) break;
    cursor = closeIndex + "</agentcloud_file>".length;
  }

  return { text: plain.trim(), files };
}

/** Il testo è "solo file" quando il blocco occupa tutto il messaggio. */
export function hasBody(text: string): boolean {
  return text.trim().length > 0;
}

/**
 * Applica un blocco appena arrivato allo storico: riusa lo stesso slug per
 * creare una versione nuova invece di duplicare il file (§6 del prompt).
 */
export function mergeFileRecords(
  existing: ChatFileRecord[] | undefined,
  incoming: ChatFileBlock[],
  conversationCreatedAt?: string,
): ChatFileRecord[] {
  const base = existing ? existing.map((f) => ({ ...f })) : [];
  for (const block of incoming) {
    const found = base.find((f) => f.slug === block.id);
    if (found) {
      const last = found.versions[found.versions.length - 1];
      if (last && last.content === block.content) {
        // Streaming ancora sullo stesso contenuto: nessuna versione nuova.
        found.currentVersion = last.version;
        continue;
      }
      found.currentVersion = (found.currentVersion || 0) + 1;
      found.name = block.name || found.name;
      found.type = block.type;
      found.language = block.language ?? found.language;
      found.title = block.title ?? found.title;
      found.updated = true;
      found.versions = [
        ...found.versions,
        { version: found.currentVersion, content: block.content, created_at: new Date().toISOString(), created_by: "ai" },
      ];
    } else {
      base.push({
        slug: block.id,
        name: block.name,
        type: block.type,
        language: block.language,
        title: block.title,
        currentVersion: 1,
        updated: false,
        created_at: conversationCreatedAt || new Date().toISOString(),
        versions: [{ version: 1, content: block.content, created_at: new Date().toISOString(), created_by: "ai" }],
      });
    }
  }
  return base;
}

/** Versione attualmente selezionata (ultima se non indicata). */
export function currentVersion(record: ChatFileRecord, selected?: number): ChatFileVersion {
  const found = record.versions.find((v) => v.version === selected);
  return found ?? record.versions[record.versions.length - 1];
}

/* ── Conversione per "Scarica come…" ──────────────────────────────────── */

/** Markdown → testo semplice (nessun markup residuo). */
export function markdownToPlainText(md: string): string {
  return md
    .replace(/```[\w-]*\n?([\s\S]*?)```/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s{0,3}>\s?/gm, "")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/^\s*[-*+]\s+/gm, "• ")
    .replace(/^\s*\d+\.\s+/gm, (n) => n.replace(/\d+\./, "•"))
    .replace(/^\s*\|.*\|\s*$/gm, (row) => row.replace(/\|/g, " ").trim())
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** HTML → testo semplice, per l'export .txt. */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function toPlainText(record: ChatFileRecord, content: string): string {
  if (record.type === "html") return htmlToPlainText(content);
  if (record.type === "markdown" || record.type === "code") return markdownToPlainText(content);
  return content;
}

/** Nome per l'export in un altro formato, senza perdere l'estensione originale. */
export function exportFileName(record: ChatFileRecord, format: "md" | "html" | "txt"): string {
  const stem = record.name.replace(/\.[^.]+$/, "") || "file";
  return `${stem}.${format}`;
}

/* ── Sicurezza: HTML in iframe isolato ─────────────────────────────────── */

export const HTML_PREVIEW_CSP =
  "default-src 'none'; img-src data: blob:; media-src data: blob:; " +
  "style-src 'unsafe-inline'; script-src 'unsafe-inline'; font-src data:;";

/**
 * Inietta una CSP restrittiva nel documento prima di mostrarlo in iframe.
 * `sandbox="allow-scripts"` (senza `allow-same-origin`) dà origine opaca:
 * nessun accesso a cookie, storage o sessione di AgentCloud.
 */
export function hardenHtmlDocument(html: string): string {
  const meta = `<meta http-equiv="Content-Security-Policy" content="${HTML_PREVIEW_CSP}">`;
  const base = /<base\s/i.test(html) ? "" : `<base target="_blank">`;
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (m) => `${m}${meta}${base}`);
  }
  if (/<html[^>]*>/i.test(html)) {
    return html.replace(/<html[^>]*>/i, (m) => `${m}<head>${meta}${base}</head>`);
  }
  return `<!doctype html><html><head><meta charset="utf-8">${meta}${base}</head><body>${html}</body></html>`;
}

/* ── Sicurezza: SVG ───────────────────────────────────────────────────── */

const SVG_ALLOWED_TAGS = new Set([
  "svg", "g", "defs", "symbol", "use", "title", "desc", "path", "rect", "circle",
  "ellipse", "line", "polyline", "polygon", "text", "tspan", "textPath", "linearGradient",
  "radialGradient", "stop", "clipPath", "mask", "pattern", "marker", "filter",
  "feGaussianBlur", "feOffset", "feBlend", "feMerge", "feMergeNode", "feColorMatrix",
  "feDropShadow", "switch", "metadata",
]);
const SVG_DROP_TAGS = ["script", "foreignObject", "iframe", "object", "embed", "handler", "audio", "video"];
const SVG_ALLOWED_ATTRS = new Set([
  "xmlns", "viewbox", "width", "height", "x", "y", "x1", "y1", "x2", "y2", "cx", "cy",
  "r", "rx", "ry", "d", "points", "transform", "fill", "fill-opacity", "fill-rule",
  "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "stroke-dasharray",
  "stroke-dashoffset", "stroke-opacity", "opacity", "stroke-miterlimit", "font-family",
  "font-size", "font-weight", "font-style", "text-anchor", "dominant-baseline",
  "letter-spacing", "offset", "stop-color", "stop-opacity", "gradientUnits",
  "gradienttransform", "spreadmethod", "patternunits", "clippathunits", "maskunits",
  "markerwidth", "markerheight", "refx", "refy", "orient", "result", "in", "in2",
  "stddeviation", "dx", "dy", "mode", "type", "values", "flood-color", "flood-opacity",
  "id", "class", "transform-origin", "vector-effect", "preserveaspectratio", "version",
  "xmlns:xlink", "xlink:href", "href", "startoffset", "textlength", "lengthadjust",
]);

/**
 * Sanitizzatore SVG in allowlist, puro (no DOM) così è testabile anche in
 * Node. Rimuove tag vietati, handler `on*`, `href` pericolosi e `<style>`.
 */
export function sanitizeSvg(svg: string): string {
  let out = svg ?? "";
  for (const tag of SVG_DROP_TAGS) {
    out = out.replace(new RegExp(`<${tag}\\b[\\s\\S]*?(?:</${tag}>|/>)`, "gi"), "");
    out = out.replace(new RegExp(`</?${tag}\\b[^>]*>`, "gi"), "");
  }
  return out.replace(/<([a-zA-Z][a-zA-Z0-9:-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g, (match, rawName, rawAttrs) => {
    const name = String(rawName).toLowerCase();
    if (!SVG_ALLOWED_TAGS.has(name)) return "";
    const attrs: string[] = [];
    const attrRe = /([a-zA-Z_:][a-zA-Z0-9_.:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
    let m: RegExpExecArray | null;
    while ((m = attrRe.exec(String(rawAttrs))) !== null) {
      const attr = m[1].toLowerCase();
      const value = m[2] ?? m[3] ?? "";
      if (attr.startsWith("on")) continue;
      if (!SVG_ALLOWED_ATTRS.has(attr)) continue;
      if ((attr === "href" || attr === "xlink:href") && /^\s*(javascript|data:text\/html|vbscript)/i.test(value)) continue;
      attrs.push(`${m[1]}="${value.replace(/"/g, "&quot;")}"`);
    }
    const selfClosing = /\/\s*$/.test(String(rawAttrs));
    return `<${name}${attrs.length ? " " + attrs.join(" ") : ""}${selfClosing ? " /" : ""}>`;
  });
}

/* ── CSV ──────────────────────────────────────────────────────────────── */

export interface CsvTable {
  headers: string[];
  rows: string[][];
}

/**
 * Parser CSV minimale con gestione delle virgolette e delle celle multilinea
 * (`"a\nb"`), separatore `,` o `;` o tab, come da RFC 4180.
 */
export function parseCsv(text: string, delimiter?: string): CsvTable {
  const src = (text ?? "").replace(/\r\n?/g, "\n");
  const firstLine = src.split("\n")[0] ?? "";
  const looksSemicolon =
    firstLine.includes(";") && !firstLine.includes(",") &&
    (firstLine.split(";").length > firstLine.split(",").length);
  const sep = delimiter ?? (looksSemicolon ? ";" : ",");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      quoted = true;
    } else if (ch === sep) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  const clean = rows.filter((r) => r.some((c) => c.trim() !== ""));
  if (clean.length === 0) return { headers: [], rows: [] };
  const headers = clean[0].map((h, i) => h.trim() || `colonna ${i + 1}`);
  const body = clean.slice(1).map((r) => headers.map((_, i) => (r[i] ?? "").trim()));
  return { headers, rows: body };
}

/** Indice di ordinamento stabile: numeri prima, testo dopo, case-insensitive. */
export function compareCells(a: string, b: string): number {
  // Numerico solo se, ripulito, resta almeno una cifra: altrimenti una cello
  // testuale diventerebbe 0 e finirebbe ordinata come un numero.
  const digits = (v: string) => /\d/.test(v.replace(/[^\d,.-]/g, ""));
  const na = Number(a.replace(/[^\d,.-]/g, "").replace(",", "."));
  const nb = Number(b.replace(/[^\d,.-]/g, "").replace(",", "."));
  const aNum = a.trim() !== "" && digits(a) && Number.isFinite(na);
  const bNum = b.trim() !== "" && digits(b) && Number.isFinite(nb);
  if (aNum && bNum) return na - nb;
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}