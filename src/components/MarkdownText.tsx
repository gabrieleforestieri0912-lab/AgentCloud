"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Check, Copy, X, ArrowUp } from "lucide-react";
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import { useLanguage } from "./LanguageProvider";
import {
  insertSentenceBreaks,
  parseMarkdown,
  type InlineSegment,
  type MarkdownBlock,
} from "@/lib/markdown";
import {
  highlightCode,
  loadHighlighter,
  type Highlighter,
} from "@/lib/code-highlight";
import YouTubeLink, { isYouTubePreviewUrl } from "./YouTubeLink";

/**
 * Renderizza il markdown leggero prodotto dall'AI (grassetto, corsivo, codice
 * inline, link, titoli, elenchi e tabelle GFM) dentro le bolle della chat. Usato da ogni chat
 * così `**grassetto**` e `• elenchi` vengono visualizzati formattati invece
 * che come testo grezzo. Il parsing arriva da src/lib/markdown.ts.
 */
/**
 * Segmenti inline già pronti (`parseInline`): esportato per etichette e
 * testi singola-riga (label e detail dell'attività agente) che devono
 * rispettare lo stesso cargo di `**grassetto**` e `` `codice` ``.
 */
export function Inline({ segments }: { segments: InlineSegment[] }) {
  return (
    <>
      {segments.map((seg, i) => {
        switch (seg.type) {
          case "bold":
            return (
              <strong key={i} className="font-semibold text-white">
                {seg.value}
              </strong>
            );
          case "italic":
            return <em key={i}>{seg.value}</em>;
          case "link": {
            // I link YouTube diventano una card con titolo e anteprima reali
            // del video: il server (/api/youtube) risolve sia i link diretti
            // sia quelli di ricerca al primo risultato, così in chat si vedono
            // link a video veri e non pagine di ricerca di YouTube.
            if (isYouTubePreviewUrl(seg.url)) {
              return <YouTubeLink key={i} url={seg.url} label={seg.label} />;
            }
            return (
              <a
                key={i}
                href={seg.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                onClick={(e) => e.stopPropagation()}
                className="relative z-10 font-semibold text-brand-300 underline decoration-brand-400/40 underline-offset-2 break-all hover:text-brand-200 cursor-pointer"
              >
                {seg.label}
              </a>
            );
          }
          case "code":
            return (
              <code
                key={i}
                className="rounded bg-white/10 px-1 py-0.5 text-[0.85em] text-brand-200"
              >
                {seg.value}
              </code>
            );
          default:
            return <span key={i}>{seg.value}</span>;
        }
      })}
    </>
  );
}

/** Payload di un suggerimento su una riga del blocco di codice. */
export type CodeCommentPayload = {
  /** Numero di riga (1-based) dentro il blocco. */
  line: number;
  /** Contenuto testuale della riga citata. */
  code: string;
  /** Nota scritta dall'utente (cosa cambiare). */
  note: string;
};

/**
 * Blocco di codice fenced con header lingua + bottone "Copia" (Claude-style).
 * Il codice viene colorato per linguaggio con highlight.js (caricato in lazy:
 * finché non arriva resta incoloro, così server e primo render client
 * coincidono). Il copia usa la clipboard diagnostica con fallback
 * `execCommand` per i contesti non-secure; il feedback "Copiato!" resta 2s.
 *
 * In più, come su Claude: passando su una riga appare nel gutter un'icona;
 * cliccandola si apre un input inline subito sotto la riga per chiedere una
 * modifica a quella riga all'AI. La nota non parte da qui: risale al
 * genitore via `onCodeComment` che la attacca al composer (con la riga
 * citata, così la richiesta ha il contesto).
 */
function CodeBlock({
  lang,
  value,
  onCodeComment,
}: {
  lang: string;
  value: string;
  onCodeComment?: (payload: CodeCommentPayload) => void;
}) {
  const { dict } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [barPos, setBarPos] = useState<{ top: number; left: number; right: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const noteInputRef = useRef<HTMLInputElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  // Le righe di `value` coincidono con le righe dell'HTML evidenziato
  // (hljs preserva i newline), quindi il numero sempre allineato alla riga.
  const lines = useMemo(() => value.split("\n"), [value]);

  /** Invia la nota risalendo al genitore (che la attacca al composer). */
  const submitSuggestion = useCallback(() => {
    if (activeIdx === null || !onCodeComment) return;
    const text = note.trim();
    const code = lines[activeIdx]?.trim();
    if (!text || !code) return;
    onCodeComment({ line: activeIdx + 1, code, note: text });
    setActiveIdx(null);
    setHoverIdx(null);
    setNote("");
  }, [activeIdx, lines, note, onCodeComment]);

  const handleNoteKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        submitSuggestion();
      } else if (e.key === "Escape") {
        e.preventDefault();
        setActiveIdx(null);
        setHoverIdx(null);
      }
    },
    [submitSuggestion],
  );

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

  // Ricalcolato solo quando cambia il contenuto del blocco: durante lo
  // streaming ri-colora l'ultimo blocco a ogni tick, i blocchi già completi
  // restano in cache in useMemo.
  const html = useMemo(
    () => (hljs ? highlightCode(hljs, lang, value) : null),
    [hljs, lang, value],
  );

  // Streaming: se il blocco si accorcia, la riga commentata può sparire —
  // il guard `activeIdx < lines.length` nel render evita barre e note fantasme
  // senza bisogno di setState in un effect.

  /**
   * Altezza di una riga di codice in px, misurata sul <pre> vero: tutte le
   * righe hanno la stessa altezza (il pre non wrappa, scorre in orizzontale),
   * quindi height / numero di righe è esatto anche quando il row-height
   * dipende da font/zoom/leading della chat.
   */
  const measureRowH = useCallback((): number | null => {
    const pre = preRef.current;
    if (!pre || lines.length === 0) return null;
    const rect = pre.getBoundingClientRect();
    if (rect.height === 0) return null;
    return rect.height / lines.length;
  }, [lines.length]);

  /** Indice di riga (0-based) dalla coordinata Y del puntatore, o null. */
  const lineFromPointer = useCallback(
    (e: ReactPointerEvent): number | null => {
      const pre = preRef.current;
      const wrap = wrapRef.current;
      if (!pre || !wrap) return null;
      const preRect = pre.getBoundingClientRect();
      const rowH = measureRowH();
      if (!rowH) return null;
      if (e.clientY < preRect.top || e.clientY > preRect.bottom) return null;
      let idx = Math.floor((e.clientY - preRect.top) / rowH);
      idx = Math.max(0, Math.min(idx, lines.length - 1));
      return idx;
    },
    [lines.length, measureRowH],
  );

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent) => {
      if (process.env.NODE_ENV !== "production") {
        // TEST-ONLY trace, rimosso dopo la verifica
        (window as unknown as { __dbgMove?: string[] }).__dbgMove ??= [];
        (window as unknown as { __dbgMove?: string[] }).__dbgMove!.push(
          `move@${e.clientX},${e.clientY}`,
        );
      }
      if (activeIdx !== null) return;
      const idx = lineFromPointer(e);
      setHoverIdx(idx === hoverIdx ? hoverIdx : idx);
    },
    [activeIdx, hoverIdx, lineFromPointer],
  );

  const handlePointerLeave = useCallback(() => setHoverIdx(null), []);

  const openSuggestion = useCallback(
    (idx: number) => {
      // La geometria si misura AL CLICK (handler, non render): la barra è
      // assoluta dentro il wrapper, quindi uno scroll della pagina non la
      // sposta rispetto al blocco.
      const wrap = wrapRef.current;
      const pre = preRef.current;
      const gutter = gutterRef.current;
      if (!wrap || !pre) return;
      const rowH = measureRowH() ?? 0;
      const preRect = pre.getBoundingClientRect();
      const wrapRect = wrap.getBoundingClientRect();
      const top = preRect.top - wrapRect.top + (idx + 1) * rowH - 2;
      const left = gutter ? gutter.offsetLeft + gutter.offsetWidth + 8 : 44;
      setActiveIdx(idx);
      setHoverIdx(idx);
      setNote("");
      setBarPos({ top, left, right: 8 });
      setTimeout(() => noteInputRef.current?.focus(), 0);
    },
    [measureRowH],
  );

  const handleCopy = useCallback(async () => {
    const text = value;
    let ok = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        ok = true;
      }
    } catch {
      // Clipboard API non disponibile (http non-secure): fallback manuale.
    }
    if (!ok) {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        ok = document.execCommand("copy");
        document.body.removeChild(ta);
      } catch {
        ok = false;
      }
    }
    if (!ok) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [value]);

  return (
    <div className="my-2 overflow-hidden rounded-xl border border-white/10 bg-neutral-950">
      <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-3 py-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
          {lang || "code"}
        </span>
        <button
          type="button"
          onClick={() => void handleCopy()}
          aria-label={dict.common.copy}
          className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-bold text-neutral-300 transition-colors hover:bg-white/10 hover:text-white"
        >
          {copied ? (
            <Check size={11} className="text-emerald-400" />
          ) : (
            <Copy size={11} />
          )}
          {copied ? dict.common.copied : dict.common.copy}
        </button>
      </div>
      {/* Numeri di riga in una colonna separata fuori da <pre>: non finiscono
          nella copia e restano fissi mentre il codice scorre in orizzontale.
          Stesso font/ritmo di riga del pre così ogni numero si allinea alla
          propria riga. Hover su una riga → icona di suggerimento nel gutter. */}
      <div
        ref={wrapRef}
        className="relative flex"
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        <div
          ref={gutterRef}
          className="shrink-0 select-none border-r border-white/5 py-2.5 pr-2.5 pl-3 text-right font-mono text-xs leading-relaxed text-neutral-500 tabular-nums"
        >
          {lines.map((_, i) => (
            <div key={i} className={i === hoverIdx || i === activeIdx ? "text-brand-300" : undefined}>
              {onCodeComment ? (
                <span className="relative">
                  {i === hoverIdx && i !== activeIdx && (
                    <button
                      type="button"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={() => openSuggestion(i)}
                      aria-label={dict.common.codeSuggestPlaceholder}
                      title={dict.common.codeSuggestPlaceholder}
                      className="absolute top-1/2 -translate-y-1/2 flex h-4 w-4 items-center justify-center rounded border border-white/10 bg-neutral-800 text-neutral-300 shadow-md transition-colors hover:bg-brand-500 hover:text-white"
                      style={{ left: 3 }}
                    >
                      <ArrowUp size={9} />
                    </button>
                  )}
                  <span className="inline-block">{i + 1}</span>
                </span>
              ) : (
                <span className="inline-block">{i + 1}</span>
              )}
            </div>
          ))}
        </div>
        <pre
          ref={preRef}
          className="min-w-0 flex-1 overflow-x-auto px-3 py-2.5 text-xs leading-relaxed text-brand-100"
        >
          {html !== null ? (
            <code className="hljs" dangerouslySetInnerHTML={{ __html: html }} />
          ) : (
            <code>{value}</code>
          )}
        </pre>
        {onCodeComment && activeIdx !== null && activeIdx < lines.length && barPos && (
          <div
            onMouseDown={(e) => e.stopPropagation()}
            className="absolute z-20 flex min-w-[220px] items-center gap-2 rounded-lg border border-white/10 bg-neutral-900 px-2.5 py-1.5 shadow-xl"
            style={{
              top: barPos.top,
              left: barPos.left,
              right: barPos.right,
            }}
          >
            <input
              ref={noteInputRef}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={handleNoteKeyDown}
              placeholder={dict.common.codeSuggestPlaceholder}
              className="min-w-0 flex-1 bg-transparent text-sm text-neutral-100 outline-none placeholder:text-neutral-500"
            />
            <button
              type="button"
              onClick={submitSuggestion}
              disabled={!note.trim()}
              aria-label={dict.chat.sendMessage}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-brand-500 text-white transition-opacity hover:bg-brand-400 disabled:opacity-40"
            >
              <ArrowUp size={13} />
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveIdx(null);
                setHoverIdx(null);
              }}
              aria-label={dict.common.close}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-neutral-400 hover:bg-white/10 hover:text-white"
            >
              <X size={13} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Block({
  block,
  onCodeComment,
}: {
  block: MarkdownBlock;
  onCodeComment?: (payload: CodeCommentPayload) => void;
}) {
  if (block.type === "code") {
    return <CodeBlock lang={block.lang} value={block.value} onCodeComment={onCodeComment} />;
  }

  if (block.type === "table") {
    const { headers, aligns, rows } = block.table;
    const alignCls = (a: "left" | "center" | "right") =>
      a === "center" ? "text-center" : a === "right" ? "text-right" : "text-left";
    return (
      <div className="my-2 -mx-1 overflow-x-auto px-1 pb-1">
        <table className="w-full min-w-[320px] border-collapse overflow-hidden rounded-xl border border-white/10 text-sm">
          <thead>
            <tr className="bg-white/5">
              {headers.map((cell, i) => (
                <th
                  key={i}
                  style={{ textAlign: aligns[i] ?? "left" }}
                  className={`border-b border-white/10 px-3 py-2 font-bold text-white ${alignCls(aligns[i] ?? "left")}`}
                >
                  <Inline segments={cell} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, r) => (
              <tr key={r} className={r % 2 === 1 ? "bg-white/[0.02]" : undefined}>
                {row.map((cell, c) => (
                  <td
                    key={c}
                    style={{ textAlign: aligns[c] ?? "left" }}
                    className={`border-b border-white/5 px-3 py-2 text-neutral-200 last:border-b-0 ${alignCls(aligns[c] ?? "left")}`}
                  >
                    <Inline segments={cell} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (block.type === "heading") {
    const Tag = `h${block.level}` as "h1" | "h2" | "h3";
    return (
      <Tag className="mt-2 mb-1 font-bold text-white first:mt-0">
        <Inline segments={block.segments} />
      </Tag>
    );
  }

  if (block.type === "list") {
    return (
      <div className="my-1.5 space-y-1 first:mt-0 last:mb-0">
        {block.items.map((item, i) => (
          <div key={i} className="flex gap-2">
            <span className="shrink-0 font-bold text-brand-400">
              {item.marker}
            </span>
            <span className="min-w-0 flex-1">
              <Inline segments={item.segments} />
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <p className="min-w-0 last:mb-0">
      <Inline segments={block.segments} />
    </p>
  );
}

export default function MarkdownText({
  text,
  onReply,
  onCodeComment,
}: {
  text: string;
  onReply?: (phrase: string) => void;
  /** Suggerimento su una riga di un blocco di codice (icona nel gutter). */
  onCodeComment?: (payload: CodeCommentPayload) => void;
}) {
  // Per i messaggi AI: vai a capo dopo il punto (ogni frase su nuova riga),
  // ma mai dentro i blocchi di codice fenced — vedi insertSentenceBreaks.
  const blocks = parseMarkdown(insertSentenceBreaks(text));
  const containerRef = useRef<HTMLDivElement>(null);
  const [sel, setSel] = useState<{ text: string; top: number; left: number } | null>(null);

  const handlePointerUp = useCallback(() => {
    if (!onReply || !containerRef.current) return;
    // Ritarda di un tick così la selezione è già aggiornata (mouseUp)
    setTimeout(() => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        setSel(null);
        return;
      }
      const selectedText = selection.toString().trim();
      if (selectedText.length < 3 || selectedText.length > 500) {
        setSel(null);
        return;
      }
      const anchor = selection.anchorNode;
      const focus = selection.focusNode;
      const container = containerRef.current!;
      const within =
        (anchor && container.contains(anchor)) ||
        (focus && container.contains(focus)) ||
        container.contains(selection.anchorNode as Node);
      if (!within) {
        setSel(null);
        return;
      }
      try {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        if (!rect || (rect.width === 0 && rect.height === 0)) {
          setSel(null);
          return;
        }
        setSel({
          text: selectedText,
          top: rect.top + window.scrollY,
          left: rect.left + rect.width / 2 + window.scrollX,
        });
      } catch {
        setSel(null);
      }
    }, 30);
  }, [onReply, setSel]);

  const clearSel = useCallback(() => {
    // Chiude il tag se si clicca fuori dalla selezione (defer per non chiudere prima del click su Rispondi)
    setTimeout(() => {
      const s = window.getSelection();
      if (!s || s.isCollapsed) setSel(null);
    }, 150);
  }, [setSel]);

  if (blocks.length === 0) return null;
  return (
    <div
      ref={containerRef}
      className="break-words text-left relative select-text"
      onMouseUp={handlePointerUp}
      onTouchEnd={handlePointerUp}
      onMouseDown={clearSel}
    >
      {blocks.map((block, i) => (
        <Block key={i} block={block} onCodeComment={onCodeComment} />
      ))}
      {sel && onReply && (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            const t = sel.text;
            setSel(null);
            // Rimuove evidenziazione dopo il click
            window.getSelection()?.removeAllRanges();
            onReply(t);
          }}
          className="fixed z-30 -translate-x-1/2 -translate-y-full inline-flex items-center gap-1.5 rounded-full bg-neutral-800 border border-white/10 px-3 py-1.5 text-xs font-bold text-white shadow-xl hover:bg-neutral-700"
          style={{ top: sel.top - 8, left: sel.left }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 14 4 9l5-5" />
            <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
          </svg>
          Rispondi
        </button>
      )}
    </div>
  );
}