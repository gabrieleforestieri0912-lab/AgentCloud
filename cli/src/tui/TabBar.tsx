import React from "react";
import { Box, Text } from "ink";
import { theme } from "./theme.js";

/** Scheda da mostrare nella barra. */
export type TabInfo = {
  id: string;
  /** Titolo della chat (sidebar): il nome dell'agente finché non si rinomina. */
  title: string;
  agentName: string;
  /** true = l'agente sta rispondendo in questa scheda. */
  streaming: boolean;
  /** true = la scheda ha una conferma di tool in attesa. */
  pending: boolean;
};

/**
 * Barra delle schede, sopra la chat.
 *
 * Come in OpenCode: una riga con le schede aperte, quella attiva
 * evidenziata. Ogni scheda mostra il suo numero (1, 2, 3…) così si può
 * saltare a una scheda con Alt+numero, e un pallino quando l'agente sta
 * rispondendo in background.
 */
export function TabBar({
  tabs,
  activeId,
  width,
}: {
  tabs: TabInfo[];
  activeId: string;
  width: number;
}) {
  if (tabs.length === 0) return null;
  // Ogni scheda ha una sua quota di larghezza: con molte schede i titoli
  // si accorciano invece di mandare la barra a capo (una riga sola).
  const overhead = 6; // separatore + numero + spazi
  const per = Math.max(8, Math.floor((width - tabs.length * overhead) / tabs.length));
  return (
    <Box flexDirection="row">
      {tabs.map((t, i) => {
        const active = t.id === activeId;
        const label = truncate(t.title, per - 3);
        return (
          <Text key={t.id} wrap="truncate">
            {active ? (
              <Text backgroundColor={theme.primary} color="#FFFFFF">
                {" "}
                {i + 1} {label}
                {" "}
              </Text>
            ) : (
              <Text color={theme.muted}>
                {" "}
                {i + 1} {label}{" "}
              </Text>
            )}
            {t.streaming ? <Text color={theme.accent}>●</Text> : null}
            {t.pending ? <Text color={theme.warning}>!</Text> : null}
          </Text>
        );
      })}
    </Box>
  );
}

function truncate(s: string, max: number): string {
  if (max <= 0) return "";
  if (s.length <= max) return s;
  if (max <= 1) return s.slice(0, max);
  return `${s.slice(0, max - 1)}…`;
}
