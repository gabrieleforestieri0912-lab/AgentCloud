import React from "react";
import { Box, Text } from "ink";
import { theme } from "./theme.js";

/** Voce di un popup di selezione. */
export type PopupItem = {
  /** Chiave stabile: serve a React e a identificare la scelta. */
  key: string;
  label: string;
  /** Dettaglio grigio a destra (categoria, prezzo, stato…). */
  hint?: string;
};

/** Quante voci si vedono insieme: oltre, il popup scorre. */
export const MAX_POPUP_ROWS = 10;

/**
 * Popup di selezione, mostrato SOPRA la chat (come il menu dei comandi) e
 * non al posto suo: la conversazione resta visibile sotto, l'utente sceglie
 * e il popup sparisce.
 *
 * I tasti li gestisce l'App (frecce, Invio, Esc) per non litigare con
 * l'editor del testo: qui solo rendering.
 */
export function Popup({
  title,
  hint,
  items,
  selected,
  width,
  emptyText = "(niente da scegliere)",
  footer = "↑↓ scegli · Invio conferma · Esc annulla",
}: {
  title: string;
  hint?: string;
  items: PopupItem[];
  selected: number;
  width: number;
  emptyText?: string;
  footer?: string;
}) {
  const inner = Math.max(10, width - 4);
  // Finestra scorrevole: la voce evidenziata resta sempre visibile.
  const visible = Math.min(items.length, MAX_POPUP_ROWS);
  const start = Math.max(0, Math.min(selected - Math.floor(visible / 2), items.length - visible));
  const window = items.slice(start, start + visible);
  const above = start;
  const below = items.length - (start + visible);
  // I dettagli (categoria, prezzo, stato) incolonnati: il nome agenti ha
  // sempre la stessa larghezza, così l'elenco si legge come una tabella.
  const labelWidth = Math.min(
    28,
    Math.max(12, ...items.map((i) => i.label.length)),
  );

  return (
    <Box borderStyle="single" borderColor={theme.primary} paddingX={1} flexDirection="column">
      <Text bold color={theme.primary}>
        {title} {hint ? <Text color={theme.muted}>({hint})</Text> : null}
      </Text>
      {items.length === 0 ? (
        <Text color={theme.muted}>{emptyText}</Text>
      ) : (
        <>
          {above > 0 ? <Text color={theme.muted}>↑ altri {above} sopra</Text> : null}
          {window.map((item, i) => {
            const index = start + i;
            const label = item.label.padEnd(labelWidth);
            const detail = item.hint ?? "";
            return (
              <Text key={item.key} wrap="truncate">
                {index === selected ? (
                  <Text backgroundColor={theme.primary} color="#FFFFFF">
                    {" "}
                    {truncate(label, inner)} {truncate(detail, Math.max(0, inner - label.length))}
                    {" "}
                  </Text>
                ) : (
                  <>
                    <Text color={theme.accent}>{truncate(label, inner)}</Text>
                    {detail ? <Text color={theme.muted}> {truncate(detail, Math.max(0, inner - label.length))}</Text> : null}
                  </>
                )}
              </Text>
            );
          })}
          {below > 0 ? <Text color={theme.muted}>↓ altri {below} sotto</Text> : null}
        </>
      )}
      <Text color={theme.border}>{footer}</Text>
    </Box>
  );
}

function truncate(s: string, max: number): string {
  if (max <= 0) return "";
  if (s.length <= max) return s;
  if (max <= 1) return s.slice(0, max);
  return `${s.slice(0, max - 1)}…`;
}
