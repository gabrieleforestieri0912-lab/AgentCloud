import React from "react";
import { Box, Text } from "ink";
import { theme } from "./theme.js";
import type { SessionInfo } from "./App.js";
import type { AgentLimit } from "../api.js";

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
  limit,
}: {
  agent: string;
  cwd: string;
  online: boolean | null;
  session?: SessionInfo | null;
  /** Budget freemium: la fonte autorevole dei messaggi gratuiti residui. */
  limit?: AgentLimit | null;
}) {
  const conn =
    online === null ? (
      <Text color={theme.muted}>connessione…</Text>
    ) : online ? (
      <Text color={theme.success}>online</Text>
    ) : (
      <Text color={theme.error}>offline</Text>
    );
  // Residuo: prima il dato dell'API, altrimenti il budget freemium.
  const remaining =
    typeof session?.messagesRemaining === "number"
      ? session.messagesRemaining
      : limit && limit.unlimited === false
        ? limit.remaining
        : null;
  return (
    <Box>
      <Text color={theme.muted} wrap="truncate">
        {agent ? <Text color={theme.muted}>{agent} · </Text> : null}
        {cwd ? <>{cwd} · </> : null}
        {conn}
        {session?.plan ? <> · piano <Text color={theme.primary}>{session.plan}</Text></> : null}
        {remaining !== null ? (
          <> · msg gratuiti residui: <Text color={remaining > 0 ? theme.success : theme.error}>{remaining}</Text></>
        ) : null}
        <> · Ctrl+C esci · Esc interrompe · / comandi · Ctrl+T nuova scheda</>
      </Text>
    </Box>
  );
}
