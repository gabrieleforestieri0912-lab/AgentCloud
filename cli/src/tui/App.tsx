import React, { useCallback, useRef, useState } from "react";
import { Box, Text, render, useApp, useInput, useStdout } from "ink";
import path from "node:path";
import { ApiError, deleteAgentFile, saveAgentFiles, streamAgent, userRequest, userWhoAmI } from "../api.js";
import { localVersion } from "../update.js";
import { theme } from "./theme.js";
import { Chat, type ChatMessage, type ToolStep } from "./Chat.js";
import { ChatInput, type ConfirmState } from "./Input.js";
import { Header } from "./Header.js";
import { Spinner } from "./Spinner.js";
import { StatusBar } from "./StatusBar.js";
import { DiffOverlay } from "./DiffOverlay.js";
import { SIDEBAR_WIDTH, Sidebar } from "./Sidebar.js";
import { CommandMenu, MAX_MENU_ROWS } from "./CommandMenu.js";
import { HelpOverlay } from "./HelpOverlay.js";
import { SessionsOverlay } from "./SessionsOverlay.js";
import { AgentsOverlay, type AgentChoice } from "./AgentsOverlay.js";
import { LoginScreen } from "./LoginScreen.js";
import { CATALOG } from "../catalog.js";
import {
  commandArgs,
  commandBody,
  matchCommands,
  type CommandContext,
  type CommandDef,
} from "./commands.js";
import { loadChatSession, listSessions } from "../sessions.js";
import {
  applyFileEvent,
  applyTransition,
  fileTotals,
  makeTitle,
  unifiedDiff,
  type DiffLine,
  type FileTransition,
  type TrackedFile,
} from "./fileChanges.js";

export type SessionInfo = {
  email?: string | null;
  plan?: string | null;
  /** Se l'API espone il residuo gratuito della giornata, qui arriva. */
  messagesRemaining?: number | null;
  /** false = sessione assente: la chat si apre comunque, /login per entrare. */
  authenticated?: boolean;
};

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
  // I messaggi di sistema (output dei comandi `/`) non vanno all'agente:
  // sono roba della CLI, non della conversazione.
  return messages
    .filter((m) => !m.system)
    .map(({ role, content }) => ({ role, content }));
}

/** Upsert di una card tool per nome: aggiorna lo stato o la aggiunge. */
function upsertTool(tools: ToolStep[] | undefined, step: ToolStep): ToolStep[] {
  const list = tools ? [...tools] : [];
  const idx = list.findIndex((t) => t.name === step.name);
  if (idx >= 0) list[idx] = { ...step };
  else list.push(step);
  return list;
}

/** Messaggi d'errore API gentili: cosa fare, non solo il codice. */
export function friendlyApiError(status: number, message: string): string {
  if (status === 401) {
    return `401 — ${message}. Rilancia /login per autenticarti di nuovo.`;
  }
  if (status === 402 || status === 429) {
    return `${status} — ${message} Passa a un piano su https://www.agentcloud.agency/dashboard/subscriptions`;
  }
  if (status === 0) {
    return `Rete non raggiungibile: controlla la connessione (${message}).`;
  }
  return `Errore ${status}: ${message}`;
}

export function App({
  agent: initialAgent,
  agentName: initialAgentName,
  initial,
  initialTitle,
  initialFiles,
  session,
  showHeader = true,
  onExit,
}: {
  agent: string;
  agentName: string;
  initial: ChatMessage[];
  initialTitle?: string;
  initialFiles?: TrackedFile[];
  /** Info utente per header e status (facoltativa: la chat classica non ce l'ha). */
  session?: SessionInfo;
  showHeader?: boolean;
  onExit: (messages: ChatMessage[], title: string, files: TrackedFile[]) => void;
}) {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const rows = stdout?.rows ?? 24;
  const columns = stdout?.columns ?? 80;

  // Agente come stato: /agents cambia agente a caldo senza ripartire la chat.
  const [agent, setAgent] = useState(initialAgent);
  const [agentName, setAgentName] = useState(initialAgentName);

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

  // Overlay: un solo livello alla volta (help > sessioni > diff > agents/login).
  const [helpOpen, setHelpOpen] = useState(false);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [diffView, setDiffView] = useState<{ title: string; lines: DiffLine[] } | null>(null);
  const [agentsOpen, setAgentsOpen] = useState(false);
  const [agentChoices, setAgentChoices] = useState<AgentChoice[] | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [liveInfo, setLiveInfo] = useState<SessionInfo | null>(null);
  const info = liveInfo ?? session;
  // Sessione presente? Se il sito non risponde 401 restiamo "forse": la CLI
  // storica non faceva il whoami, e non vogliamo bloccare la chat senza prove.
  const [loggedIn, setLoggedIn] = useState<boolean>(session?.authenticated !== false);
  const [notice, setNotice] = useState<string | null>(
    session?.authenticated === false
      ? "Non sei autenticato: usa /login per accedere (oppure incolla un token con /login → token)."
      : null,
  );

  // Menu comandi "/": aperto mentre la bozza inizia per "/", filtrato dal
  // primo token. suppressMenuRef evita la riapertura quando il testo viene
  // impostato programmaticamente (suggerimento argomento).
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuSelected, setMenuSelected] = useState(0);
  const [draft, setDraft] = useState("");
  const [preset, setPreset] = useState<{ text: string; key: number } | null>(null);
  const menuOpenRef = useRef(false);
  menuOpenRef.current = menuOpen;
  const suppressMenuRef = useRef(false);

  const handleDraftChange = useCallback(
    (text: string) => {
      setDraft(text);
      if (suppressMenuRef.current) {
        suppressMenuRef.current = false;
        return;
      }
      const opens = text.startsWith("/") && !text.includes("\n");
      if (!opens) {
        if (menuOpenRef.current) setMenuOpen(false);
        return;
      }
      // La selezione torna in alto a ogni digitazione: il comando
      // evidenziato corrisponde sempre a quello che l'utente sta scrivendo.
      // Le frecce la spostano senza più modificare la bozza.
      setMenuSelected(0);
      if (!menuOpenRef.current) setMenuOpen(true);
    },
    [],
  );

  const [streaming, setStreaming] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const pendingRef = useRef<{ toolName: string; token: string } | null>(null);
  const confirmResolve = useRef<((yes: boolean) => void) | null>(null);
  const [activity, setActivity] = useState<string | null>(null);
  const [online, setOnline] = useState<boolean | null>(null);
  const [inputHeight, setInputHeight] = useState(3);
  const abortRef = useRef<AbortController | null>(null);
  const finishedRef = useRef(false);

  const pushMsg = (m: ChatMessage) => {
    msgsRef.current = [...msgsRef.current, m];
    touch();
  };
  /** Output di un comando `/`: resta a schermo, non entra nella cronologia. */
  const pushSystem = (title: string, body: string | string[]) => {
    const content = Array.isArray(body) ? body.join("\n") : body;
    pushMsg({ role: "assistant", content, system: title });
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
      msgsRef.current
        .filter((m) => !m.system)
        .map(({ role, content }) => ({ role, content })),
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
    // Overlay aperti (help/sessioni/diff): possiedono i loro tasti.
    if (helpOpen || sessionsOpen || diffView || agentsOpen || loginOpen) return;
    if (menuOpen) {
      const body = commandBody(draft);
      const list = menuList;
      if (key.upArrow) {
        setMenuSelected((s) => (list.length ? (s - 1 + list.length) % list.length : 0));
        return;
      }
      if (key.downArrow) {
        setMenuSelected((s) => (list.length ? (s + 1) % list.length : 0));
        return;
      }
      if (key.tab || key.return) {
        const def = list[menuSel];

        if (!def) {
          setMenuOpen(false);
          setPreset({ text: "", key: Date.now() });
          if (body) setNotice(`Comando sconosciuto: /${body} — /help per l'elenco.`);
          return;
        }
        const { args, rest } = commandArgs(def, body);
        if (def.args.some((a) => a.required) && args.length === 0) {
          // Suggerimento argomento: precompila e chiudi il menu.
          suppressMenuRef.current = true;
          setPreset({ text: `/${def.name} `, key: Date.now() });
          setMenuOpen(false);
          return;
        }
        runSlashCommand(def, args, rest);
        return;
      }
      if (key.escape) {
        setMenuOpen(false);
        setPreset({ text: draft.startsWith("/") ? draft.slice(1) : draft, key: Date.now() });
        return;
      }
      return;
    }
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
      if (f) openSingleDiff(f.filename);
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

  /** Esegue un comando del registro e pulisce l'input. */
  function runSlashCommand(def: CommandDef, args: string[], rest: string) {
    setMenuOpen(false);
    setPreset({ text: "", key: Date.now() });
    const ctx = buildCommandContext();
    void Promise.resolve()
      .then(() => def.handler(ctx, args, rest))
      .catch((error) =>
        setNotice(`Comando /${def.name}: ${error instanceof Error ? error.message : String(error)}`),
      );
  }

  function buildCommandContext(): CommandContext {
    return {
      agent,
      agentName,
      getMessages: () =>
        msgsRef.current
          .filter((m) => !m.system)
          .map(({ role, content }) => ({ role, content })),
      resetAll: () => {
        msgsRef.current = [];
        filesRef.current = [];
        undoRef.current = [];
        redoRef.current = [];
        setSelected(0);
        setTitle(agentName);
        titleTouchedRef.current = false;
        touch();
      },
      clearMessages: () => {
        msgsRef.current = [];
        touch();
      },
      getTitle: () => titleRef.current,
      setTitle: (t: string) => {
        titleTouchedRef.current = true;
        setTitle(t);
      },
      undo: () => undoLastChange(),
      redo: () => redoChange(),
      openDiff: (filename?: string) => openDiff(filename),
      openHelp: () => setHelpOpen(true),
      openSessions: () => setSessionsOpen(true),
      openAgents: () => {
        setAgentsOpen(true);
        void loadAgentChoices();
      },
      openLogin: () => setLoginOpen(true),
      onLogout: () => {
        setLoggedIn(false);
        setLiveInfo({ email: null, plan: null, messagesRemaining: null, authenticated: false });
        touch();
      },
      exit: () => finish(),
      notice: (msg: string) => setNotice(msg),
      system: (title: string, body: string | string[]) => pushSystem(title, body),
      runAgent: (slug: string, prompt: string) => runIsolatedAgent(slug, prompt),
    };
  }

  /**
   * Run isolata (comando `/run`): un altro agente risponde a un prompt
   * senza che il prompt entri nella conversazione corrente.
   */
  async function runIsolatedAgent(slug: string, prompt: string): Promise<string> {
    setActivity(`run ${slug}…`);
    let out = "";
    try {
      await streamAgent(
        slug,
        [{ role: "user", content: prompt }],
        (event) => {
          if (event.type === "text" && typeof event.content === "string") {
            out += event.content;
          } else if (event.type === "tool_start") {
            setActivity(`sto lavorando: ${String(event.toolName || "tool")}…`);
          } else if (event.type === "error") {
            throw new Error(String(event.message || "Errore agente"));
          }
        },
      );
      return out;
    } finally {
      setActivity(null);
    }
  }

  /** Diff di un file o, senza argomento, di tutte le modifiche. */
  function openDiff(filename?: string) {
    const files = filesRef.current.filter((f) => f.head >= 0);
    if (filename) {
      const f =
        files.find((x) => x.filename === filename) ??
        files.find((x) => x.filename.includes(filename));
      if (!f) {
        setNotice(`File non trovato: ${filename}`);
        return;
      }
      openSingleDiff(f.filename);
      return;
    }
    const lines: DiffLine[] = [];
    for (const f of files) {
      const oldText = f.head > 0 ? (f.versions[f.head - 1] ?? "") : "";
      const newText = f.versions[f.head] ?? "";
      lines.push({ kind: "@", text: `== ${f.filename} (+${f.added} -${f.removed})` });
      lines.push(...unifiedDiff(f.filename, oldText, newText));
    }
    if (lines.length === 0) {
      setNotice("Nessuna modifica in sessione.");
      return;
    }
    setDiffView({ title: `Modifiche (${files.length} file)`, lines });
  }

  function openSingleDiff(filename: string) {
    const f = filesRef.current.find((x) => x.filename === filename);
    if (!f || f.head < 0) return;
    const oldText = f.head > 0 ? (f.versions[f.head - 1] ?? "") : "";
    setDiffView({ title: filename, lines: unifiedDiff(filename, oldText, f.versions[f.head] ?? "") });
  }

  /** Ripresa da /sessions: sostituisce conversazione, file e titolo. */
  function resumeSession(code: string) {
    try {
      const s = loadChatSession(code);
      if (s.agent !== agent) {
        setNotice(`La sessione è dell'agente "${s.agent}".`);
        return;
      }
      msgsRef.current = s.messages.map((m) => ({ role: m.role, content: m.content }));
      filesRef.current = Array.isArray(s.files) ? s.files : [];
      undoRef.current = [];
      redoRef.current = [];
      if (typeof s.title === "string" && s.title) {
        setTitle(s.title);
        titleTouchedRef.current = true;
      }
      setSelected(0);
      setSessionsOpen(false);
      touch();
      setNotice(`Sessione ${s.code} ripresa.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    }
  }

  /** Ritorna informazioni utente fresche (header/status) senza bloccare. */
  const refreshSession = async () => {
    try {
      const who = await userWhoAmI();
      let plan: string | null = null;
      let messagesRemaining: number | null = null;
      try {
        const usage = await userRequest<{
          plan?: string;
          messagesRemaining?: number;
        }>("/api/user/usage");
        plan = usage.plan ?? null;
        messagesRemaining = typeof usage.messagesRemaining === "number" ? usage.messagesRemaining : null;
      } catch { /* usage indispunibile: comunque header con email */ }
      setLiveInfo({ email: who.email || null, plan, messagesRemaining, authenticated: true });
      setLoggedIn(true);
    } catch (error) {
      // 401 = non autenticato: la chat resta aperta, ma i messaggi avvisano.
      if (error instanceof ApiError && error.status === 401) {
        setLiveInfo({ email: null, plan: null, messagesRemaining: null, authenticated: false });
        setLoggedIn(false);
      }
    }
  };

  /** Carica (una volta) gli agenti posseduti per l'overlay /agents. */
  const loadAgentChoices = async () => {
    if (agentChoices) return;
    setLoadingAgents(true);
    try {
      const who = await userWhoAmI();
      const choices: AgentChoice[] = who.owned.map((slug) => {
        const cat = CATALOG.find((a) => a.slug === slug);
        return { slug, name: cat?.name ?? slug, category: cat?.category, price: cat?.price };
      });
      setAgentChoices(choices.length > 0 ? choices : [{ slug: agent, name: agentName }]);
    } catch (error) {
      setNotice(`Elenco agenti non disponibile: ${error instanceof Error ? error.message : String(error)}`);
      setAgentsOpen(false);
    } finally {
      setLoadingAgents(false);
    }
  };

  /** /agents → Invio: cambia agente e riparte pulito (nuova conversazione). */
  const switchAgent = (slug: string) => {
    const cat = CATALOG.find((a) => a.slug === slug);
    setAgent(slug);
    setAgentName(cat?.name ?? slug);
    setAgentsOpen(false);
    msgsRef.current = [];
    filesRef.current = [];
    undoRef.current = [];
    redoRef.current = [];
    setSelected(0);
    setTitle(cat?.name ?? slug);
    titleTouchedRef.current = false;
    touch();
    setNotice(`Agente attivo: ${cat?.name ?? slug}. Nuova conversazione pronta.`);
  };

  /** Carica (una volta) gli agenti posseduti per l'overlay /agents. */
  const [loadingAgents, setLoadingAgents] = useState(false);

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
      const name = String(event.toolName || "tool");
      setActivity(`sto lavorando: ${name}…`);
      patchLast((m) => ({ ...m, tools: upsertTool(m.tools, { name, state: "running" }) }));
    } else if (event.type === "tool_done") {
      const name = String(event.toolName || "tool");
      setActivity(null);
      patchLast((m) => ({ ...m, tools: upsertTool(m.tools, { name, state: "done" }) }));
    } else if (event.type === "file" && typeof event.filename === "string") {
      const filename = String(event.filename);
      const content = typeof event.content === "string" ? event.content : "";
      setActivity(`sto scrivendo: ${filename}…`);
      patchLast((m) => {
        const tools = upsertTool(m.tools, { name: `file: ${filename}`, state: "running" });
        return { ...m, tools };
      });
      recordFileEvent(filename, content);
      patchLast((m) => ({ ...m, tools: m.tools?.map((t) => (t.name === `file: ${filename}` ? { ...t, state: "done" as const } : t)) }));
    } else if (event.type === "connection" && typeof event.provider === "string") {
      setActivity(null);
      patchLast((m) => ({
        ...m,
        tools: [
          ...(m.tools ?? []),
          { name: `connetti ${event.provider} — dashboard/integrazioni`, state: "error" as const },
        ],
      }));
    } else if (event.type === "tool_confirm") {
      pendingRef.current = {
        token: typeof event.token === "string" ? event.token : "",
        toolName: String(event.toolName || "tool"),
      };
      setActivity("in attesa di conferma…");
    } else if (event.type === "error") {
      throw new Error(String(event.message || "Errore agente"));
    }
  };

  const runTurn = async (text: string) => {
    setNotice(null);
    setActivity(null);
    // Nessuna sessione: non parte nessuna run, si spiega come entrare.
    if (!loggedIn) {
      setNotice(
        "Non sei autenticato: usa /login per accedere col browser (consigliato) o incolla un token. Poi riprova il messaggio.",
      );
      return;
    }
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
        patchLast((m) => ({
          ...m,
          content: `${m.content}\n_(interrotto)_`,
          tools: m.tools?.map((t) => (t.state === "running" ? { ...t, state: "error" as const } : t)),
        }));
      } else if (error instanceof ApiError) {
        // Come la CLI classica: l'errore non entra in cronologia, resta il
        // messaggio utente e si mostra l'avviso. Il server ha risposto:
        // la connessione c'è.
        dropLast();
        setNotice(friendlyApiError(error.status, error.message));
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

  const liveFiles = filesRef.current.filter((f) => f.head >= 0);
  const safeSelected = Math.min(selected, Math.max(0, liveFiles.length - 1));
  const totals = fileTotals(filesRef.current);
  const menuList = matchCommands(draft);
  const menuSel = Math.min(menuSelected, Math.max(0, menuList.length - 1));

  // Header: logo(1) + separatore(1) + stato(1). Il margine interno è gestito
  // da paddingX senza righe extra.
  const headerH = showHeader ? 3 : 0;
  const chrome = headerH + 1 + (notice ? 1 : 0) + (activity ? 1 : 0) + inputHeight;
  // Il menu occupa righe fisse: va tolto dal budget della chat, altrimenti
  // il layout sfora e Ink taglia righe a caso.
  const menuRowsShown = menuOpen
    ? Math.min(menuList.length, MAX_MENU_ROWS) + (menuList.length > MAX_MENU_ROWS ? 1 : 0)
    : 0;
  const menuH = menuOpen ? menuRowsShown + 2 : 0; // +2 bordi
  const chatHeight = Math.max(3, rows - chrome - menuH);
  const chatWidth = sidebarVisible ? Math.max(20, columns - SIDEBAR_WIDTH - 1) : columns;
  // Input centrato: larghezza comoda (max 100 colonne) e allineato al centro.
  const inputWidth = Math.max(30, Math.min(chatWidth, 100));

  // Diff a tutto schermo: possiede i tasti, il resto resta sotto.
  if (diffView) {
    return (
      <Box flexDirection="column" height={rows}>
        <DiffOverlay
          title={diffView.title}
          lines={diffView.lines}
          height={rows}
          onClose={() => setDiffView(null)}
        />
      </Box>
    );
  }

  if (helpOpen) {
    return (
      <Box flexDirection="column" height={rows}>
        <HelpOverlay height={rows} onClose={() => setHelpOpen(false)} />
      </Box>
    );
  }

  if (sessionsOpen) {
    return (
      <Box flexDirection="column" height={rows}>
        <SessionsOverlay
          sessions={listSessions().filter((s) => s.agent === agent)}
          height={rows}
          onSelect={resumeSession}
          onClose={() => setSessionsOpen(false)}
        />
      </Box>
    );
  }

  if (agentsOpen || loginOpen) {
    return (
      <Box flexDirection="column" height={rows}>
        {agentsOpen ? (
          loadingAgents || !agentChoices ? (
            <Box padding={1} flexDirection="column">
              <Text bold color={theme.primary}>I tuoi agenti</Text>
              <Text color={theme.muted}>…</Text>
            </Box>
          ) : (
            <AgentsOverlay
              agents={agentChoices}
              current={agent}
              height={rows}
              onSelect={switchAgent}
              onClose={() => setAgentsOpen(false)}
            />
          )
        ) : (
          <LoginScreen
            onDone={() => {
              setLoginOpen(false);
              void refreshSession();
              touch();
            }}
            onExit={() => setLoginOpen(false)}
          />
        )}
      </Box>
    );
  }

  return (
    <Box flexDirection="row" height={rows}>
      <Box flexDirection="column" flexGrow={1}>
        {showHeader ? (
          <Header version={localVersion()} email={info?.email} plan={info?.plan} agentName={agentName} />
        ) : null}
        <Box flexDirection="column" height={chatHeight} alignItems="center">
          <Box width={inputWidth} flexDirection="column">
            <Chat messages={msgsRef.current} agentName={agentName} width={inputWidth} maxHeight={chatHeight} />
          </Box>
        </Box>
        {notice ? (
          <Box>
            <Text color={theme.warning} wrap="truncate">
              {notice}
            </Text>
          </Box>
        ) : null}
        {activity ? (
          <Box>
            <Spinner label={activity} />
          </Box>
        ) : null}
        {menuOpen ? (
          <Box alignItems="center">
            <Box width={inputWidth} flexDirection="column">
              <CommandMenu commands={menuList} selected={menuSel} width={inputWidth} />
            </Box>
          </Box>
        ) : null}
        <Box alignItems="center">
          <Box width={inputWidth} flexDirection="column">
            <ChatInput
              onSubmit={(text) => void runTurn(text)}
              streaming={streaming}
              onInterrupt={() => abortRef.current?.abort()}
              confirm={confirm}
              onConfirm={answerConfirm}
              placeholder={`Scrivi a ${agentName}… (Invio invia, / comandi)`}
              onHeightChange={setInputHeight}
              focused={effectiveFocus === "input"}
              menuActive={menuOpen}
              preset={preset}
              onDraftChange={handleDraftChange}
            />
          </Box>
        </Box>
        <StatusBar agent={agent} cwd={path.basename(process.cwd()) || process.cwd()} online={online} session={info} />
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
