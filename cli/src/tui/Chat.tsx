import React, { useEffect, useState } from "react";
import { Box, Text } from "ink";
import { theme } from "./theme.js";
import { estimateLines, visibleFromEnd } from "./measure.js";
import { Markdown } from "./markdown.js";

export type ToolStepState = "running" | "done" | "error";

export type ToolStep = {
  name: string;
  state: ToolStepState;
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
  /** Card compatte dei tool/integrazioni viste durante il turno. */
  tools?: ToolStep[];
};

/** Cursore animato a fine stream: lampeggia su/sotto. */
function StreamCursor() {
  const [on, setOn] = useState(true);
  useEffect(() => {
    const t = setInterval(() => setOn((b) => !b), 400);
    return () => clearInterval(t);
  }, []);
  return <Text color={theme.primary}>{on ? "▌" : " "}</Text>;
}

/** Card compatta di un tool/integrazione del turno corrente. */
function ToolCard({ step }: { step: ToolStep }) {
  const icon =
    step.state === "running" ? (
      <Text color={theme.warning}>◔</Text>
    ) : step.state === "done" ? (
      <Text color={theme.success}>✓</Text>
    ) : (
      <Text color={theme.error}>✗</Text>
    );
  return (
    <Text wrap="truncate">
      <Text color={theme.border}>│ </Text>
      {icon}
      <Text> </Text>
      <Text color={step.state === "running" ? theme.text : theme.muted}>{step.name}</Text>
      <Text color={theme.muted}>
        {step.state === "running" ? " · in esecuzione" : step.state === "done" ? "" : " · errore"}
      </Text>
    </Text>
  );
}

/**
 * Viewport della conversazione: mostra la coda dei messaggi che sta nel
 * budget di righe. Il taglio avviene sempre tra messaggi interi. Lo
 * streaming fa crescere l'ultimo messaggio e la vista resta ancorata in
 * basso da sola, senza stato di scroll da gestire.
 */
export function Chat({
  messages,
  agentName,
  width,
  maxHeight,
}: {
  messages: ChatMessage[];
  agentName: string;
  width: number;
  maxHeight: number;
}) {
  const lengths = messages.map((m) => estimateLines(m.content, width) + 2 + (m.tools ? m.tools.length : 0));
  const start = visibleFromEnd(lengths, Math.max(1, maxHeight));
  const visible = messages.slice(start);
  return (
    <Box flexDirection="column" paddingX={1}>
      {visible.map((m, i) =>
        m.role === "user" ? (
          <Box key={start + i} flexDirection="column" marginBottom={0}>
            <Text bold color={theme.primary}>
              ❯ tu
            </Text>
            <Text>{m.content}</Text>
          </Box>
        ) : (
          <Box key={start + i} flexDirection="column" marginBottom={0}>
            <Text bold color={theme.success}>
              ● {agentName}
            </Text>
            {m.tools && m.tools.length > 0 ? (
              <Box flexDirection="column" marginBottom={0}>
                {m.tools.map((s, k) => (
                  <ToolCard key={`${start + i}-tool-${k}`} step={s} />
                ))}
              </Box>
            ) : null}
            {m.streaming && !m.content && !m.tools?.length ? <Text color={theme.muted}>…</Text> : null}
            <Markdown text={m.content} />
            {m.streaming ? <StreamCursor /> : null}
          </Box>
        ),
      )}
    </Box>
  );
}
