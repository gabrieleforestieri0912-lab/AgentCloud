import React from "react";
import { Box, Text } from "ink";
import { theme } from "./theme.js";
import type { SessionInfo } from "./App.js";

/**
 * Barra di stato footer: agente, cartella di lavoro, connessione, piano e
 * residuo di messaggi gratuiti (solo se l'API espone il campo), più le
 * scorciatoie chiave.
 */
export function StatusBar({
  agent,
  cwd,
  online,
  session,
}: {
  agent: string;
  cwd: string;
  online: boolean | null;
  session?: SessionInfo | null;
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
      <Text color={theme.muted} wrap="truncate">
        {agent ? <Text color={theme.muted}>{agent} · </Text> : null}
        {cwd ? <>{cwd} · </> : null}
        {conn}
        {session?.plan ? <> · piano <Text color={theme.primary}>{session.plan}</Text></> : null}
        {typeof session?.messagesRemaining === "number" ? (
          <> · msg gratuiti residui: <Text color={session.messagesRemaining > 0 ? theme.success : theme.error}>{session.messagesRemaining}</Text></>
        ) : null}
        <> · Ctrl+C esci · Esc interrompe · / comandi</>
      </Text>
    </Box>
  );
}
