import { useState, useRef, useCallback } from "react";
import {
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

function Block({ block }: { block: MarkdownBlock }) {
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
  // Per i messaggi AI: vai a capo dopo il punto (ogni frase su nuova riga)
  // Inserisce un paragrafo separato dopo . ! ? quando segue una maiuscola/numero
  const withBreaks = text.replace(/([.!?]) (?=[A-ZÀ-ÿ0-9])/g, "$1\n\n");
  const blocks = parseMarkdown(withBreaks);
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
  }, [onReply]);

  const clearSel = useCallback(() => {
    // Chiude il tag se si clicca fuori dalla selezione (defer per non chiudere prima del click su Rispondi)
    setTimeout(() => {
      const s = window.getSelection();
      if (!s || s.isCollapsed) setSel(null);
    }, 150);
  }, []);

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