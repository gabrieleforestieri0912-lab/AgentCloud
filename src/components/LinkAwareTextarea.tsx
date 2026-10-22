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
 */
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { splitLinks } from "@/lib/link-segments";

// Su SSR useLayoutEffect non fa nulla e React lo segnala: lato server uso
// useEffect, lato client useLayoutEffect (prima del paint, così il livello
// speculare è già allineato).
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

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

  const segments = useMemo(() => splitLinks(value), [value]);

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
        {segments.map((seg, index) =>
          seg.type === "link" ? (
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
          ) : (
            <span key={index} className="text-white">
              {seg.value}
            </span>
          ),
        )}
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
        className={`relative z-0 w-full resize-none bg-transparent text-[15px] leading-relaxed text-transparent caret-white placeholder-neutral-500 outline-none ${className}`}
        style={style}
      />
    </div>
  );
}
