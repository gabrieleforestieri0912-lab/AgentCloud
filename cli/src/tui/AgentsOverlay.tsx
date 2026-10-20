import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { theme } from "./theme.js";

/** Voce del selettore agenti. */
export type AgentChoice = {
  slug: string;
  name: string;
  category?: string;
  price?: string;
};

/**
 * Overlay /agents: gli agenti posseduti dall'account, recenti in cima
 * (l'ordine arriva da /api/extension/session). ↑↓ seleziona, Invio passa a
 * quell'agente (la conversazione riparte), Esc chiude.
 */
export function AgentsOverlay({
  agents,
  current,
  height,
  onSelect,
  onClose,
}: {
  agents: AgentChoice[];
  current: string;
  height: number;
  onSelect: (slug: string) => void;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);

  useInput((_input, key) => {
    if (key.escape) {
      onClose();
      return;
    }
    if (agents.length === 0) return;
    if (key.upArrow) setIndex((i) => (i - 1 + agents.length) % agents.length);
    else if (key.downArrow) setIndex((i) => (i + 1) % agents.length);
    else if (key.return) onSelect(agents[Math.min(index, agents.length - 1)].slug);
  });

  return (
    <Box flexDirection="column" height={height}>
      <Box borderStyle="single" borderColor={theme.primary} paddingX={1} flexDirection="column" flexGrow={1}>
        <Text bold>
          I tuoi agenti <Text color={theme.muted}>(Esc chiudi — Invio cambia agente)</Text>
        </Text>
        {agents.length === 0 ? (
          <Text color={theme.muted}>
            (nessun agente attivo — guarda il catalogo su www.agentcloud.agency/agents)
          </Text>
        ) : (
          agents.slice(0, Math.max(1, height - 4)).map((a, i) => (
            <Text key={a.slug} wrap="truncate">
              {i === index ? <Text color={theme.primary}>&gt; </Text> : <Text>  </Text>}
              <Text bold={i === index}>{a.name}</Text>
              <Text color={theme.muted}>
                {" "}
                {a.slug === current ? "· attivo" : ""} {a.category && a.price ? `· ${a.category} · ${a.price}` : a.category ? `· ${a.category}` : ""}
              </Text>
            </Text>
          ))
        )}
      </Box>
    </Box>
  );
}
