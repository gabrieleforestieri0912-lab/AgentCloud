import { describe, expect, it } from "vitest";
import { parseInline, parseMarkdown } from "./markdown";

describe("parseInline", () => {
  it("parses bold, italic and inline code", () => {
    expect(parseInline("**bold** and *italic* and `code`")).toEqual([
      { type: "bold", value: "bold" },
      { type: "text", value: " and " },
      { type: "italic", value: "italic" },
      { type: "text", value: " and " },
      { type: "code", value: "code" },
    ]);
  });

  it("keeps unclosed markers as literal text (mid-streaming)", () => {
    expect(parseInline("**bold unfinished")).toEqual([
      { type: "text", value: "**bold unfinished" },
    ]);
    expect(parseInline("half *ital")).toEqual([
      { type: "text", value: "half *ital" },
    ]);
    expect(parseInline("code `still open")).toEqual([
      { type: "text", value: "code `still open" },
    ]);
  });

  it("returns plain text untouched", () => {
    expect(parseInline("plain text")).toEqual([
      { type: "text", value: "plain text" },
    ]);
  });
});

describe("parseMarkdown", () => {
  it("groups paragraphs, bullet lists and closing paragraphs", () => {
    const blocks = parseMarkdown(
      "First line.\n\n• **Lead Capture** — collect\n• Notify sales\n\nDone.",
    );
    expect(blocks).toHaveLength(3);
    expect(blocks[0]).toEqual({
      type: "paragraph",
      segments: [{ type: "text", value: "First line." }],
    });
    expect(blocks[1]).toEqual({
      type: "list",
      items: [
        {
          marker: "•",
          segments: [
            { type: "bold", value: "Lead Capture" },
            { type: "text", value: " — collect" },
          ],
        },
        { marker: "•", segments: [{ type: "text", value: "Notify sales" }] },
      ],
    });
    expect(blocks[2]).toEqual({
      type: "paragraph",
      segments: [{ type: "text", value: "Done." }],
    });
  });

  it("parses headings and ordered lists", () => {
    const blocks = parseMarkdown("## Heading\n1. first\n2. second");
    expect(blocks).toEqual([
      {
        type: "heading",
        level: 2,
        segments: [{ type: "text", value: "Heading" }],
      },
      {
        type: "list",
        items: [
          { marker: "1.", segments: [{ type: "text", value: "first" }] },
          { marker: "2.", segments: [{ type: "text", value: "second" }] },
        ],
      },
    ]);
  });

  it("joins consecutive plain lines into one paragraph", () => {
    const blocks = parseMarkdown("line one\nline two");
    expect(blocks).toEqual([
      {
        type: "paragraph",
        segments: [
          { type: "text", value: "line one" },
          { type: "text", value: " " },
          { type: "text", value: "line two" },
        ],
      },
    ]);
  });
});