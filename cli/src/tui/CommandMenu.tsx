import React from "react";
import { Box, Text } from "ink";
import { theme } from "./theme.js";
import type { CommandDef } from "./commands.js";

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
  return (
    <Box borderStyle="single" borderColor={theme.primary} paddingX={1} flexDirection="column">
      {commands.length === 0 ? (
        <Text color={theme.muted}>(nessun comando — Esc per chiudere)</Text>
      ) : (
        commands.slice(0, 8).map((c, i) => (
          <Text key={c.name} wrap="truncate">
            {i === selected ? (
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
        ))
      )}
      {commands.length > 8 ? <Text color={theme.muted}>…altri {commands.length - 8} (continua a scrivere)</Text> : null}
    </Box>
  );
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  if (max <= 1) return s.slice(0, max);
  return `${s.slice(0, max - 1)}…`;
}
