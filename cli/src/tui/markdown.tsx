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

/* ------------------------------------------------------------------ *
 * Syntax highlight semplice per i blocchi di codice.
 * Universal tokenizer: stringhe, commenti, numeri, keyword comuni di
 * JS/TS/Python/Go/SQL/Bash. Non sostituisce highlight.js: copre ciò che
 * gli agenti effettivamente emettono, resta tollerante allo streaming.
 * ------------------------------------------------------------------ */

const TOKEN_RE =
  /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|(\/\/[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\/|\{\/\*[\s\S]*?\*\/\})|(\b\d+(?:\.\d+)?\b)|(\b(?:const|let|var|function|return|if|else|for|while|do|break|continue|switch|case|default|import|export|from|class|extends|new|await|async|try|catch|finally|throw|interface|type|enum|public|private|protected|static|readonly|def|self|lambda|None|True|False|null|undefined|true|false|package|func|struct|impl|fn|match|use|pub|mut|select|insert|update|delete|where|join|group|order|limit|echo|source|curl|npm|git)\b)/g;

type Token = { text: string; kind: "plain" | "string" | "comment" | "number" | "keyword" };

export function tokenizeCode(code: string): Token[] {
  const tokens: Token[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = TOKEN_RE.exec(code)) !== null) {
    if (m.index > last) tokens.push({ text: code.slice(last, m.index), kind: "plain" });
    last = m.index + m[0].length;
    const kind: Token["kind"] = m[1] ? "string" : m[2] ? "comment" : m[3] ? "number" : "keyword";
    tokens.push({ text: m[0], kind });
  }
  if (last < code.length) tokens.push({ text: code.slice(last), kind: "plain" });
  return tokens;
}

function TokenColor({ kind, children }: { kind: Token["kind"]; children: string }) {
  const color =
    kind === "string"
      ? theme.success
      : kind === "comment"
        ? theme.muted
        : kind === "number"
          ? theme.warning
          : kind === "keyword"
            ? theme.accent
            : undefined;
  return <Text color={color}>{children}</Text>;
}

function CodeText({ code }: { code: string }) {
  const lines = code.split("\n");
  return (
    <>
      {lines.map((line, i) => {
        const tokens = tokenizeCode(line);
        return (
          <Text key={i}>
            {tokens.length === 0 ? " " : tokens.map((t, k) => (
              <TokenColor key={k} kind={t.kind}>
                {t.text}
              </TokenColor>
            ))}
          </Text>
        );
      })}
    </>
  );
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
          <CodeText code={block.code} />
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
