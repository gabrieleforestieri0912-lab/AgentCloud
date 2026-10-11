import React, { useRef, useState } from "react";
import { Box, Text, render, useApp, useInput, useStdout } from "ink";
import path from "node:path";
import { ApiError, streamAgent } from "../api.js";
import { theme } from "./theme.js";
import { Chat, type ChatMessage } from "./Chat.js";
import { ChatInput, type ConfirmState } from "./Input.js";
import { StatusBar } from "./StatusBar.js";

export type TuiResult = ChatMessage[];

/** Entra nell'alternate screen; l'uscita ripristina sempre il terminale. */
function enterAltScreen(): void {
  process.stdout.write("\x1b[?1049h\x1b[H");
}

function leaveAltScreen(): void {
  process.stdout.write("\x1b[?1049l");
}

/**
 * Avvia la TUI chat e risolve con i messaggi finali all'uscita.
 *
 * Lo schermo alternativo si lascia in `finally`: anche con Ctrl+C o crash
 * il terminale torna come prima. Il chiamante stampa dopo (codice di ripresa
 * sessione), quando lo schermo è già ripristinato e il testo resta visibile.
 */
export async function runChatTui(opts: {
  agent: string;
  agentName: string;
  initial: ChatMessage[];
}): Promise<TuiResult> {
  enterAltScreen();
  try {
    let result: ChatMessage[] = opts.initial;
    const { waitUntilExit } = render(
      <App agent={opts.agent} agentName={opts.agentName} initial={opts.initial} onExit={(m) => { result = m; }} />,
      { exitOnCtrlC: false },
    );
    await waitUntilExit();
    return result;
  } finally {
    leaveAltScreen();
  }
}

function stripFlags(messages: ChatMessage[]): Array<{ role: "user" | "assistant"; content: string }> {
  return messages.map(({ role, content }) => ({ role, content }));
}

function App({
  agent,
  agentName,
  initial,
  onExit,
}: {
  agent: string;
  agentName: string;
  initial: ChatMessage[];
  onExit: (messages: ChatMessage[]) => void;
}) {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const rows = stdout?.rows ?? 24;
  const columns = stdout?.columns ?? 80;

  // Cronologia in ref + tick di render: gli append dello streaming non devono
  // passare per chiusure stale dei setState dentro callback asincrone.
  const msgsRef = useRef<ChatMessage[]>(initial);
  const [, setTick] = useState(0);
  const touch = () => setTick((t) => t + 1);

  const [streaming, setStreaming] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const pendingRef = useRef<{ toolName: string; token: string } | null>(null);
  const confirmResolve = useRef<((yes: boolean) => void) | null>(null);
  const [activity, setActivity] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [online, setOnline] = useState<boolean | null>(null);
  const [inputHeight, setInputHeight] = useState(3);
  const abortRef = useRef<AbortController | null>(null);
  const finishedRef = useRef(false);

  const pushMsg = (m: ChatMessage) => {
    msgsRef.current = [...msgsRef.current, m];
    touch();
  };
  const patchLast = (fn: (m: ChatMessage) => ChatMessage) => {
    const arr = [...msgsRef.current];
    arr[arr.length - 1] = fn(arr[arr.length - 1]);
    msgsRef.current = arr;
    touch();
  };
  const dropLast = () => {
    msgsRef.current = msgsRef.current.slice(0, -1);
    touch();
  };

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    abortRef.current?.abort();
    onExit(msgsRef.current.map(({ role, content }) => ({ role, content })));
    exit();
  };

  useInput((input, key) => {
    if (key.ctrl && input === "c") finish();
  });

  const askConfirm = (toolName: string): Promise<boolean> =>
    new Promise((resolve) => {
      confirmResolve.current = resolve;
      setConfirm({ toolName });
    });

  const answerConfirm = (yes: boolean) => {
    const resolve = confirmResolve.current;
    confirmResolve.current = null;
    setConfirm(null);
    resolve?.(yes);
  };

  const handleStreamEvent = (event: Record<string, unknown>) => {
    if (event.type === "text" && typeof event.content === "string") {
      const chunk = event.content;
      patchLast((m) => ({ ...m, content: m.content + chunk }));
    } else if (event.type === "tool_start") {
      setActivity(`[tool: ${String(event.toolName)}]`);
    } else if (event.type === "tool_done") {
      setActivity(`[done: ${String(event.toolName)}]`);
    } else if (event.type === "file" && typeof event.filename === "string") {
      setActivity(`[file: ${String(event.filename)}]`);
    } else if (event.type === "connection" && typeof event.provider === "string") {
      setActivity(`[connetti ${event.provider} dal sito: dashboard/integrazioni]`);
    } else if (event.type === "tool_confirm") {
      pendingRef.current = {
        token: typeof event.token === "string" ? event.token : "",
        toolName: String(event.toolName || "tool"),
      };
    } else if (event.type === "error") {
      throw new Error(String(event.message || "Errore agente"));
    }
  };

  const runTurn = async (text: string) => {
    setNotice(null);
    setActivity(null);
    pushMsg({ role: "user", content: text });
    pushMsg({ role: "assistant", content: "", streaming: true });
    setStreaming(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      let approvalToken: string | undefined;
      // Come runWithApproval della CLI classica: max 5 conferme per run.
      for (let round = 0; round < 5; round++) {
        pendingRef.current = null;
        await streamAgent(
          agent,
          stripFlags(msgsRef.current),
          handleStreamEvent,
          approvalToken ? { approvalToken, signal: ctrl.signal } : { signal: ctrl.signal },
        );
        const pending = pendingRef.current as { toolName: string; token: string } | null;
        if (!pending) break;
        const yes = await askConfirm(pending.toolName);
        if (!yes) {
          patchLast((m) => ({ ...m, content: `${m.content}\n_(operazione annullata)_` }));
          break;
        }
        approvalToken = pending.token;
      }
      setOnline(true);
    } catch (error) {
      if ((error as Error)?.name === "AbortError" || ctrl.signal.aborted) {
        patchLast((m) => ({ ...m, content: `${m.content}\n_(interrotto)_` }));
      } else if (error instanceof ApiError) {
        // Come la CLI classica: l'errore non entra in cronologia, resta il
        // messaggio utente e si mostra l'avviso. Il server ha risposto:
        // la connessione c'è.
        dropLast();
        setNotice(`Errore ${error.status}: ${error.message}`);
        setOnline(true);
      } else {
        dropLast();
        setNotice(`Errore di connessione: ${(error as Error)?.message || String(error)}`);
        setOnline(false);
      }
    } finally {
      patchLast((m) => ({ ...m, streaming: false }));
      setStreaming(false);
      abortRef.current = null;
      setActivity(null);
    }
  };

  // Terminale troppo piccolo: niente layout rotto, messaggio + uscita pulita.
  if (rows < 10 || columns < 40) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color={theme.warning}>Terminale troppo piccolo per la TUI (minimo 40x10).</Text>
        <Text color={theme.muted}>Allarga la finestra oppure usa la modalità non interattiva (pipe).</Text>
      </Box>
    );
  }

  const chrome = 1 + (notice ? 1 : 0) + (activity ? 1 : 0) + inputHeight;
  const chatHeight = Math.max(3, rows - chrome);

  return (
    <Box flexDirection="row" height={rows}>
      <Box flexDirection="column" flexGrow={1}>
        <Box flexDirection="column" height={chatHeight}>
          <Chat messages={msgsRef.current} agentName={agentName} width={columns} maxHeight={chatHeight} />
        </Box>
        {notice ? (
          <Box>
            <Text color={theme.warning}>{notice}</Text>
          </Box>
        ) : null}
        {activity ? (
          <Box>
            <Text color={theme.muted}>{activity}</Text>
          </Box>
        ) : null}
        <ChatInput
          onSubmit={(text) => void runTurn(text)}
          streaming={streaming}
          onInterrupt={() => abortRef.current?.abort()}
          confirm={confirm}
          onConfirm={answerConfirm}
          placeholder={`Scrivi a ${agentName}… (Invio invia)`}
          onHeightChange={setInputHeight}
        />
        <StatusBar agent={agent} cwd={path.basename(process.cwd()) || process.cwd()} online={online} />
      </Box>
    </Box>
  );
}
