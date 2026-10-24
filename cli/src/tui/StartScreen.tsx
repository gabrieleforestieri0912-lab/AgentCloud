/**
 * Schermata iniziale della chat (prima del primo messaggio).
 *
 * - Banner "AgentCloud" a blocchi con ombra e gradiente brand: generato da
 *   `banner.ts` con funzioni PURE, qui solo la colorazione (runs fuse per
 *   colore, quindi pochi <Text> per riga e nessun costo di layout).
 * - Tagline attenuata + versione CLI.
 * - La larghezza arriva dal terminale a ogni render: al resize la stessa
 *   funzione pura ridisegna con la nuova misura (niente residui).
 * - Senza Unicode o sotto i 60 colonne: logo semplice su una riga.
 *
 * Palette e degradazione colore: solo `theme` + `colorLevel()`, mai hex
 * scritti a mano nei componenti.
 */
import React from "react";
import { Box, Text } from "ink";
import { localVersion } from "../update.js";
import { theme, colorLevel, supportsUnicode } from "./theme.js";
import { bannerVariant, bannerDesign, fillHexAt, type BannerDesign } from "./banner.js";

/** Merge di celle adiacenti con lo stesso colore in un solo span di testo. */
type Run = { text: string; color?: string };

function rowRuns(row: BannerDesign["rows"][number], design: BannerDesign): Run[] {
  const level = colorLevel();
  const runs: Run[] = [];
  let current: Run | null = null;
  row.forEach((cell, x) => {
    // Il fill prende il gradiente alla colonna x; ombra = tinta scura del
    // tema. Con palette ridotta o NO_COLOR si torna al colore piatto.
    let color: string | undefined;
    if (cell.kind === "shadow") color = level > 0 ? theme.shadow : undefined;
    else if (cell.kind === "fill" && cell.ch === "█") {
      color = level >= 3 ? fillHexAt(x, design.width) : level > 0 ? theme.primary : undefined;
    }
    if (current && current.color === color) current.text += cell.ch;
    else {
      current = { text: cell.ch, color };
      runs.push(current);
    }
  });
  return runs;
}

export function StartBanner({ columns }: { columns: number }) {
  const variant = bannerVariant(columns);
  const design = variant === "plain" || !supportsUnicode() ? null : bannerDesign(variant);
  if (!design) return null;
  return (
    <Box flexDirection="column" alignItems="flex-start">
      {design.rows.map((row, y) => (
        <Text key={y} wrap="truncate">
          {rowRuns(row, design).map((run, i) => (
            <Text key={i} color={run.color}>
              {run.text}
            </Text>
          ))}
        </Text>
      ))}
    </Box>
  );
}

/**
 * Blocco di benvenuto della schermata iniziale: banner + tagline/versione.
 * Senza Unicode o sotto i 60 colonne il banner a blocchi sparisce e resta
 * il logo semplice (una sola riga, mai spezzato).
 */
export function StartScreen({ columns }: { columns: number }) {
  const useBlocks = supportsUnicode() && bannerVariant(columns) !== "plain";
  const level = colorLevel();
  const fillColor = level > 0 ? theme.primary : undefined;
  return (
    <Box flexDirection="column" alignItems="center">
      {useBlocks ? (
        <StartBanner columns={columns} />
      ) : (
        <Text bold color={fillColor}>
          AgentCloud
        </Text>
      )}
      <Box marginTop={1}>
        <Text wrap="truncate">
          <Text color={theme.muted}>Gestisci agenti AI autonomi dal terminale</Text>
          <Text color={theme.muted}> · </Text>
          <Text bold color={fillColor}>
            v{localVersion()}
          </Text>
        </Text>
      </Box>
    </Box>
  );
}

/**
 * Riga di scorciatoie sotto l'input: tasti in accento, descrizione attenuata.
 * Una sola riga, troncata se il terminale è stretto.
 */
export function InputHints() {
  return (
    <Text wrap="truncate">
      <Text color={theme.accent}>Invio</Text>
      <Text color={theme.muted}> invia · </Text>
      <Text color={theme.accent}>/</Text>
      <Text color={theme.muted}> comandi · </Text>
      <Text color={theme.accent}>Ctrl+C</Text>
      <Text color={theme.muted}> esce</Text>
    </Text>
  );
}
