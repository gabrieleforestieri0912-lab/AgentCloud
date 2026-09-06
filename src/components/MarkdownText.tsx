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
            <span className="min-w-0">
              <Inline segments={item.segments} />
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <p className="last:mb-0">
      <Inline segments={block.segments} />
    </p>
  );
}

export default function MarkdownText({ text }: { text: string }) {
  const blocks = parseMarkdown(text);
  if (blocks.length === 0) return null;
  return (
    <div className="break-words text-left">
      {blocks.map((block, i) => (
        <Block key={i} block={block} />
      ))}
    </div>
  );
}