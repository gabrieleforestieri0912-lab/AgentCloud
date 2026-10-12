/**
 * Parser markdown minimale usato nelle bolle della chat.
 *
 * Perché esiste e come funziona: è volutamente senza dipendenze esterne e
 * tollerante verso input incompleti. La chat dell'hero streamma il testo a
 * pezzi (chunk SSE / effetto macchina da scrivere): mentre il messaggio sta
 * ancora arrivando può contenere un `**` non ancora chiuso. In quel caso il
 * marcatore pendente viene mostrato come testo letterale invece di rompere
 * l'interfaccia.
 *
 * Sintassi supportata:
 *   - titoli `#` / `##` / `###`
 *   - `**grassetto**`, `*corsivo*`, `` `codice` `` inline
 *   - link `[etichetta](https://…)` e URL nudi `https://…` (cliccabili nella UI)
 *   - elenchi puntati (`• `, `- `, `* `) e numerati (`1. `, `2) `)
 *   - tabelle GFM (`| a | b |` + riga `|---|---|` + righe)
 *   - paragrafi separati da righe vuote
 *   - blocchi di codice fenced (```lang) con bottone "Copia" nella UI
 */

export type InlineSegment =
  | { type: "text"; value: string }
  | { type: "bold"; value: string }
  | { type: "italic"; value: string }
  | { type: "code"; value: string }
  | { type: "link"; label: string; url: string };

export type MarkdownList = {
  marker: string;
  segments: InlineSegment[];
}[];

export type MarkdownTable = {
  headers: InlineSegment[][];
  /** "left" | "center" | "right" per colonna (dal delimiter `|:---|:---:|---:|`). */
  aligns: ("left" | "center" | "right")[];
  rows: InlineSegment[][][];
};

export type MarkdownBlock =
  | { type: "paragraph"; segments: InlineSegment[] }
  | { type: "heading"; level: 1 | 2 | 3; segments: InlineSegment[] }
  | { type: "list"; items: MarkdownList }
  | { type: "table"; table: MarkdownTable }
  /** Blocco fenced (```lang … ```): `value` è il codice grezzo, senza i delimitatori. */
  | { type: "code"; lang: string; value: string };

/**
 * Analizza i marcatori inline (`**grassetto**`, `*corsivo*`, `` `codice` ``,
 * `[etichetta](url)` e URL nudi `https://…`) trasformandoli in segmenti
 * tipizzati.
 *
 * Marcatori non chiusi (messaggio ancora in streaming): il `**` di apertura
 * non deve mai mostrarsi come asterisco letterale — durante lo streaming il
 * `**` di chiusura arriva qualche token dopo e l'utente vedrebbe
 * "**parola" lampeggiare. Quindi un `**` senza chiusura rende il resto
 * grassetto (speculativo), un `*` di apertura evidente (inizio parola) rende
 * il resto corsivo, un backtick senza chiusura rende il resto codice. Un `*`
 * isolato tipo "5 * 3" resta invece testo letterale.
 */
export function parseInline(text: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  let plain = "";
  let i = 0;

  const flush = () => {
    if (plain) {
      segments.push({ type: "text", value: plain });
      plain = "";
    }
  };

  // Chiude un URL nudo togliendo la punteggiatura finale di frase.
  const trimUrlTail = (url: string): { url: string; tail: string } => {
    let tail = "";
    while (url.length > 0 && /[.,;:!?)\]}>"]/.test(url[url.length - 1])) {
      tail = url[url.length - 1] + tail;
      url = url.slice(0, -1);
    }
    return { url, tail };
  };

  while (i < text.length) {
    const ch = text[i];

    // Link markdown [etichetta](url) — prima del resto così i marcatori
    // dentro l'etichetta o l'URL non vengono interpretati.
    if (ch === "[") {
      const closeLabel = text.indexOf("]", i + 1);
      const openParen =
        closeLabel !== -1 && text[closeLabel + 1] === "("
          ? closeLabel + 1
          : -1;
      const closeParen =
        openParen !== -1 ? text.indexOf(")", openParen + 1) : -1;
      if (closeLabel !== -1 && openParen !== -1 && closeParen !== -1) {
        const label = text.slice(i + 1, closeLabel);
        const rawUrl = text.slice(openParen + 1, closeParen).trim();
        if (label.length > 0 && /^https?:\/\/\S+$/.test(rawUrl)) {
          flush();
          segments.push({ type: "link", label, url: rawUrl });
          i = closeParen + 1;
          continue;
        }
      }
    }

    // URL nudi https://… / http://… / www.… → link cliccabile.
    if (
      text.startsWith("https://", i) ||
      text.startsWith("http://", i) ||
      text.startsWith("www.", i)
    ) {
      let j = i;
      while (j < text.length && !/[\s<>"'`\]\)]/.test(text[j])) j++;
      const { url, tail } = trimUrlTail(text.slice(i, j));
      if (url.length > (text.startsWith("www.", i) ? 4 : 8)) {
        flush();
        const href = text.startsWith("www.", i) ? `https://${url}` : url;
        segments.push({ type: "link", label: url, url: href });
        plain += tail;
        i = j;
        continue;
      }
    }

    if (ch === "*") {
      const isDouble = text[i + 1] === "*";
      const marker = isDouble ? "**" : "*";
      const closeIdx = text.indexOf(marker, i + marker.length);
      if (closeIdx !== -1) {
        flush();
        segments.push({
          type: isDouble ? "bold" : "italic",
          value: text.slice(i + marker.length, closeIdx),
        });
        i = closeIdx + marker.length;
        continue;
      }
      // Nessun marcatore di chiusura (risposta ancora in streaming):
      // mai mostrare gli asterischi letterali.
      const rest = text.slice(i + marker.length);
      if (isDouble) {
        // "**parola in arrivo" → resto grassetto, marcatori nascosti.
        if (/^\S/.test(rest)) {
          flush();
          segments.push({ type: "bold", value: rest });
          break;
        }
        plain += ch;
        i += 1;
        continue;
      }
      // "*" singolo: solo se sembra davvero un'apertura di corsivo
      // (a inizio testo o dopo spazio/parantesi, seguita da lettera).
      const prev = i === 0 ? " " : text[i - 1];
      if (
        /^\S/.test(rest) &&
        /[\s\(\[{>"']/.test(prev) &&
        /[A-Za-zÀ-ÿ0-9]/.test(rest[0])
      ) {
        flush();
        segments.push({ type: "italic", value: rest });
        break;
      }
      plain += ch;
      i += 1;
      continue;
    }

    if (ch === "`") {
      const closeIdx = text.indexOf("`", i + 1);
      if (closeIdx !== -1) {
        flush();
        segments.push({ type: "code", value: text.slice(i + 1, closeIdx) });
        i = closeIdx + 1;
        continue;
      }
      // Backtick senza chiusura (streaming): resto come codice, senza mostrare `.
      const rest = text.slice(i + 1);
      if (rest.length > 0) {
        flush();
        segments.push({ type: "code", value: rest });
        break;
      }
      plain += ch;
      i += 1;
      continue;
    }

    plain += ch;
    i += 1;
  }

  flush();
  return segments;
}

const HEADING_RE = /^(#{1,3})\s+(.*)$/;
const BULLET_RE = /^\s*(?:[•\-*])\s+(.*)$/;
const ORDERED_RE = /^\s*(\d+)[.)]\s+(.*)$/;

/** Riga delimiter GFM: `|---|---|`, `|:---|:---:|---:|`, anche senza pipe esterni. */
const TABLE_DELIMITER_RE = /^\s*\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)+\|?\s*$/;

/** Split di una riga tabella su `|`, tollerando pipe esterni mancanti e celle vuote. */
function splitTableRow(line: string): string[] {
  let s = line.trim();
  // Rimuove UN solo pipe esterno per lato (i doppi interni restano celle vuote).
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|")) s = s.slice(0, -1);
  return s.split("|").map((c) => c.trim());
}

/** True se la riga può essere una riga di tabella (almeno 2 celle separate da `|`). */
function isTableRow(line: string): boolean {
  if (!line.includes("|")) return false;
  // Evita falsi positivi tipo "a|b" dentro un paragrafo: serve struttura da tabella.
  const t = line.trim();
  if (t.startsWith("|") || t.endsWith("|")) return splitTableRow(line).length >= 1;
  return splitTableRow(line).length >= 2;
}

function parseDelimiterAlign(line: string): ("left" | "center" | "right")[] {
  return splitTableRow(line).map((cell) => {
    const c = cell.trim();
    const left = c.startsWith(":");
    const right = c.endsWith(":");
    if (left && right) return "center";
    if (right) return "right";
    return "left";
  });
}

/**
 * Analizza un messaggio in elementi a livello di blocco: paragrafi, titoli ed
 * elenchi. Le righe vuote separano i blocchi; le righe di testo consecutive
 * vengono unite con uno spazio per ricostruire i paragrafi.
 */
export function parseMarkdown(text: string): MarkdownBlock[] {
  const lines = text.split("\n");
  const blocks: MarkdownBlock[] = [];
  let paragraph: InlineSegment[] = [];
  let listItems: MarkdownList | null = null;
  // Stato del blocco fenced: dentro un fence le righe sono codice grezzo e
  // non vengono interpretate (né titoli, né elenchi, né paragrafi uniti).
  let inCode = false;
  let codeLang = "";
  let codeLines: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({ type: "paragraph", segments: paragraph });
      paragraph = [];
    }
  };

  const flushList = () => {
    if (listItems) {
      blocks.push({ type: "list", items: listItems });
      listItems = null;
    }
  };

  for (let li = 0; li < lines.length; li++) {
    const rawLine = lines[li];
    // Dentro un fence ogni riga (incluse le vuote) è contenuto del codice.
    if (inCode) {
      if (/^\s*```/.test(rawLine)) {
        blocks.push({ type: "code", lang: codeLang, value: codeLines.join("\n") });
        inCode = false;
        codeLang = "";
        codeLines = [];
      } else {
        codeLines.push(rawLine);
      }
      continue;
    }

    const line = rawLine.trimEnd();

    if (line.trim() === "") {
      flushParagraph();
      flushList();
      continue;
    }

    // Apertura di un blocco fenced: ``` oppure ```lang. Tollerante verso lo
    // streaming — un fence mai chiuso viene comunque emesso alla fine.
    const fence = line.match(/^\s*```([^\s`]*)/);
    if (fence) {
      flushParagraph();
      flushList();
      inCode = true;
      codeLang = fence[1];
      codeLines = [];
      continue;
    }

    // Tabella GFM: riga header + riga delimiter (`|---|---|`) + righe corpo
    // consecutive. Il delimiter è obbligatorio: senza, una riga con `|` resta
    // testo normale (evita falsi positivi e resta streaming-safe: una tabella
    // a metà stream senza delimiter non si rompe, si mostra come testo).
    if (isTableRow(line)) {
      const nextLine = li + 1 < lines.length ? lines[li + 1].trimEnd() : "";
      if (TABLE_DELIMITER_RE.test(nextLine.trim())) {
        flushParagraph();
        flushList();
        const headerCells = splitTableRow(line);
        const aligns = parseDelimiterAlign(nextLine);
        const colCount = Math.max(headerCells.length, aligns.length);
        const normAligns: ("left" | "center" | "right")[] = Array.from(
          { length: colCount },
          (_, i) => aligns[i] ?? "left",
        );
        const normRow = (cells: string[]): InlineSegment[][] =>
          Array.from({ length: colCount }, (_, i) => parseInline(cells[i] ?? ""));
        const headers = normRow(headerCells);
        const rows: InlineSegment[][][] = [];
        li += 2; // salta header + delimiter
        while (li < lines.length) {
          const bodyLine = lines[li].trimEnd();
          if (bodyLine.trim() === "" || /^\s*```/.test(bodyLine)) break;
          if (!isTableRow(bodyLine)) break;
          // Una riga delimiter inattesa chiude la tabella (non la ingoia).
          if (TABLE_DELIMITER_RE.test(bodyLine.trim())) break;
          rows.push(normRow(splitTableRow(bodyLine)));
          li++;
        }
        li--; // il for avanza di uno: riprocessa la riga di stop (vuota/fence/testo)
        blocks.push({ type: "table", table: { headers, aligns: normAligns, rows } });
        continue;
      }
    }

    const heading = line.match(HEADING_RE);
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push({
        type: "heading",
        level: heading[1].length as 1 | 2 | 3,
        segments: parseInline(heading[2]),
      });
      continue;
    }

    const bullet = line.match(BULLET_RE);
    const ordered = bullet ? null : line.match(ORDERED_RE);
    if (bullet || ordered) {
      flushParagraph();
      listItems ??= [];
      listItems.push({
        marker: bullet ? "•" : `${ordered![1]}.`,
        segments: parseInline(bullet ? bullet[1] : ordered![2]),
      });
      continue;
    }

    if (listItems) flushList();
    if (paragraph.length > 0) {
      paragraph.push({ type: "text", value: " " });
    }
    paragraph.push(...parseInline(line));
  }

  flushParagraph();
  flushList();
  // Fence non ancora chiuso (risposta ancora in streaming): mostra comunque
  // il codice ricevuto finora dentro un blocco.
  if (inCode) {
    blocks.push({ type: "code", lang: codeLang, value: codeLines.join("\n") });
  }
  return blocks;
}

/**
 * Inserisce un a capo dopo ogni frase (`. ` + maiuscola/numero) così le risposte
 * dell'AI spezzano le frasi su righe separate, come voleva la chat.
 *
 * Applicato SOLO fuori dai blocchi fenced, dalle tabelle GFM, dai marcatori
 * inline e dai link: dentro il codice `console.log("Hi. Ok")`, dentro una
 * riga `| ... |`, dentro `**grassetto**` o dentro un URL `https://…` non deve
 * essere spezzato, altrimenti fence, tabelle, marcatori e link si rompono.
 */
export function insertSentenceBreaks(text: string): string {
  let inCode = false;
  return text
    .split("\n")
    .map((line) => {
      if (/^\s*```/.test(line)) {
        inCode = !inCode;
        return line;
      }
      if (inCode) return line;
      // Righe di tabella GFM (header, delimiter, corpo): mai spezzate, altrimenti
      // `| ... |` si divide in più paragrafi e il parser non la riconosce più.
      if (isTableRow(line) || TABLE_DELIMITER_RE.test(line.trim())) return line;

      // Evita di spezzare dentro i marcatori inline (**, *, `)
      let result = "";
      let i = 0;
      let inBold = false;
      let inItalic = false;
      let inInlineCode = false;

      while (i < line.length) {
        const ch = line[i];

        // Link markdown [etichetta](url): mai spezzare dentro.
        if (ch === "[" && !inInlineCode) {
          const closeLabel = line.indexOf("]", i + 1);
          const openParen =
            closeLabel !== -1 && line[closeLabel + 1] === "("
              ? closeLabel + 1
              : -1;
          const closeParen =
            openParen !== -1 ? line.indexOf(")", openParen + 1) : -1;
          if (closeLabel !== -1 && openParen !== -1 && closeParen !== -1) {
            result += line.slice(i, closeParen + 1);
            i = closeParen + 1;
            continue;
          }
        }

        // URL nudi: mai spezzare dentro (query string con ? . !).
        if (
          !inInlineCode &&
          (line.startsWith("https://", i) ||
            line.startsWith("http://", i) ||
            line.startsWith("www.", i))
        ) {
          let j = i;
          while (j < line.length && !/[\s<>"'`\]\)]/.test(line[j])) j++;
          result += line.slice(i, j);
          i = j;
          continue;
        }

        // Traccia i marcatori inline
        if (ch === "*" && i + 1 < line.length && line[i + 1] === "*") {
          inBold = !inBold;
          result += "**";
          i += 2;
          continue;
        }
        if (ch === "*") {
          inItalic = !inItalic;
          result += "*";
          i += 1;
          continue;
        }
        if (ch === "`") {
          inInlineCode = !inInlineCode;
          result += "`";
          i += 1;
          continue;
        }

        // Se siamo dentro un marcatore inline, non spezzare
        if (inBold || inItalic || inInlineCode) {
          result += ch;
          i += 1;
          continue;
        }

        // Altrimenti applica lo split delle frasi
        if (ch === "." && i + 1 < line.length && line[i + 1] === " " && i + 2 < line.length && /[A-ZÀ-ÿ0-9]/.test(line[i + 2])) {
          result += ".\n\n";
          i += 2;
          continue;
        }
        if (ch === "!" && i + 1 < line.length && line[i + 1] === " " && i + 2 < line.length && /[A-ZÀ-ÿ0-9]/.test(line[i + 2])) {
          result += "!\n\n";
          i += 2;
          continue;
        }
        if (ch === "?" && i + 1 < line.length && line[i + 1] === " " && i + 2 < line.length && /[A-ZÀ-ÿ0-9]/.test(line[i + 2])) {
          result += "?\n\n";
          i += 2;
          continue;
        }

        result += ch;
        i += 1;
      }

      return result;
    })
    .join("\n");
}