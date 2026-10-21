import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { theme } from "./theme.js";
import { COMMANDS } from "./commands.js";

/**
 * Overlay /help: l'elenco completo dei comandi (quelli della chat e quelli
 * della CLI) più le scorciatoie. Scorre con le frecce, Esc o Invio chiude.
 */
export function HelpOverlay({ height, onClose }: { height: number; onClose: () => void }) {
  const [offset, setOffset] = useState(0);

  // Righe utili: box con bordo (2) + titolo (1) + separatore (1) + voci.
  const listHeight = Math.max(4, height - 12);
  const maxOffset = Math.max(0, COMMANDS.length - listHeight);

  useInput((_input, key) => {
    if (key.escape || key.return) {
      onClose();
      return;
    }
    if (key.upArrow) setOffset((o) => Math.max(0, o - 1));
    if (key.downArrow) setOffset((o) => Math.min(maxOffset, o + 1));
  });

  const visible = COMMANDS.slice(offset, offset + listHeight);

  return (
    <Box flexDirection="column" height={height}>
      <Box borderStyle="single" borderColor={theme.primary} paddingX={1} flexDirection="column" flexGrow={1}>
        <Text bold>
          Comandi <Text color={theme.muted}>(Esc chiudi, ↑↓ scorri)</Text>
        </Text>
        {visible.map((c) => (
          <Text key={c.name} wrap="truncate">
            <Text color={theme.accent}>/{c.name}</Text>
            <Text color={theme.muted}> — {c.description}</Text>
          </Text>
        ))}
        {COMMANDS.length > listHeight ? (
          <Text color={theme.border}>
            {offset + 1}-{Math.min(COMMANDS.length, offset + listHeight)} di {COMMANDS.length}
          </Text>
        ) : null}
        <Text> </Text>
        <Text bold>Schede</Text>
        <Text color={theme.muted}>Ctrl+T nuova · Ctrl+W chiudi · Alt+1…9 vai · Alt+←/→ scorri</Text>
        <Text color={theme.muted}>/tabs elenco schede (Invio ne cambia)</Text>
        <Text> </Text>
        <Text bold>Scorciatoie</Text>
        <Text color={theme.muted}>Invio invia — Maiusc+Invio / Ctrl+J a capo — Esc interrompe/pulisce</Text>
        <Text color={theme.muted}>Tab menu-focus — Ctrl+B sidebar — Ctrl+C esce (salva tutto)</Text>
        <Text> </Text>
        <Text bold>Equivalenti dalla CLI</Text>
        <Text color={theme.muted}>agentcloud --help · agentcloud --version · agentcloud login · agentcloud logout</Text>
        <Text color={theme.muted}>agentcloud whoami · agentcloud usage · agentcloud agents catalog · agentcloud run</Text>
      </Box>
    </Box>
  );
}
