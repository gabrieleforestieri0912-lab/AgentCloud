import React from "react";
import { Box, Text, useStdout } from "ink";
import { gradientHexes, theme } from "./theme.js";

/**
 * Header della TUI: logo AgentCloud (gradiente truecolor quando disponibile,
 * colore piatto del tema altrimenti — Ink degrada i hex da solo), versione e
 * riga di stato (utente, piano, agente attivo).
 */
export function Header({
  version,
  email,
  plan,
  agentName,
}: {
  version: string;
  email?: string | null;
  plan?: string | null;
  agentName: string;
}) {
  const { stdout } = useStdout();
  // Separatore responsive: segue la larghezza reale del terminale (più
  // stretto, si accorcia; più largo, non sfora mai oltre il 3/4).
  const ruleWidth = Math.max(10, Math.min(60, Math.floor((stdout?.columns ?? 80) / 2)));
  const title = "AgentCloud";
  // Per-lettera: al truecolor copro tutta la striscia col gradiente
  // brand-500 → brand-400; sotto truecolor un solo colore (primary).
  const gradientHexList = gradientHexes(title);
  const chars = [...title];
  return (
    <Box flexDirection="column" paddingX={1} paddingBottom={0}>
      <Box flexDirection="row">
        {chars.map((ch, i) => (
          <Text bold key={i} color={gradientHexList ? gradientHexList[i] : theme.primary}>
            {ch}
          </Text>
        ))}
        <Text> </Text>
        <Text color={theme.muted}>v{version}</Text>
      </Box>
      <Text color={theme.border}>{"─".repeat(ruleWidth)}</Text>
      <Box flexDirection="row">
        <Text color={theme.muted}>
          {email ? <><Text color={theme.text}>{email}</Text> · </> : null}
          {plan ? <>piano <Text color={theme.primary}>{plan}</Text> · </> : null}
          agente{" "}
          <Text backgroundColor={theme.chipBg} color={theme.chipFg}>
            {" "}
            {agentName}
            {" "}
          </Text>
        </Text>
      </Box>
    </Box>
  );
}
