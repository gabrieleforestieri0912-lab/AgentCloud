import React from "react";
import { Box, Text } from "ink";
import { theme } from "./theme.js";

/**
 * Renderer markdown minimale per la chat (niente dipendenze esterne).
 *
 * Copre ciò che l'agente emette davvero: titoli, grassetto, corsivo, codice
 * inline, fence di codice, elenchi, citazioni, hr. Tollerante allo streaming:
 * un fence non ancora chiuso si renderizza come codice fino a fine testo.
 */

type Block =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "code"; lang: string; code: string }
  | { type: "list"; items: string[] }
  | { type: "quote"; text: string }
  | { type: "hr" };

function parseBlocks(src: string): Block[] {
  const blocks: Block[] = [];
  const lines = src.split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const fence = line.match(/^```(\w*)\s*$/);
    if (fence) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        code.push(lines[i]);
        i++;
      }
      i++; // salta la chiusura (o fine testo se lo stream è a metà)
      blocks.push({ type: "code", lang: fence[1] || "", code: code.join("\n") });
      continue;
    }
    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      blocks.push({ type: "heading", level: heading[1].length, text: heading[2] });
      i++;
      continue;
    }
    if (/^\s*---\s*$/.test(line)) {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }
    if (/^\s*>/.test(line)) {
      const quote: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) {
        quote.push(lines[i].replace(/^\s*>\s?/, ""));
        i++;
      }
      blocks.push({ type: "quote", text: quote.join(" ") });
      continue;
    }
    if (/^\s*(?:[-*]|\d+\.)\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*(?:[-*]|\d+\.)\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*(?:[-*]|\d+\.)\s+/, ""));
        i++;
      }
      blocks.push({ type: "list", items });
      continue;
    }
    if (line.trim() === "") {
      i++;
      continue;
    }
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].startsWith("```") &&
      !/^(#{1,3})\s+/.test(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    blocks.push({ type: "paragraph", text: para.join(" ") });
  }
  return blocks;
}

/** Testo inline: codice, link, grassetto, corsivo (un livello basta). */
function Inline({ text }: { text: string }) {
  const out: React.ReactNode[] = [];
  const re = /(`[^`\n]+`)|\[([^\]]+)\]\(([^)]+)\)|(\*\*[^*]+\*\*)|(\*[^*\n]+\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  const pushText = (t: string) => {
    if (t) out.push(<React.Fragment key={k++}>{t}</React.Fragment>);
  };
  while ((m = re.exec(text)) !== null) {
    pushText(text.slice(last, m.index));
    last = m.index + m[0].length;
    if (m[1]) {
      out.push(
        <Text key={k++} color={theme.accent}>
          {m[1].slice(1, -1)}
        </Text>,
      );
    } else if (m[2]) {
      out.push(
        <React.Fragment key={k++}>
          {m[2]} <Text color={theme.muted}>({m[3]})</Text>
        </React.Fragment>,
      );
    } else if (m[4]) {
      out.push(
        <Text key={k++} bold>
          {m[4].slice(2, -2)}
        </Text>,
      );
    } else if (m[5]) {
      out.push(
        <Text key={k++} italic>
          {m[5].slice(1, -1)}
        </Text>,
      );
    }
  }
  pushText(text.slice(last));
  return <>{out}</>;
}

function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case "heading":
      return block.level === 1 ? (
        <Text bold color={theme.primary}>
          <Inline text={block.text} />
        </Text>
      ) : (
        <Text bold>
          <Inline text={block.text} />
        </Text>
      );
    case "code":
      return (
        <Box flexDirection="column" borderStyle="single" borderColor={theme.border} paddingX={1}>
          {block.lang ? <Text color={theme.muted}>{block.lang}</Text> : null}
          <Text>{block.code}</Text>
        </Box>
      );
    case "list":
      return (
        <Box flexDirection="column">
          {block.items.map((item, i) => (
            <Text key={i}>
              <Text color={theme.muted}>- </Text>
              <Inline text={item} />
            </Text>
          ))}
        </Box>
      );
    case "quote":
      return (
        <Text color={theme.muted}>
          <Inline text={block.text} />
        </Text>
      );
    case "hr":
      return <Text color={theme.border}>{"-".repeat(40)}</Text>;
    case "paragraph":
    default:
      return (
        <Text>
          <Inline text={(block as { text: string }).text} />
        </Text>
      );
  }
}

export function Markdown({ text }: { text: string }) {
  const blocks = parseBlocks(text);
  return (
    <>
      {blocks.map((b, i) => (
        <BlockView key={i} block={b} />
      ))}
    </>
  );
}
