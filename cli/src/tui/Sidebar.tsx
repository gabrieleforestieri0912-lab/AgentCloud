import React from "react";
import { Box, Text } from "ink";
import { theme } from "./theme.js";
import type { FileOp, TrackedFile } from "./fileChanges.js";

const SIDEBAR_WIDTH = 32;

function opMark(op: FileOp): { symbol: string; color: string } {
  if (op === "created") return { symbol: "+", color: theme.success };
  if (op === "modified") return { symbol: "~", color: theme.warning };
  return { symbol: "-", color: theme.error };
}

function shortName(name: string, max: number): string {
  if (name.length <= max) return name;
  if (max <= 3) return name.slice(0, max);
  const keep = max - 1;
  const head = Math.ceil(keep / 2);
  return `${name.slice(0, head)}…${name.slice(name.length - (keep - head))}`;
}

/**
 * Pannello destro: titolo chat + modifiche della sessione + totali.
 *
 * Righe a budget fisso (maxRows): la lista è finestrata attorno alla
 * selezione così non rompe mai il layout. `focused` colora il bordo e abilita
 * i tasti (↑↓ seleziona, Invio diff, u/r undo/redo) gestiti a livello App.
 */
export function Sidebar({
  title,
  files,
  totals,
  selected,
  focused,
  maxRows,
}: {
  title: string;
  files: TrackedFile[];
  totals: { count: number; added: number; removed: number };
  selected: number;
  focused: boolean;
  maxRows: number;
}) {
  // Larghezza utile: il pannello è di 32 colonne, ma dentro ci sono i due
  // bordi e i due padding: il testo può occupare 28 colonne, non 30 (con 30
  // le righe più lunghe venivano tagliate dal riquadro).
  const inner = SIDEBAR_WIDTH - 4;
  const headerRows = 6; // titolo(2) + label(1) + totali(1) + hint(2)
  const listBudget = Math.max(1, maxRows - headerRows);
  const start =
    files.length <= listBudget
      ? 0
      : Math.min(Math.max(0, selected - Math.floor((listBudget - 1) / 2)), files.length - listBudget);
  const visible = files.slice(start, start + listBudget);

  return (
    <Box
      width={SIDEBAR_WIDTH}
      flexShrink={0}
      flexDirection="column"
      borderStyle="single"
      borderColor={focused ? theme.primary : theme.border}
      paddingX={1}
    >
      <Text color={theme.muted}>CHAT</Text>
      <Text bold wrap="truncate">
        {shortName(title, inner * 2)}
      </Text>
      <Text color={theme.muted}>MODIFICHE ({files.length})</Text>
      {visible.length === 0 ? (
        <Text color={theme.muted}>(nessuna modifica)</Text>
      ) : (
        visible.map((f, i) => {
          const mark = opMark(f.op);
          const stats = `+${f.added} -${f.removed}`;
          const name = shortName(f.filename, Math.max(4, inner - stats.length - 4));
          const active = start + i === selected && focused;
          return (
            <Text key={f.filename} wrap="truncate">
              {active ? (
                // Riga selezionata: riempimento pieno (stile OpenCode).
                // " +file +aggiunto -rimosso": 1 + 1 + 1 + nome + 1 + "+n" + 1 + "-n"
                <Text backgroundColor={theme.selectBg} color={theme.selectFg}>
                  {" "}
                  {mark.symbol} {name} +{f.added} -{f.removed}
                  {" ".repeat(Math.max(0, inner - (name.length + stats.length + 4)))}
                </Text>
              ) : (
                <>
                  {start + i === selected ? <Text color={theme.primary}>&gt; </Text> : <Text>  </Text>}
                  <Text color={mark.color}>{mark.symbol} </Text>
                  {name} <Text color={theme.success}>+{f.added}</Text>{" "}
                  <Text color={theme.error}>-{f.removed}</Text>
                </>
              )}
            </Text>
          );
        })
      )}
      <Text>
        <Text bold>{totals.count} file</Text>
        <Text color={theme.muted}> · </Text>
        <Text color={theme.success}>+{totals.added}</Text>
        <Text color={theme.muted}> </Text>
        <Text color={theme.error}>-{totals.removed}</Text>
      </Text>
      <Text color={theme.muted}>Tab focus · Invio diff</Text>
      <Text color={theme.muted}>u annulla · r ripristina</Text>
    </Box>
  );
}

export { SIDEBAR_WIDTH };
