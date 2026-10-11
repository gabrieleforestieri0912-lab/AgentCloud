import React from "react";
import { Box, Text } from "ink";
import { theme } from "./theme.js";

/** Barra di stato sotto l'input: agente, cartella di lavoro, connessione. */
export function StatusBar({
  agent,
  cwd,
  online,
}: {
  agent: string;
  cwd: string;
  online: boolean | null;
}) {
  const conn =
    online === null ? (
      <Text color={theme.muted}>connessione…</Text>
    ) : online ? (
      <Text color={theme.success}>online</Text>
    ) : (
      <Text color={theme.error}>offline</Text>
    );
  return (
    <Box>
      <Text>
        <Text color={theme.muted}>{agent}</Text>
        <Text color={theme.muted}> · </Text>
        <Text color={theme.muted}>{cwd}</Text>
        <Text color={theme.muted}> · </Text>
        {conn}
      </Text>
    </Box>
  );
}
