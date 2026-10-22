import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { theme } from "./theme.js";
import type { DiffLine } from "./fileChanges.js";

/**
 * Overlay diff a tutto schermo: Esc chiude, ↑↓ scorrono.
 *
 * Riceve righe già calcolate (singolo file o tutte le modifiche): il chiamante
 * decide il contenuto, qui solo rendering e navigazione. Monta solo quando è
 * aperto e possiede i suoi tasti: l'App ignora tutto (tranne Ctrl+C) mentre è
 * visibile, così non servono protocolli di focus.
 */
export function DiffOverlay({
  title,
  lines,
  height,
  onClose,
}: {
  title: string;
  lines: DiffLine[];
  height: number;
  onClose: () => void;
}) {
  const [offset, setOffset] = useState(0);
  const budget = Math.max(1, height - 4); // titolo + hint + bordi
  const maxOffset = Math.max(0, lines.length - budget);
  const visible = lines.slice(offset, offset + budget);

  useInput((_input, key) => {
    if (key.escape) onClose();
    else if (key.upArrow) setOffset((o) => Math.max(0, o - 1));
    else if (key.downArrow) setOffset((o) => Math.min(maxOffset, o + 1));
  });

  return (
    <Box flexDirection="column" height={height}>
      <Box
        borderStyle="single"
        borderColor={theme.primary}
        backgroundColor={theme.panelBg}
        paddingX={1}
        flexDirection="column"
        flexGrow={1}
      >
        <Text bold>
          {title} <Text color={theme.muted}>(Esc chiudi · ↑↓ scorri)</Text>
        </Text>
        {visible.length === 0 ? (
          <Text color={theme.muted}>(nessuna differenza)</Text>
        ) : (
          visible.map((l, i) => (
            <Text
              key={offset + i}
              color={l.kind === "+" ? theme.success : l.kind === "-" ? theme.error : l.kind === "@" ? theme.accent : undefined}
            >
              {l.kind === " " ? ` ${l.text}` : `${l.kind}${l.text}`}
            </Text>
          ))
        )}
      </Box>
    </Box>
  );
}
