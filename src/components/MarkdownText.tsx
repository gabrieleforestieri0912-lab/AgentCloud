import {
  parseMarkdown,
  type InlineSegment,
  type MarkdownBlock,
} from "@/lib/markdown";

/**
 * Renders the light markdown produced by the AI (bold, italic, inline code,
 * headings and bullet lists) inside chat bubbles. Used by every chat UI so
 * `**bold**` and `• lists` are displayed instead of shown as raw text.
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

function Block({ block, onReply }: { block: MarkdownBlock; onReply?: (phrase: string) => void }) {
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
        {block.items.map((item, i) => {
          const phrase = item.segments.map((s) => s.value).join("");
          return (
            <div key={i} className="group/item flex gap-2">
              <span className="shrink-0 font-bold text-brand-400">
                {item.marker}
              </span>
              <span className="min-w-0 flex-1">
                <Inline segments={item.segments} />
              </span>
              {onReply && (
                <button
                  onClick={() => onReply(phrase)}
                  title="Rispondi a questa frase"
                  className="opacity-0 group-hover/item:opacity-100 ml-1 shrink-0 rounded p-1 text-neutral-500 hover:bg-white/10 hover:text-brand-300 transition-all"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 14 4 9l5-5" />
                    <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
                  </svg>
                </button>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  const phrase = block.segments.map((s) => s.value).join("");
  return (
    <div className="group/para relative flex items-start gap-2 last:mb-0">
      <p className="flex-1 min-w-0">
        <Inline segments={block.segments} />
      </p>
      {onReply && phrase.trim().length > 8 && (
        <button
          onClick={() => onReply(phrase)}
          title="Rispondi a questa frase"
          className="opacity-0 group-hover/para:opacity-100 shrink-0 mt-0.5 rounded p-1 text-neutral-500 hover:bg-white/10 hover:text-brand-300 transition-all"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 14 4 9l5-5" />
            <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
          </svg>
        </button>
      )}
    </div>
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
  if (blocks.length === 0) return null;
  return (
    <div className="break-words text-left">
      {blocks.map((block, i) => (
        <Block key={i} block={block} onReply={onReply} />
      ))}
    </div>
  );
}