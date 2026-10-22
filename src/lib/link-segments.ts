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
  | { type: "link"; value: string; href: string };

/** Punteggiatura di fine frase che non fa parte dell'URL. */
const TRAILING_PUNCTUATION = /[.,;:!?)\]}>"']/;

export function splitLinks(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let plain = "";
  let i = 0;

  const flush = () => {
    if (plain) {
      segments.push({ type: "text", value: plain });
      plain = "";
    }
  };

  while (i < text.length) {
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
