"use client";

/**
 * Textarea della chat che riconosce i link scritti o incollati e li rende
 * cliccabili mentre l'utente sta ancora scrivendo.
 *
 * Come funziona (tecnica del "livello speculare"):
 *   - sotto il textarea c'è un livello che riproduce lo stesso testo, ma con
 *     i link colorati e sottolineati;
 *   - il textarea ha il testo trasparente e il caret colorato: quello che si
 *     vede è il livello, quindi il link ha l'aspetto di un link;
 *   - il livello è sopra il textarea ma con `pointer-events: none`, tranne i
 *     link: cliccarli apre davvero l'URL (in nuova scheda), mentre il resto
 *     del testo si seleziona e si digita normalmente.
 *
 * Il livello e il textarea devono avere identico font, padding e wrapping,
 * altrimenti le righe non combacerebbero: per questo il livello copia i
 * valori calcolati del textarea (padding, font, allineamento, wrapping)
 * invece di duplicare le classi a mano.
 *
 * Oltre ai link riconosce anche il CODICE incollato (fenced ```lang o run di
 * righe che sembrano codice): nel livello viene reso colorato con
 * highlight.js. Le strategie di segmentazione vivono in
 * `splitComposerSegments` (src/lib/link-segments.ts).
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { splitComposerSegments } from "@/lib/link-segments";
import { highlightCode, loadHighlighter, type Highlighter } from "@/lib/code-highlight";

// Su SSR useLayoutEffect non fa nulla e React lo segnala: lato server uso
// useEffect, lato client useLayoutEffect (prima del paint, così il livello
// speculare è già allineato).
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/** Escape minimo per il testo che NON passa da highlight.js (già escaped). */
function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export type LinkAwareTextareaProps = {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onPaste?: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  /** Classi del textarea (padding, colore di sfondo, placeholder…). */
  className?: string;
  /** Classi del contenitore che avvolge textarea e livello speculare. */
  wrapperClassName?: string;
  /** Stile inline del textarea (altezza massima, fieldSizing…). */
  style?: React.CSSProperties;
  rows?: number;
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;
  "aria-label"?: string;
};

export default function LinkAwareTextarea({
  value,
  onChange,
  onKeyDown,
  onPaste,
  placeholder,
  className = "",
  wrapperClassName = "",
  style,
  rows = 1,
  inputRef,
  "aria-label": ariaLabel,
}: LinkAwareTextareaProps) {
  const mirrorRef = useRef<HTMLDivElement>(null);

  const segments = useMemo(() => splitComposerSegments(value), [value]);

  // highlight.js in lazy (come i blocchi di risposta): finché non arriva il
  // codice nel composer resta incoloro, poi si colora. La colorazione è solo
  // cosmetica — il textarea conserva il testo originale, non c'è idratazione.
  const [hljs, setHljs] = useState<Highlighter | null>(null);
  useEffect(() => {
    let alive = true;
    void loadHighlighter().then((h) => {
      if (alive && h) setHljs(h);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Per ogni segmento di codice: HTML colorato (o testo escaped senza
  // colorazione quando non si riesce a riconoscere la lingua con affidabilità).
  // Nei fenced vale la lingua dichiarata; nel codice incollato senza fence
  // decide highlightAuto con una soglia di rilevanza alta, per non colorare
  // la prosa per errore.
  const codeHtml = useMemo(() => {
    if (!hljs) return null;
    const html: Record<number, string> = {};
    segments.forEach((seg, index) => {
      if (seg.type !== "code") return;
      if (seg.lang) {
        const inner = highlightCode(hljs, seg.lang, seg.body);
        if (inner) {
          html[index] = escapeHtml(`\`\`\`${seg.lang}\n`) + inner + (seg.value.endsWith("```") ? escapeHtml("\n```") : "");
          return;
        }
      }
      const auto = hljs.highlightAuto(seg.body, undefined);
      if (auto.language && auto.relevance >= 8) {
        html[index] = auto.value;
      }
    });
    return html;
  }, [hljs, segments]);

  // Allinea il livello speculare al textarea: copia i valori calcolati
  // (padding, font, wrapping) e tiene sincronizzato lo scroll.
  useIsomorphicLayoutEffect(() => {
    const ta = inputRef?.current;
    const mirror = mirrorRef.current;
    if (!ta || !mirror) return;

    const cs = getComputedStyle(ta);
    mirror.style.boxSizing = "border-box";
    mirror.style.paddingTop = cs.paddingTop;
    mirror.style.paddingRight = cs.paddingRight;
    mirror.style.paddingBottom = cs.paddingBottom;
    mirror.style.paddingLeft = cs.paddingLeft;
    mirror.style.fontFamily = cs.fontFamily;
    mirror.style.fontSize = cs.fontSize;
    mirror.style.fontWeight = cs.fontWeight;
    mirror.style.fontStyle = cs.fontStyle;
    mirror.style.lineHeight = cs.lineHeight;
    mirror.style.letterSpacing = cs.letterSpacing;
    mirror.style.textAlign = cs.textAlign;
    mirror.style.whiteSpace = "pre-wrap";
    mirror.style.overflowWrap = cs.overflowWrap;

    const sync = () => {
      mirror.scrollTop = ta.scrollTop;
      mirror.scrollLeft = ta.scrollLeft;
    };
    sync();
    ta.addEventListener("scroll", sync);
    return () => ta.removeEventListener("scroll", sync);
  }, [inputRef, value]);

  return (
    <div className={`relative min-w-0 ${wrapperClassName}`}>
      {/* Livello speculare: mostra il testo vero (il textarea è trasparente)
          e i link cliccabili. */}
      <div
        ref={mirrorRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
      >
        {segments.map((seg, index) => {
          if (seg.type === "code") {
            const html = codeHtml?.[index];
            return html ? (
              <code
                key={index}
                aria-hidden="true"
                // Stesso font del textarea (copiato nel livello): cambiare
                // famiglia/dimensione disallineerebbe caret e righe.
                className="hljs rounded-lg bg-white/[0.06] text-neutral-200"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            ) : (
              <span key={index} className="text-white">
                {seg.value}
              </span>
            );
          }
          if (seg.type === "link") {
            return (
              <a
                key={index}
                href={seg.href}
                target="_blank"
                rel="noopener noreferrer"
                title={seg.href}
                className="pointer-events-auto cursor-pointer text-brand-300 underline decoration-brand-300/40 underline-offset-2 hover:text-brand-200 hover:decoration-brand-200/70"
              >
                {seg.value}
              </a>
            );
          }
          return (
            <span key={index} className="text-white">
              {seg.value}
            </span>
          );
        })}
      </div>

      <textarea
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        placeholder={placeholder}
        rows={rows}
        aria-label={ariaLabel}
        // 16px il font del composer: sotto quella soglia Safari iOS applica
        // l'auto-zoom al focus e la chat "scatta" a ogni tocco dell'input.
        className={`relative z-0 w-full resize-none bg-transparent text-[16px] text-transparent caret-white placeholder-neutral-500 outline-none ${className}`}
        style={style}
      />
    </div>
  );
}
