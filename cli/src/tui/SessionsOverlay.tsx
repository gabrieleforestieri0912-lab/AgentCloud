import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { theme } from "./theme.js";
import type { SessionSummary } from "../sessions.js";

/**
 * Overlay /sessions: chat precedenti dello stesso agente, recenti prima.
 * ↑↓ seleziona, Invio riprende, Esc chiude.
 */
export function SessionsOverlay({
  sessions,
  height,
  onSelect,
  onClose,
}: {
  sessions: SessionSummary[];
  height: number;
  onSelect: (code: string) => void;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);

  useInput((_input, key) => {
    if (key.escape) {
      onClose();
      return;
    }
    if (sessions.length === 0) return;
    if (key.upArrow) setIndex((i) => (i - 1 + sessions.length) % sessions.length);
    else if (key.downArrow) setIndex((i) => (i + 1) % sessions.length);
    else if (key.return) onSelect(sessions[index].code);
  });

  return (
    <Box flexDirection="column" height={height}>
      <Box borderStyle="single" borderColor={theme.primary} paddingX={1} flexDirection="column" flexGrow={1}>
        <Text bold>
          Chat precedenti <Text color={theme.muted}>(Esc chiudi)</Text>
        </Text>
        {sessions.length === 0 ? (
          <Text color={theme.muted}>(nessuna sessione precedente per questo agente)</Text>
        ) : (
          sessions.slice(0, Math.max(1, height - 4)).map((s, i) => (
            <Text key={s.code} wrap="truncate">
              {i === index ? <Text color={theme.primary}>&gt; </Text> : <Text>  </Text>}
              <Text bold={i === index}>{s.title || s.preview || s.code}</Text>
              <Text color={theme.muted}> · {s.code}</Text>
            </Text>
          ))
        )}
      </Box>
    </Box>
  );
}
