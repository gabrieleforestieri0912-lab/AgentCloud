import React from "react";
import { Box, Text, useInput } from "ink";
import { theme } from "./theme.js";
import { COMMANDS } from "./commands.js";

/** Overlay /help: comandi dal registro + scorciatoie. Esc o Invio chiude. */
export function HelpOverlay({ height, onClose }: { height: number; onClose: () => void }) {
  useInput((_input, key) => {
    if (key.escape || key.return) onClose();
  });

  return (
    <Box flexDirection="column" height={height}>
      <Box borderStyle="single" borderColor={theme.primary} paddingX={1} flexDirection="column" flexGrow={1}>
        <Text bold>
          Comandi <Text color={theme.muted}>(Esc chiudi)</Text>
        </Text>
        {COMMANDS.map((c) => (
          <Text key={c.name} wrap="truncate">
            <Text color={theme.accent}>/{c.name}</Text>
            <Text color={theme.muted}> — {c.description}</Text>
          </Text>
        ))}
        <Text> </Text>
        <Text bold>Scorciatoie</Text>
        <Text color={theme.muted}>Invio invia · Maiusc+Invio / Ctrl+J a capo · Esc interrompe/pulisce</Text>
        <Text color={theme.muted}>Tab menu-focus · Ctrl+B sidebar · Ctrl+C esce (salva tutto)</Text>
      </Box>
    </Box>
  );
}
