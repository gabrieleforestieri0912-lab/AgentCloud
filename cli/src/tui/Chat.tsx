import React from "react";
import { Box, Text } from "ink";
import { theme } from "./theme.js";
import { estimateLines, visibleFromEnd } from "./measure.js";
import { Markdown } from "./markdown.js";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
};

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
  const lengths = messages.map((m) => estimateLines(m.content, width) + 2);
  const start = visibleFromEnd(lengths, Math.max(1, maxHeight));
  const visible = messages.slice(start);
  return (
    <Box flexDirection="column">
      {visible.map((m, i) =>
        m.role === "user" ? (
          <Box key={start + i} flexDirection="column" marginBottom={0}>
            <Text bold color={theme.primary}>
              tu
            </Text>
            <Text>{m.content}</Text>
          </Box>
        ) : (
          <Box key={start + i} flexDirection="column" marginBottom={0}>
            <Text bold color={theme.success}>
              {agentName}
            </Text>
            <Markdown text={m.content} />
            {m.streaming ? <Text color={theme.muted}>...</Text> : null}
          </Box>
        ),
      )}
    </Box>
  );
}
