import React, { useEffect, useRef, useState } from "react";
import { Box, Text, useInput } from "ink";
import { theme } from "./theme.js";

export type ConfirmState = { toolName: string } | null;

/**
 * Editor multilinea dell'input.
 *
 * - Invio invia, Maiusc+Invio (dove il terminale lo distingue) o Ctrl+J
 *   vanno a capo, frecce/backspace si muovono e cancellano.
 * - Esc a input pieno pulisce la riga; durante lo streaming interrompe.
 * - In modalità conferma (`confirm != null`) l'editor si spegne e i tasti
 *   y/n/Invio/Esc rispondono alla domanda.
 * - Tab è riservato al menu dei comandi (passo 4): qui ignorato.
 */
export function ChatInput({
  onSubmit,
  streaming,
  onInterrupt,
  confirm,
  onConfirm,
  placeholder,
  onHeightChange,
  focused,
  menuActive,
  preset,
  onDraftChange,
  resetKey,
}: {
  onSubmit: (text: string) => void;
  streaming: boolean;
  onInterrupt: () => void;
  confirm: ConfirmState;
  onConfirm: (yes: boolean) => void;
  placeholder: string;
  onHeightChange?: (height: number) => void;
  /** False quando il focus è sulla sidebar: l'editor ignora tutti i tasti. */
  focused: boolean;
  /** Menu comandi aperto: frecce/Invio/Tab/Esc li gestisce l'App. */
  menuActive: boolean;
  /** Testo imposto dall'esterno (suggerimento argomento, pulizia). */
  preset: { text: string; key: number } | null;
  /** Bozza corrente a ogni modifica (l'App apre/filtra il menu). */
  onDraftChange: (text: string) => void;
  /**
   * Cambia quando il contesto cambia (es. cambio scheda): l'editor si
   * svuota, così il testo della scheda precedente non resta a schermo.
   */
  resetKey?: string;
}) {
  const [lines, setLines] = useState<string[]>([""]);
  const [row, setRow] = useState(0);
  const [col, setCol] = useState(0);
  // Cronologia invii: ↑ richiama dalla coda, ↓ torna in avanti fino alla
  // bozza corrente. La bozza in corso non viene persa quando si naviga.
  const historyRef = useRef<string[]>([]);
  const historyIdxRef = useRef<number | null>(null);
  const draftRef = useRef<string>("");
  const appliedPreset = useRef(0);

  // Testo imposto dall'esterno: si applica una volta sola per chiave.
  useEffect(() => {
    if (!preset || preset.key === appliedPreset.current) return;
    appliedPreset.current = preset.key;
    const parts = preset.text.split("\n");
    setLines(parts.length > 0 ? parts : [""]);
    setRow(parts.length - 1);
    setCol((parts[parts.length - 1] ?? "").length);
  }, [preset]);

  // Cambio di contesto (nuova scheda): la cronologia degli invii non
  // viene più riproposta (appartiene all'altra scheda). Il testo invece
  // lo imposta il `preset` con la bozza della scheda di destinazione.
  useEffect(() => {
    historyRef.current = [];
    historyIdxRef.current = null;
    draftRef.current = "";
  }, [resetKey]);

  // Bozza all'App a ogni modifica (menu comandi).
  useEffect(() => {
    onDraftChange(lines.join("\n"));
  }, [lines, onDraftChange]);

  const height = confirm ? 3 : lines.length + 2;
  useEffect(() => {
    onHeightChange?.(height);
  }, [height, onHeightChange]);

  const insertNewline = () => {
    const current = lines[row] ?? "";
    const next = [...lines];
    next[row] = current.slice(0, col);
    next.splice(row + 1, 0, current.slice(col));
    setLines(next);
    setRow(row + 1);
    setCol(0);
  };

  useInput((input, key) => {
    // Focus altrove (sidebar) o overlay diff aperto: nessun tasto all'editor.
    if (!focused) return;
    if (confirm) {
      const answer = input.toLowerCase();
      if (key.escape || answer === "n") onConfirm(false);
      else if (answer === "y" || key.return) onConfirm(true);
      return;
    }
    // Menu comandi aperto: frecce/Invio/Tab/Esc li gestisce l'App, qui passa
    // solo la digitazione (il menu si filtra mentre si scrive).
    if (menuActive && (key.escape || key.return || key.tab || key.upArrow || key.downArrow)) return;
    if (key.escape) {
      if (streaming) {
        onInterrupt();
        return;
      }
      if (lines.some((l) => l !== "")) {
        setLines([""]);
        setRow(0);
        setCol(0);
      }
      return;
    }
    if (key.ctrl && input === "c") return; // uscita gestita a livello App
    if (streaming) return; // durante la risposta l'input è in sola attesa
    if (key.return) {
      if (key.shift) {
        insertNewline();
        return;
      }
      const text = lines.join("\n");
      if (text.trim()) {
        historyRef.current = [...historyRef.current.filter((h) => h !== text), text].slice(-100);
        historyIdxRef.current = null;
        draftRef.current = "";
        setLines([""]);
        setRow(0);
        setCol(0);
        onSubmit(text);
      }
      return;
    }
    if (key.ctrl && input === "j") {
      insertNewline(); // fallback dove Maiusc+Invio non si distingue da Invio
      return;
    }
    if (key.upArrow) {
      if (row > 0) {
        const nextRow = row - 1;
        setRow(nextRow);
        setCol(Math.min(col, (lines[nextRow] ?? "").length));
      } else if (historyRef.current.length > 0 && historyIdxRef.current === null) {
        // Primo ↑ in riga singola: parte dall'ultimo invio.
        draftRef.current = lines.join("\n");
        historyIdxRef.current = historyRef.current.length - 1;
        const item = historyRef.current[historyIdxRef.current];
        setLines(item.split("\n"));
        setRow(0);
        setCol(0);
      } else if (historyRef.current.length > 0 && historyIdxRef.current !== null && historyIdxRef.current > 0) {
        historyIdxRef.current -= 1;
        setLines(historyRef.current[historyIdxRef.current].split("\n"));
        setRow(0);
        setCol(0);
      }
      return;
    }
    if (key.downArrow) {
      if (historyIdxRef.current !== null) {
        if (historyIdxRef.current < historyRef.current.length - 1) {
          historyIdxRef.current += 1;
          setLines(historyRef.current[historyIdxRef.current].split("\n"));
          setRow(0);
          setCol(0);
        } else {
          // Oltre l'ultimo: si torna alla bozza che c'era prima di ↑.
          historyIdxRef.current = null;
          const restored = draftRef.current === "" ? [""] : draftRef.current.split("\n");
          setLines(restored);
          setRow(restored.length - 1);
          setCol(restored[restored.length - 1]?.length ?? 0);
        }
      } else if (row < lines.length - 1) {
        const nextRow = row + 1;
        setRow(nextRow);
        setCol(Math.min(col, (lines[nextRow] ?? "").length));
      }
      return;
    }
    if (key.leftArrow) {
      if (col > 0) setCol(col - 1);
      else if (row > 0) {
        setRow(row - 1);
        setCol((lines[row - 1] ?? "").length);
      }
      return;
    }
    if (key.rightArrow) {
      const len = (lines[row] ?? "").length;
      if (col < len) setCol(col + 1);
      else if (row < lines.length - 1) {
        setRow(row + 1);
        setCol(0);
      }
      return;
    }
    if (key.backspace || key.delete) {
      const current = lines[row] ?? "";
      if (key.backspace) {
        if (col > 0) {
          setLines(lines.map((l, i) => (i === row ? l.slice(0, col - 1) + l.slice(col) : l)));
          setCol(col - 1);
        } else if (row > 0) {
          const prev = lines[row - 1] ?? "";
          const next = [...lines];
          next.splice(row, 1);
          next[row - 1] = prev + current;
          setLines(next);
          setRow(row - 1);
          setCol(prev.length);
        }
      } else if (col < current.length) {
        setLines(lines.map((l, i) => (i === row ? l.slice(0, col) + l.slice(col + 1) : l)));
      } else if (row < lines.length - 1) {
        const next = [...lines];
        next.splice(row + 1, 1);
        next[row] = current + (lines[row + 1] ?? "");
        setLines(next);
      }
      return;
    }
    if (key.tab) return; // menu comandi (passo 4)
    if (!key.ctrl && !key.meta && input) {
      setLines(lines.map((l, i) => (i === row ? l.slice(0, col) + input + l.slice(col) : l)));
      setCol(col + input.length);
    }
  });

  if (confirm) {
    return (
      <Box borderStyle="single" borderColor={focused ? theme.warning : theme.border} paddingX={1}>
        <Text>
          Confermi l&apos;esecuzione di &quot;{confirm.toolName}&quot;? <Text color={theme.muted}>[y/N]</Text>
        </Text>
      </Box>
    );
  }

  return (
    <Box borderStyle="single" borderColor={focused ? theme.primary : theme.border} paddingX={1} flexDirection="column">
      {streaming ? (
        <Text color={theme.muted}>L&apos;agente sta rispondendo… (Esc per interrompere)</Text>
      ) : (
        lines.map((line, i) => (
          <CursorLine key={i} line={line} col={i === row ? col : -1} placeholder={placeholder} />
        ))
      )}
    </Box>
  );
}

/** Riga con cursore a blocco; col < 0 = riga non attiva. */
function CursorLine({ line, col, placeholder }: { line: string; col: number; placeholder: string }) {
  if (col < 0) return <Text>{line === "" ? " " : line}</Text>;
  const c = Math.min(col, line.length);
  const before = line.slice(0, c);
  const at = line.slice(c, c + 1) || " ";
  const after = line.slice(c + 1);
  return (
    <Text>
      {before}
      <Text inverse>{at}</Text>
      {after}
      {line === "" && placeholder ? <Text color={theme.muted}> {placeholder}</Text> : null}
    </Text>
  );
}
