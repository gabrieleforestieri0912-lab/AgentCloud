/**
 * Segmentazione di un testo in parti "testo" e "link".
 *
 * Usata dal composer della chat per riconoscere i link incollati e renderli
 * cliccabili mentre l'utente scrive.
 *
 * A differenza di `parseInline` (src/lib/markdown.ts) questo NON interpreta
 * il markdown: il testo viene restituito identico, carattere per carattere, con
 * solo i segmenti URL separati. Serve perché il testo del composer viene
 * mostrato in un livello sovrapposto al textarea: se i marcatori sparissero,
 * il livello e il textarea non combacerebbero più.
 */
export type TextSegment =
  | { type: "text"; value: string }
  | { type: "link"; value: string; href: string }
  | { type: "code"; value: string; body: string; lang: string | null };

/** Punteggiatura di fine frase che non fa parte dell'URL. */
const TRAILING_PUNCTUATION = /[.,;:!?)\]}>"']/;

/**
 * Un paragrafo "sembra codice" quando: ha almeno 3 righe, contiene parecchi
 * caratteri tipici del codice ({};= ()) e ha righe indentate come un corpo
 * di funzione. Serve per il codice incollato SENZA fence ``` — il caso più
 * comune è "copio dal mio editor e incollo in chat". La soglia è
 * deliberatamente alta: dare una mano evitando di colorare la prosa
 * a più righe normativa (che ha frasi lunghe e pochi simboli).
 */

/** Una riga "di codice": simboli tipici, corpo indentato o keyword nota. */
function isCodeLine(line: string): boolean {
  return (
    /[(){}=;]|=>/.test(line) ||
    /^[ \t]{2,}\S/.test(line) ||
    /^[ \t]*(def|function|class|import|export|return|for|while|if|else|elif|with|const|let|var|print|console)\b/.test(line)
  );
}

/**
 * Segmenta il testo SENZA fence in [codice, resto]:
 *   - codice = ogni sequenza di righe consecutive "di codice" (le righe vuote
 *     NON chiudono il run: dentro un blocco spesso ce ne sono);
 *   - serve: almeno 3 righe di codice e abbastanza simboli tipici; la soglia
 *     è alta per non colorare la prosa (elenchi, messaggi con parens).
 * Il codice incollato senza fence ``` — il caso più comune è "copio dal mio
 * editor e incollo in chat" — usa questa via; la colorazione vera decide poi
 * highlightAuto nel component.
 */
function splitPlainChunk(chunk: string): TextSegment[] {
  const lines = chunk.split("\n");
  const out: TextSegment[] = [];

  // Posizione d'inizio di ogni riga nel chunk (per tagli ai caratteri esatti).
  const starts: number[] = [];
  for (let acc = 0, k = 0; k < lines.length; k++) {
    starts.push(acc);
    acc += lines[k].length + 1;
  }

  let proseStart = 0;
  let i = 0;
  while (i < lines.length) {
    let j = i;
    let codeCount = 0;
    let stop = i;
    let symbols = 0;
    while (j < lines.length) {
      if (isCodeLine(lines[j])) {
        codeCount++;
        symbols += (lines[j].match(/[(){}=;]|=>/g) ?? []).length;
        stop = j + 1;
        j++;
      } else if (!lines[j].trim() && codeCount > 0) {
        // la riga vuota non chiude il run di codice
        j++;
      } else {
        break;
      }
    }
    if (codeCount >= 3 && symbols >= 3) {
      if (proseStart < i) {
        out.push({ type: "text", value: chunk.slice(starts[proseStart], starts[i]) });
      }
      const code = chunk.slice(starts[i], stop < lines.length ? starts[stop] : chunk.length);
      out.push({ type: "code", value: code, body: code, lang: null as string | null });
      proseStart = stop;
      i = stop;
    } else {
      i++;
    }
  }
  if (proseStart < lines.length) {
    out.push({ type: "text", value: chunk.slice(starts[proseStart]) });
  }
  return out;
}

export function splitLinks(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let plain = "";
  let i = 0;

  const flush = () => {
    if (plain) {
      segments.push({ type: "text", value: plain });
      plain = "";
    }
  };  while (i < text.length) {
    const prev = i === 0 ? "" : text[i - 1];
    const canStartUrl = i === 0 || !/[A-Za-z0-9]/.test(prev);

    if (canStartUrl) {
      const match = text.slice(i).match(/^(https?:\/\/|www\.)\S+/i);
      if (match) {
        const raw = match[0];
        const end = i + raw.length;

        // La punteggiatura finale ("vedi https://x.com.") resta testo.
        let url = raw;
        let tail = "";
        while (url.length > 0 && TRAILING_PUNCTUATION.test(url[url.length - 1])) {
          tail = url[url.length - 1] + tail;
          url = url.slice(0, -1);
        }

        const minLength = url.toLowerCase().startsWith("www.") ? 5 : 9;
        if (url.length >= minLength) {
          flush();
          segments.push({
            type: "link",
            value: url,
            href: url.toLowerCase().startsWith("www.") ? `https://${url}` : url,
          });
          plain += tail;
          i = end;
          continue;
        }
      }
    }

    plain += text[i];
    i += 1;
  }

  flush();
  return segments;
}

/**
 * Estrae i blocchi fenced (```lang … ```) da un testo e li restituisce come
 * "code" con la lingua dichiarata. Serve prima dell'individuazione euristica
 * dei paragrafi-codice: i blocchi fence non vanno sottoposti ad guessing.
 * Il valore del segmento è il testo COMPLETO di fence e ritorni (identico al
 * textarea, così il livello speculare resta allineato).
 */
function extractFences(text: string): Array<{ isCode: boolean; value: string; body: string; lang: string | null }> {
  const out: Array<{ isCode: boolean; value: string; body: string; lang: string | null }> = [];
  const pushPlain = (value: string) => {
    if (value) out.push({ isCode: false, value, body: "", lang: null });
  };

  let cursor = 0;
  let open = text.indexOf("```");
  while (open !== -1) {
    const lineEnd = text.indexOf("\n", open);
    if (lineEnd === -1) break;
    const firstLine = text.slice(open + 3, lineEnd).trim();
    // La prima riga porta la lingua solo se è una parola singola: "```python",
    // non "``` guarda questo" (apostrofo nel testo normale).
    const lang = /^[a-z0-9+#.-]{1,20}$/i.test(firstLine) ? firstLine.toLowerCase() : null;
    const close = text.indexOf("```", lineEnd + 1);
    if (close === -1) {
      // fence non chiuso: l'utente sta ancora scrivendo, il resto è codice
      if (cursor < open) pushPlain(text.slice(cursor, open));
      out.push({ isCode: true, value: text.slice(open), body: text.slice(lineEnd + 1), lang });
      cursor = text.length;
      break;
    }
    if (cursor < open) pushPlain(text.slice(cursor, open));
    out.push({
      isCode: true,
      value: text.slice(open, close + 3),
      body: text.slice(lineEnd + 1, close),
      lang,
    });
    cursor = close + 3;
    open = text.indexOf("```", cursor);
  }
  if (cursor < text.length) pushPlain(text.slice(cursor));
  return out;
}

/**
 * Segmentazione per il composer della chat: link + blocchi di codice.
 * Le regole, in ordine:
 *   1. blocchi fenced ```lang … ``` (o fence non ancora chiuso) → codice;
 *   2. il resto si spezza in run di righe "che sembrano codice" (euristica
 *      `isCodeLine`) e anche i run diventano codice con lingua da auto-detect;
 *   3. i link https:// del testo normale restano cliccabili come prima.
 *
 * Il testo dei segmenti è identico all'input carattere per carattere: il
 * livello speculare del composer (che deve combaciare col textarea) dipende da
 * questo. La colorazione vera avviene nel component, con highlight.js, perché
 * è una risorsa async.
 */
export function splitComposerSegments(text: string): TextSegment[] {
  const segments: TextSegment[] = [];

  for (const part of extractFences(text)) {
    if (part.isCode) {
      segments.push({ type: "code", value: part.value, body: part.body, lang: part.lang });
    } else {
      segments.push(...splitPlainChunk(part.value));
    }
  }

  // I link vivono solo nel testo normale: nel codice un URL è parte del
  // blocco e non deve diventare cliccabile mentre si scrive.
  const withLinks: TextSegment[] = [];
  for (const seg of segments) {
    if (seg.type !== "text") {
      withLinks.push(seg);
      continue;
    }
    withLinks.push(...splitLinks(seg.value));
  }
  return withLinks;
}
