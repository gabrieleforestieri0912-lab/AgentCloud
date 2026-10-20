import React, { useEffect, useState } from "react";
import { Box, Text } from "ink";
import { theme } from "./theme.js";
import { estimateLines, visibleFromEnd } from "./measure.js";
import { Markdown } from "./markdown.js";
import type { AgentLimit } from "../api.js";

/** Sito AgentCloud: i link (abbonamento agli agenti). */
const SITE = "https://www.agentcloud.agency";

export type ToolStepState = "running" | "done" | "error";

export type ToolStep = {
  name: string;
  state: ToolStepState;
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
  /** Card compatte dei tool/integrazioni viste durante il turno. */
  tools?: ToolStep[];
  /**
   * Titolo di un blocco di output della CLI (comandi `/`): non entra nella
   * cronologia inviata all'agente, resta solo a schermo.
   */
  system?: string;
};

/** Cursore animato a fine stream: lampeggia su/sotto. */
function StreamCursor() {
  const [on, setOn] = useState(true);
  useEffect(() => {
    const t = setInterval(() => setOn((b) => !b), 400);
    return () => clearInterval(t);
  }, []);
  return <Text color={theme.primary}>{on ? "▌" : " "}</Text>;
}

/** Card compatta di un tool/integrazione del turno corrente. */
function ToolCard({ step }: { step: ToolStep }) {
  const icon =
    step.state === "running" ? (
      <Text color={theme.warning}>◔</Text>
    ) : step.state === "done" ? (
      <Text color={theme.success}>✓</Text>
    ) : (
      <Text color={theme.error}>✗</Text>
    );
  return (
    <Text wrap="truncate">
      <Text color={theme.border}>│ </Text>
      {icon}
      <Text> </Text>
      <Text color={step.state === "running" ? theme.text : theme.muted}>{step.name}</Text>
      <Text color={theme.muted}>
        {step.state === "running" ? " · in esecuzione" : step.state === "done" ? "" : " · errore"}
      </Text>
    </Text>
  );
}

/**
 * Viewport della conversazione: mostra la coda dei messaggi che sta nel
 * budget di righe. Il taglio avviene sempre tra messaggi interi, MA
 * l'ultimo messaggio viene ridimensionato per entrare: senza questo un
 * output lungo (il catalogo, un JSON, una risposta lunga) finirebbe fuori
 * schermo e l'utente non vedrebbe nulla.
 *
 * Nel blocco di sistema si mostra la testa (l'inizio dell'output), nei
 * messaggi dell'agente la coda (la parte finale della risposta).
 * Lo streaming fa crescere l'ultimo messaggio e la vista resta ancorata in
 * basso da sola, senza stato di scroll da gestire.
 */
export function Chat({
  messages,
  agentName,
  width,
  maxHeight,
  agentSlug,
  limit,
}: {
  messages: ChatMessage[];
  agentName: string;
  width: number;
  maxHeight: number;
  /** Slug dell'agente attivo: serve al link di abbonamento. */
  agentSlug?: string;
  /** Budget freemium: se non è "unlimited" l'utente è in prova gratuita. */
  limit?: AgentLimit | null;
}) {
  const budget = Math.max(1, maxHeight);
  const lengths = messages.map((m) => heightOf(m, width));
  // `visibleFromEnd` scarta i messaggi che non entrano: ma l'ultimo deve
  // restare visibile comunque (tagliato dentro `fitMessage`), altrimenti un
  // output lungo sparirebbe del tutto.
  let start = visibleFromEnd(lengths, budget);
  if (start >= messages.length && messages.length > 0) start = messages.length - 1;
  const visible = messages.slice(start);
  // Righe disponibili per l'ultimo messaggio visibile.
  const others = visible.slice(0, -1).reduce((acc, _m, i) => acc + lengths[start + i], 0);
  const lastIndex = visible.length - 1;

  return (
    <Box flexDirection="column" paddingX={1}>
      {messages.length === 0 ? (
        <EmptyState agentName={agentName} agentSlug={agentSlug ?? ""} limit={limit ?? null} />
      ) : null}
      {visible.map((m, i) => {
        const isLast = i === lastIndex;
        const allowed = isLast ? budget - others : lengths[start + i];
        const fitted = isLast ? fitMessage(m, allowed, width) : m;
        return fitted.system ? (
          <SystemBlock key={start + i} title={fitted.system} content={fitted.content} />
        ) : fitted.role === "user" ? (
          <Box key={start + i} flexDirection="column" marginBottom={0}>
            <Text bold color={theme.primary}>
              ❯ tu
            </Text>
            <Text>{fitted.content}</Text>
          </Box>
        ) : (
          <Box key={start + i} flexDirection="column" marginBottom={0}>
            <Text bold color={theme.success}>
              ● {agentName}
            </Text>
            {fitted.tools && fitted.tools.length > 0 ? (
              <Box flexDirection="column" marginBottom={0}>
                {fitted.tools.map((s, k) => (
                  <ToolCard key={`${start + i}-tool-${k}`} step={s} />
                ))}
              </Box>
            ) : null}
            {fitted.streaming && !fitted.content && !fitted.tools?.length ? <Text color={theme.muted}>…</Text> : null}
            <Markdown text={fitted.content} />
            {fitted.streaming ? <StreamCursor /> : null}
          </Box>
        );
      })}
    </Box>
  );
}

/** Righe occupate da un messaggio (con blocchi di sistema e card tool). */
function heightOf(m: ChatMessage, width: number): number {
  if (m.system) return estimateLines(m.content, Math.max(10, width - 6)) + 3;
  return estimateLines(m.content, width) + 2 + (m.tools ? m.tools.length : 0);
}

/**
 * Riduce il messaggio al budget di righe disponibile.
 * - blocco di sistema: si tiene la testa + un avviso sulle righe tagliate;
 * - messaggio dell'agente: si tiene la coda (la parte finale della risposta).
 */
function fitMessage(m: ChatMessage, allowed: number, width: number): ChatMessage {
  if (allowed <= 0) return { ...m, content: "" };
  if (heightOf(m, width) <= allowed) return m;

  if (m.system) {
    const overhead = 3;
    const room = Math.max(1, allowed - overhead - 1); // -1: riga dell'avviso
    const lines = m.content.split("\n");
    const kept = lines.slice(0, room);
    const hidden = lines.length - kept.length;
    return {
      ...m,
      content: [...kept, `… altre ${hidden} righe (comando /${m.system})`].join("\n"),
    };
  }

  const overhead = 2 + (m.tools ? m.tools.length : 0);
  const room = Math.max(1, allowed - overhead);
  const lines = m.content.split("\n");
  const kept = lines.slice(Math.max(0, lines.length - room));
  const hidden = lines.length - kept.length;
  return {
    ...m,
    content: hidden > 0 ? `… (${hidden} righe sopra)\n${kept.join("\n")}` : kept.join("\n"),
  };
}

/**
 * Chat vuota: il benvenuto dell'agente e, se l'utente è ancora in prova
 * gratuita, il link per abbonarsi all'agente che sta usando (sopra il
 * benvenuto, come nel paywall della chat web).
 */
function EmptyState({
  agentName,
  agentSlug,
  limit,
}: {
  agentName: string;
  agentSlug: string;
  limit: AgentLimit | null;
}) {
  const inFreeTrial = limit !== null && limit.unlimited === false;
  const subscribeUrl = `${SITE}/agents/${agentSlug}`;
  return (
    <Box flexDirection="column">
      {inFreeTrial && limit ? (
        <Box flexDirection="column" borderStyle="single" borderColor={theme.warning} paddingX={1}>
          <Text bold color={theme.warning}>
            Prova gratuita
          </Text>
          {limit.remaining > 0 ? (
            <Text color={theme.muted}>
              Restano <Text color={theme.warning}>{limit.remaining}</Text> messaggi gratuiti su{" "}
              {limit.limit} al giorno.
            </Text>
          ) : (
            <Text color={theme.error}>
              Hai usato i {limit.limit} messaggi gratuiti di oggi: si ripartisce a mezzanotte.
            </Text>
          )}
          <Text color={theme.muted}>
            Abbonati a <Text color={theme.text}>{agentName}</Text> e usa l&apos;agente senza limiti:
          </Text>
          <Text color={theme.primary}>{subscribeUrl}</Text>
        </Box>
      ) : null}
      <Box flexDirection="column" marginTop={1}>
        <Text bold color={theme.success}>
          ● {agentName}
        </Text>
        <Text color={theme.text}>
          Ciao! Sono {agentName}. Dimmi cosa ti serve e ci penso io.
        </Text>
        <Text color={theme.muted}>
          Scrivi qui sotto e premi Invio · / per i comandi · Esc interrompe la risposta
        </Text>
      </Box>
    </Box>
  );
}

/**
 * Blocco di output della CLI (output di un comando `/`): riquadro con bordo,
 * titolo e righe in grigio. Resta a schermo ma non entra nella cronologia
 * inviata all'agente.
 */
function SystemBlock({ title, content }: { title: string; content: string }) {
  return (
    <Box flexDirection="column" borderStyle="single" borderColor={theme.border} paddingX={1}>
      <Text bold color={theme.accent}>
        ▌ {title}
      </Text>
      {content.split("\n").map((line, i) => (
        <Text key={i} color={theme.muted} wrap="truncate">
          {line === "" ? " " : line}
        </Text>
      ))}
    </Box>
  );
}
