import React, { useEffect, useState } from "react";
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
}: {
  onSubmit: (text: string) => void;
  streaming: boolean;
  onInterrupt: () => void;
  confirm: ConfirmState;
  onConfirm: (yes: boolean) => void;
  placeholder: string;
  onHeightChange?: (height: number) => void;
}) {
  const [lines, setLines] = useState<string[]>([""]);
  const [row, setRow] = useState(0);
  const [col, setCol] = useState(0);

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
    if (confirm) {
      const answer = input.toLowerCase();
      if (key.escape || answer === "n") onConfirm(false);
      else if (answer === "y" || key.return) onConfirm(true);
      return;
    }
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
      }
      return;
    }
    if (key.downArrow) {
      if (row < lines.length - 1) {
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
      const current = lines[row] ?? "";
      setLines(lines.map((l, i) => (i === row ? l.slice(0, col) + input + l.slice(col) : l)));
      setCol(col + input.length);
    }
  });

  if (confirm) {
    return (
      <Box borderStyle="single" borderColor={theme.warning} paddingX={1}>
        <Text>
          Confermi l'esecuzione di "{confirm.toolName}"? <Text color={theme.muted}>[y/N]</Text>
        </Text>
      </Box>
    );
  }

  return (
    <Box borderStyle="single" borderColor={theme.primary} paddingX={1} flexDirection="column">
      {streaming ? (
        <Text color={theme.muted}>L'agente sta rispondendo… (Esc per interrompere)</Text>
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
