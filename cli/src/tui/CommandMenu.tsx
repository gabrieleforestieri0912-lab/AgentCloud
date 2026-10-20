import React from "react";
import { Box, Text } from "ink";
import { theme } from "./theme.js";
import type { CommandDef } from "./commands.js";

/**
 * Quante righe di comandi si vedono insieme. Il menu è più lungo del
 * registro (tutti i comandi della CLI devono essere visibili digitando
 * "/"), quindi scorre: la finestra segue la riga evidenziata.
 */
export const MAX_MENU_ROWS = 12;

/**
 * Menu a comparsa sopra l'input: generato dal registro comandi, filtrato
 * mentre si scrive. Navigazione e selezione le gestisce l'App (frecce,
 * Tab/Invio, Esc): qui solo rendering, riga attiva evidenziata.
 */
export function CommandMenu({
  commands,
  selected,
  width,
}: {
  commands: CommandDef[];
  selected: number;
  width: number;
}) {
  const inner = Math.max(10, width - 4);
  // Finestra scorrevole: la riga evidenziata resta sempre visibile.
  const visible = Math.min(commands.length, MAX_MENU_ROWS);
  const start = Math.max(0, Math.min(selected - Math.floor(visible / 2), commands.length - visible));
  const window = commands.slice(start, start + visible);
  const above = start;
  const below = commands.length - (start + visible);

  return (
    <Box borderStyle="single" borderColor={theme.primary} paddingX={1} flexDirection="column">
      {commands.length === 0 ? (
        <Text color={theme.muted}>(nessun comando — Esc per chiudere)</Text>
      ) : (
        <>
          {above > 0 ? <Text color={theme.muted}>↑ altri {above} sopra</Text> : null}
          {window.map((c, i) => {
            const index = start + i;
            return (
              <Text key={c.name} wrap="truncate">
                {index === selected ? (
                  <Text backgroundColor={theme.primary} color="#FFFFFF">
                    {" "}
                    /{c.name} <Text color="#FFFFFF">{truncate(c.description, Math.max(0, inner - c.name.length - 3))}</Text>{" "}
                  </Text>
                ) : (
                  <>
                    <Text color={theme.accent}>/{c.name}</Text>
                    <Text color={theme.muted}> {truncate(c.description, Math.max(0, inner - c.name.length - 3))}</Text>
                  </>
                )}
              </Text>
            );
          })}
          {below > 0 ? <Text color={theme.muted}>↓ altri {below} sotto</Text> : null}
        </>
      )}
    </Box>
  );
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  if (max <= 1) return s.slice(0, max);
  return `${s.slice(0, max - 1)}…`;
}
