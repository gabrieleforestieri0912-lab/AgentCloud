/**
 * Convertitore Markdown → richieste batchUpdate della Google Docs API.
 *
 * Modulo puro: nessun import, nessun token, nessuna rete. Testabile in
 * isolamento (`node --experimental-strip-types`), a differenza del proxy che
 * vive in api-proxy.ts e tocca Supabase.
 *
 * Limiti dichiarati: gli stili inline non si annidano (un caso rarissimo nei
 * testi reali); le tabelle viaggiano in richieste `insertTable` dedicate (non
 * in questo convertitore di testo) perché l'indirizzamento delle celle è
 * strutturale e non calcolabile dagli offset del testo.
 */

export type DocsInlineSpan = {
  start: number;
  end: number;
  bold?: boolean;
  italic?: boolean;
  link?: string;
  code?: boolean;
};

export type DocsTextBlock = {
  kind: "heading" | "paragraph" | "bullet" | "numbered";
  level?: number;
  text: string;
  spans: DocsInlineSpan[];
};

export type DocsTableBlock = { kind: "table"; rows: string[][] };

export type DocsBlock = DocsTextBlock | DocsTableBlock;

export type DocsRequest = Record<string, unknown>;

/**
 * Parsing inline: **grassetto**, *corsivo*, [link](url), `codice`.
 * Restituisce il testo pulito e gli span con offset relativi all'inizio del
 * blocco. Il parsing è a scansione singola e non annida gli stili: meglio uno
 * stile perso che un crash del convertitore.
 */
function parseInlineSpans(src: string): { text: string; spans: DocsInlineSpan[] } {
  let text = "";
  const spans: DocsInlineSpan[] = [];
  let i = 0;
  const push = (raw: string, style: Omit<DocsInlineSpan, "start" | "end">) => {
    const start = text.length;
    text += raw;
    spans.push({ start, end: text.length, ...style });
  };
  while (i < src.length) {
    const rest = src.slice(i);
    let m: RegExpExecArray | null;
    // Link [testo](url)
    if (rest.startsWith("[") && (m = /^\[([^\]]+)\]\((https?:[^)\s]+)\)/.exec(rest))) {
      push(m[1], { link: m[2] });
      i += m[0].length;
      continue;
    }
    // Grassetto **testo**
    if (rest.startsWith("**") && (m = /^\*\*([^*]+)\*\*/.exec(rest))) {
      push(m[1], { bold: true });
      i += m[0].length;
      continue;
    }
    // Corsivo *testo*
    if (rest.startsWith("*") && (m = /^\*([^*]+)\*/.exec(rest))) {
      push(m[1], { italic: true });
      i += m[0].length;
      continue;
    }
    // Codice `testo`
    if (rest.startsWith("`") && (m = /^`([^`]+)`/.exec(rest))) {
      push(m[1], { code: true });
      i += m[0].length;
      continue;
    }
    text += src[i];
    i++;
  }
  return { text, spans };
}

function isTableRow(line: string): boolean {
  const t = line.trim();
  return t.startsWith("|") && t.endsWith("|") && t.includes("|", 1);
}

function isTableSeparator(line: string): boolean {
  return /^\|?[\s:|-]+\|?[\s:|.-]*$/.test(line.trim()) && line.includes("-");
}

function parseTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((c) => c.trim());
}

/**
 * Parsing a blocchi del Markdown supportato: titoli (#/##/###), elenchi
 * puntati (-/*), numerati (1.), tabelle (| a | b |) e paragrafi. Le righe vuote
 * separano i paragrafi; le righe di una tabella consecutiva formano un blocco.
 */
export function parseDocsMarkdown(markdown: string): DocsBlock[] {
  const blocks: DocsBlock[] = [];
  const lines = String(markdown ?? "").split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    // Tabella: righe |...| consecutive (con eventuale riga separatrice ---).
    if (isTableRow(line)) {
      const rows: string[][] = [];
      while (i < lines.length && (isTableRow(lines[i]) || isTableSeparator(lines[i]))) {
        if (!isTableSeparator(lines[i])) rows.push(parseTableRow(lines[i]));
        i++;
      }
      if (rows.length > 0) blocks.push({ kind: "table", rows });
      continue;
    }
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      const parsed = parseInlineSpans(heading[2].trim());
      blocks.push({ kind: "heading", level: heading[1].length, text: parsed.text, spans: parsed.spans });
      i++;
      continue;
    }
    const bullet = /^[-*]\s+(.*)$/.exec(line);
    if (bullet) {
      const parsed = parseInlineSpans(bullet[1].trim());
      blocks.push({ kind: "bullet", text: parsed.text, spans: parsed.spans });
      i++;
      continue;
    }
    const numbered = /^\d+[.)]\s+(.*)$/.exec(line);
    if (numbered) {
      const parsed = parseInlineSpans(numbered[1].trim());
      blocks.push({ kind: "numbered", text: parsed.text, spans: parsed.spans });
      i++;
      continue;
    }
    const parsed = parseInlineSpans(line.trim());
    blocks.push({ kind: "paragraph", text: parsed.text, spans: parsed.spans });
    i++;
  }
  return blocks;
}

/**
 * Converte blocchi di TESTO (niente tabelle) in richieste batchUpdate.
 * Il testo viene inserito in UN colpo a `baseIndex`; gli stili usano
 * `baseIndex + offset` perché il batch si applica in sequenza (prima
 * l'inserimento, poi gli stili sullo stato già aggiornato).
 */
export function textBlocksToDocsRequests(
  blocks: DocsTextBlock[],
  baseIndex: number,
): { requests: DocsRequest[]; insertedLength: number } {
  let plain = "";
  const styled: { req: DocsRequest }[] = [];
  const paraStyles: DocsRequest[] = [];
  for (const b of blocks) {
    const start = baseIndex + plain.length;
    plain += b.text + "\n";
    const end = baseIndex + plain.length - 1; // escluso \n finale
    if (b.kind === "heading") {
      const named = b.level === 1 ? "HEADING_1" : b.level === 2 ? "HEADING_2" : "HEADING_3";
      paraStyles.push({
        updateParagraphStyle: {
          range: { startIndex: start, endIndex: end },
          paragraphStyle: { namedStyleType: named },
          fields: "namedStyleType",
        },
      });
    } else if (b.kind === "bullet" || b.kind === "numbered") {
      paraStyles.push({
        createParagraphBullets: {
          range: { startIndex: start, endIndex: end },
          bulletPreset: b.kind === "bullet" ? "BULLET_DISC_CIRCLE_SQUARE" : "NUMBERED_DECIMAL_ALPHA_ROMAN",
        },
      });
    }
    for (const s of b.spans) {
      const range = { startIndex: start + s.start, endIndex: start + s.end };
      if (s.bold || s.italic || s.code) {
        styled.push({
          req: {
            updateTextStyle: {
              range,
              textStyle: {
                ...(s.bold ? { bold: true } : {}),
                ...(s.italic ? { italic: true } : {}),
                ...(s.code ? { fontSize: { magnitude: 10, unit: "PT" }, weightedFontFamily: { fontFamily: "Consolas" } } : {}),
              },
              fields: ["bold", "italic", "fontSize", "weightedFontFamily"].filter((f) =>
                s.bold
                  ? f === "bold"
                  : s.italic
                    ? f === "italic"
                    : f === "fontSize" || f === "weightedFontFamily",
              ).join(","),
            },
          },
        });
      }
      if (s.link) {
        styled.push({
          req: {
            updateTextStyle: {
              range,
              textStyle: { link: { url: s.link } },
              fields: "link",
            },
          },
        });
      }
    }
  }
  const requests: DocsRequest[] = [
    { insertText: { location: { index: baseIndex }, text: plain } },
    ...styled.map((s) => s.req),
    ...paraStyles,
  ];
  return { requests, insertedLength: plain.length };
}

/** Estrae il testo semplice da un documento (paragrafi + tabelle). */
export function docsBodyToText(doc: unknown, maxChars: number): { text: string; truncated: boolean } {
  const body = (doc as { body?: { content?: unknown[] } } | null)?.body?.content ?? [];
  const parts: string[] = [];
  const pushRunInto = (el: unknown, out: string[]) => {
    const e = el as Record<string, unknown>;
    if (e.paragraph && typeof e.paragraph === "object") {
      const elems = (e.paragraph as Record<string, unknown>).elements as unknown[] | undefined;
      for (const p of elems ?? []) {
        const tr = (p as Record<string, unknown>).textRun as Record<string, unknown> | undefined;
        if (tr && typeof tr.content === "string") out.push(tr.content);
      }
    }
  };
  for (const el of body) {
    const e = el as Record<string, unknown>;
    if (e.paragraph && typeof e.paragraph === "object") {
      pushRunInto(el, parts);
    } else if (e.table && typeof e.table === "object") {
      const rows = (e.table as Record<string, unknown>).tableRows as unknown[] | undefined;
      for (const r of rows ?? []) {
        const cells = (r as Record<string, unknown>).tableCells as unknown[] | undefined;
        const line = (cells ?? [])
          .map((c) => {
            const inner: string[] = [];
            const content = (c as Record<string, unknown>).content as unknown[] | undefined;
            for (const cc of content ?? []) pushRunInto(cc, inner);
            return inner.join("").replace(/\n+$/, "");
          })
          .join(" | ");
        parts.push(line + "\n");
      }
    }
  }
  const full = parts.join("").replace(/\n{3,}/g, "\n\n");
  if (full.length <= maxChars) return { text: full, truncated: false };
  return { text: full.slice(0, maxChars), truncated: true };
}
