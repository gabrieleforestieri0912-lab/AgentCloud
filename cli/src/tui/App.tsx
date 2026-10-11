import React, { useRef, useState } from "react";
import { Box, Text, render, useApp, useInput, useStdout } from "ink";
import path from "node:path";
import { ApiError, deleteAgentFile, saveAgentFiles, streamAgent } from "../api.js";
import { theme } from "./theme.js";
import { Chat, type ChatMessage } from "./Chat.js";
import { ChatInput, type ConfirmState } from "./Input.js";
import { StatusBar } from "./StatusBar.js";
import { DiffOverlay } from "./DiffOverlay.js";
import { SIDEBAR_WIDTH, Sidebar } from "./Sidebar.js";
import {
  applyFileEvent,
  applyTransition,
  currentContent,
  fileTotals,
  makeTitle,
  type FileTransition,
  type TrackedFile,
} from "./fileChanges.js";

export type TuiResult = { messages: ChatMessage[]; title: string; files: TrackedFile[] };

export type TuiFocus = "input" | "sidebar";

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
  initialTitle?: string;
  initialFiles?: TrackedFile[];
}): Promise<TuiResult> {
  enterAltScreen();
  try {
    let result: TuiResult = { messages: opts.initial, title: opts.initialTitle ?? "", files: opts.initialFiles ?? [] };
    const { waitUntilExit } = render(
      <App
        agent={opts.agent}
        agentName={opts.agentName}
        initial={opts.initial}
        initialTitle={opts.initialTitle}
        initialFiles={opts.initialFiles}
        onExit={(messages, title, files) => {
          result = { messages, title, files };
        }}
      />,
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
  initialTitle,
  initialFiles,
  onExit,
}: {
  agent: string;
  agentName: string;
  initial: ChatMessage[];
  initialTitle?: string;
  initialFiles?: TrackedFile[];
  onExit: (messages: ChatMessage[], title: string, files: TrackedFile[]) => void;
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

  // Titolo sidebar: auto-generato dopo il primo scambio, /rename (passo 4) lo
  // cambia a mano. Resta quello iniziale se si riprende una sessione vecchia.
  const [title, setTitle] = useState(initialTitle || agentName);
  const titleTouchedRef = useRef(Boolean(initialTitle));

  // File tracciati + stack undo/redo (per sessione TUI, in memoria).
  const filesRef = useRef<TrackedFile[]>(initialFiles ?? []);
  const undoRef = useRef<FileTransition[]>([]);
  const redoRef = useRef<FileTransition[]>([]);

  // Sidebar: visibile solo se aperta E il terminale è largo abbastanza.
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const sidebarVisible = sidebarOpen && columns >= 100;
  const [focus, setFocus] = useState<TuiFocus>("input");
  const effectiveFocus: TuiFocus = sidebarVisible ? focus : "input";
  const [selected, setSelected] = useState(0);
  const [diffFilename, setDiffFilename] = useState<string | null>(null);

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
    onExit(
      msgsRef.current.map(({ role, content }) => ({ role, content })),
      titleRef.current,
      filesRef.current,
    );
    exit();
  };

  // Titolo in ref per la finish (lo state sarebbe stale nella chiusura).
  const titleRef = useRef(title);
  titleRef.current = title;

  useInput((input, key) => {
    if (key.ctrl && input === "c") {
      finish();
      return;
    }
    if (key.ctrl && input === "b") {
      setSidebarOpen((o) => !o);
      return;
    }
    // L'overlay diff possiede i suoi tasti: qui passa solo Ctrl+C/B.
    if (diffFilename) return;
    if (key.tab && sidebarVisible) {
      setFocus((f) => (f === "input" ? "sidebar" : "input"));
      return;
    }
    if (effectiveFocus !== "sidebar") return;
    const files = filesRef.current.filter((f) => f.head >= 0);
    if (key.escape) {
      setFocus("input");
      return;
    }
    if (key.upArrow) {
      if (files.length > 0) setSelected((s) => (s - 1 + files.length) % files.length);
      return;
    }
    if (key.downArrow) {
      if (files.length > 0) setSelected((s) => (s + 1) % files.length);
      return;
    }
    if (key.return) {
      const f = files[selected];
      if (f) setDiffFilename(f.filename);
      return;
    }
    if (input === "u") {
      void undoLastChange();
      return;
    }
    if (input === "r") {
      void redoChange();
    }
  });

  /** Registra un evento `file` dallo stream + persistenza best-effort. */
  const recordFileEvent = (filename: string, content: string) => {
    const { files, transition } = applyFileEvent(filesRef.current, filename, content);
    if (!transition) return;
    filesRef.current = files;
    undoRef.current.push(transition);
    redoRef.current = [];
    setSelected((s) => Math.min(s, Math.max(0, files.filter((f) => f.head >= 0).length - 1)));
    touch();
    // Parità col web client: il file resta disponibile su altri dispositivi.
    // Mai bloccante, mai un errore in faccia: la sidebar è già aggiornata.
    void saveAgentFiles(agent, [{ name: filename, content }]).then((ok) => {
      if (!ok) setNotice(`Salvataggio server di ${filename} fallito: resta solo in questa sessione.`);
    });
  };

  /** Sincronizza il server dopo undo/redo: POST del contenuto o DELETE. */
  const syncFileToServer = async (filename: string, head: number, versions: string[]): Promise<boolean> => {
    if (head < 0) return deleteAgentFile(filename);
    return saveAgentFiles(agent, [{ name: filename, content: versions[head] ?? "" }]);
  };

  const undoLastChange = async () => {
    const t = undoRef.current.pop();
    if (!t) {
      setNotice("Niente da annullare.");
      return;
    }
    const inverse: FileTransition = { filename: t.filename, from: t.to, to: t.from };
    filesRef.current = applyTransition(filesRef.current, inverse);
    redoRef.current.push(t);
    touch();
    const f = filesRef.current.find((x) => x.filename === t.filename);
    const ok = f ? await syncFileToServer(t.filename, inverse.to, f.versions) : false;
    setNotice(ok ? `Annullata modifica a ${t.filename}.` : `Annullata in locale, sincronizzazione di ${t.filename} fallita.`);
  };

  const redoChange = async () => {
    const t = redoRef.current.pop();
    if (!t) {
      setNotice("Niente da ripristinare.");
      return;
    }
    filesRef.current = applyTransition(filesRef.current, t);
    undoRef.current.push({ filename: t.filename, from: t.to, to: t.from });
    touch();
    const f = filesRef.current.find((x) => x.filename === t.filename);
    const ok = f ? await syncFileToServer(t.filename, t.to, f.versions) : false;
    setNotice(ok ? `Ripristinata modifica a ${t.filename}.` : `Ripristinata in locale, sincronizzazione di ${t.filename} fallita.`);
  };

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
      const filename = String(event.filename);
      const content = typeof event.content === "string" ? event.content : "";
      setActivity(`[file: ${filename}]`);
      recordFileEvent(filename, content);
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
      // Titolo automatico dopo il primo scambio riuscito (max ~6 parole dal
      // primo messaggio). Una sola volta: /rename (passo 4) lo cambia a mano.
      if (!titleTouchedRef.current) {
        const firstUser = msgsRef.current.find((m) => m.role === "user");
        if (firstUser) {
          titleTouchedRef.current = true;
          const auto = makeTitle(firstUser.content);
          if (auto) setTitle(auto);
        }
      }
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
  const chatWidth = sidebarVisible ? Math.max(20, columns - SIDEBAR_WIDTH - 1) : columns;

  const liveFiles = filesRef.current.filter((f) => f.head >= 0);
  const safeSelected = Math.min(selected, Math.max(0, liveFiles.length - 1));
  const totals = fileTotals(filesRef.current);

  // Diff a tutto schermo: possiede i tasti, il resto resta sotto.
  if (diffFilename) {
    const f = filesRef.current.find((x) => x.filename === diffFilename);
    const head = f?.head ?? 0;
    const oldText = head > 0 ? (f?.versions[head - 1] ?? "") : "";
    const newText = head >= 0 ? (f?.versions[head] ?? "") : "";
    return (
      <Box flexDirection="column" height={rows}>
        <DiffOverlay
          filename={diffFilename}
          oldText={oldText}
          newText={newText}
          height={rows}
          onClose={() => setDiffFilename(null)}
        />
      </Box>
    );
  }

  return (
    <Box flexDirection="row" height={rows}>
      <Box flexDirection="column" flexGrow={1}>
        <Box flexDirection="column" height={chatHeight}>
          <Chat messages={msgsRef.current} agentName={agentName} width={chatWidth} maxHeight={chatHeight} />
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
          focused={effectiveFocus === "input"}
        />
        <StatusBar agent={agent} cwd={path.basename(process.cwd()) || process.cwd()} online={online} />
      </Box>
      {sidebarVisible ? (
        <Sidebar
          title={title}
          files={liveFiles}
          totals={totals}
          selected={safeSelected}
          focused={effectiveFocus === "sidebar"}
          maxRows={rows}
        />
      ) : null}
    </Box>
  );
}
