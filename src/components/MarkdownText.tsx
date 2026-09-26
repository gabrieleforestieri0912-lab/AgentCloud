import { useState, useRef, useCallback } from "react";
import { Check, Copy } from "lucide-react";
import { useLanguage } from "./LanguageProvider";
import {
  insertSentenceBreaks,
  parseMarkdown,
  type InlineSegment,
  type MarkdownBlock,
} from "@/lib/markdown";

/**
 * Renderizza il markdown leggero prodotto dall'AI (grassetto, corsivo, codice
 * inline, titoli ed elenchi) dentro le bolle della chat. Usato da ogni chat
 * così `**grassetto**` e `• elenchi` vengono visualizzati formattati invece
 * che come testo grezzo. Il parsing arriva da src/lib/markdown.ts.
 */
function Inline({ segments }: { segments: InlineSegment[] }) {
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

/**
 * Blocco di codice fenced con header lingua + bottone "Copia" (Claude-style).
 * Il copia usa la clipboard diagnostica con fallback `execCommand` per i
 * contesti non-secure; il feedback "Copiato!" resta 2s.
 */
function CodeBlock({ lang, value }: { lang: string; value: string }) {
  const { dict } = useLanguage();
  const [copied, setCopied] = useState(false);

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
          aria-label="Copy code"
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
      <pre className="overflow-x-auto px-3 py-2.5 text-xs leading-relaxed text-brand-100">
        <code>{value}</code>
      </pre>
    </div>
  );
}

function Block({ block }: { block: MarkdownBlock }) {
  if (block.type === "code") {
    return <CodeBlock lang={block.lang} value={block.value} />;
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
}: {
  text: string;
  onReply?: (phrase: string) => void;
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
        <Block key={i} block={block} />
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