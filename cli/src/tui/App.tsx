import React, { useCallback, useEffect, useRef, useState } from "react";
import { Box, Text, render, useApp, useInput, useStdout } from "ink";
import path from "node:path";
import { ApiError, agentLimit, deleteAgentFile, saveAgentFiles, streamAgent, userRequest, userWhoAmI, type AgentLimit } from "../api.js";
import { localVersion } from "../update.js";
import { theme } from "./theme.js";
import { Chat, Welcome, type ChatMessage, type ToolStep } from "./Chat.js";
import { ChatInput, type ConfirmState } from "./Input.js";
import { Header } from "./Header.js";
import { Spinner } from "./Spinner.js";
import { StatusBar } from "./StatusBar.js";
import { DiffOverlay } from "./DiffOverlay.js";
import { SIDEBAR_WIDTH, Sidebar } from "./Sidebar.js";
import { CommandMenu, MAX_MENU_ROWS } from "./CommandMenu.js";
import { Popup, MAX_POPUP_ROWS, type PopupItem } from "./Popup.js";
import { HelpOverlay } from "./HelpOverlay.js";
import { TabBar, type TabInfo } from "./TabBar.js";
import { type AgentChoice } from "./AgentsOverlay.js";
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

/** Una scheda (tab) chiusa: cosa viene salvato su disco all'uscita. */
export type TuiTabResult = {
  agent: string;
  agentName: string;
  messages: ChatMessage[];
  title: string;
  files: TrackedFile[];
};

export type TuiResult = { tabs: TuiTabResult[] };

export type TuiFocus = "input" | "sidebar";

/** Sito AgentCloud: i link dei messaggi (attivazione agenti, marketplace). */
const SITE = "https://www.agentcloud.agency";

/**
 * Stato di UNA scheda. Ogni scheda ha la sua conversazione, i suoi file, il
 * suo stack di undo/redo e il suo streaming: due schede possono girare
 * insieme e restano indipendenti.
 *
 * I campi sono mutabili e non sono React state: durante lo streaming gli
 * update arrivano da callback async e uno state React sarebbe stale.
 * Il re-render è forzato da `touch()` (tick), come già faceva `msgsRef`.
 */
type Tab = {
  id: string;
  agent: string;
  agentName: string;
  title: string;
  titleTouched: boolean;
  messages: ChatMessage[];
  files: TrackedFile[];
  undo: FileTransition[];
  redo: FileTransition[];
  streaming: boolean;
  /** true mentre la compattazione prepara il cambio agente. */
  compacting: boolean;
  activity: string | null;
  online: boolean | null;
  confirm: ConfirmState;
  pending: { toolName: string; token: string } | null;
  confirmResolve: ((yes: boolean) => void) | null;
  abort: AbortController | null;
  notice: string | null;
  /** Bozza del testo: resta nella scheda, si riprende tornandoci. */
  draft: string;
  /** Testo imposto dall'esterno (argomento suggerito, cambio scheda). */
  preset: { text: string; key: number } | null;
  menuOpen: boolean;
  menuSelected: number;
  /** Voce selezionata nella sidebar dei file. */
  selected: number;
};

function makeTab(init: {
  agent: string;
  agentName: string;
  messages?: ChatMessage[];
  title?: string;
  files?: TrackedFile[];
}): Tab {
  return {
    id: crypto.randomUUID(),
    agent: init.agent,
    agentName: init.agentName,
    title: init.title || init.agentName,
    titleTouched: Boolean(init.title),
    messages: init.messages ?? [],
    files: init.files ?? [],
    undo: [],
    redo: [],
    streaming: false,
    compacting: false,
    activity: null,
    online: null,
    confirm: null,
    pending: null,
    confirmResolve: null,
    abort: null,
    notice: null,
    draft: "",
    preset: null,
    menuOpen: false,
    menuSelected: 0,
    selected: 0,
  };
}

/**
 * Popup di selezione mostrato sopra la chat.
 * `onSelect` riceve la voce scelta: il popup si chiude da solo e la chat
 * continua (niente schermate a schermo intero per una scelta).
 */
export type PopupState = {
  title: string;
  hint?: string;
  items: PopupItem[];
  emptyText?: string;
  footer?: string;
  onSelect: (item: PopupItem) => void;
};

/** Entra nell'alternate screen; l'uscita ripristina sempre il terminale. */
function enterAltScreen(): void {
  process.stdout.write("\x1b[?1049h\x1b[H");
}

function leaveAltScreen(): void {
  process.stdout.write("\x1b[?1049l");
}

/**
 * Avvia la TUI chat e risolve con le schede finali all'uscita.
 *
 * Lo schermo alternativo si lascia in `finally`: anche con Ctrl+C o crash
 * il terminale torna come prima. Il chiamante stampa dopo (codici di ripresa
 * delle sessioni), quando lo schermo è già ripristinato e il testo resta
 * visibile.
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
    let result: TuiResult = { tabs: [] };
    const { waitUntilExit } = render(
      <App
        agent={opts.agent}
        agentName={opts.agentName}
        initial={opts.initial}
        initialTitle={opts.initialTitle}
        initialFiles={opts.initialFiles}
        onExit={(tabs) => {
          result = { tabs };
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
  // Il riepilogo della compattazione sì, ma come contesto utente (con
  // l'intestazione che spiega da dove viene), non come turno della chat.
  return messages
    .filter((m) => !m.system)
    .map((m) =>
      m.kind === "compaction"
        ? {
            role: "user" as const,
            content: `[Riepilogo della conversazione precedente con l'agente "${m.prevAgent ?? "precedente"}"]\n${m.content}`,
          }
        : { role: m.role, content: m.content },
    );
}

/**
 * Richiesta di riepilogo alla compattazione: la risponde l'agente che
 * lascia il posto. Solo testo: niente tool, niente modifiche a file.
 */
const SWITCH_SUMMARY_PROMPT = (prevAgentName: string): string =>
  [
    `Sto passando a un altro agente e ho bisogno di un riepilogo della nostra conversazione (l'hai avuta tu, "${prevAgentName}", con l'utente),`,
    "così chi subentra non perde il filo. Massimo 200 parole, solo testo: obiettivo dell'utente,",
    "decisioni prese, stato dei lavori, file toccati, prossimi passi.",
    "Non usare strumenti e non modificare alcun file: rispondi esclusivamente con il testo del riepilogo.",
  ].join(" ");

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
  onExit: (tabs: TuiTabResult[]) => void;
}) {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const rows = stdout?.rows ?? 24;
  const columns = stdout?.columns ?? 80;

  // Le schede: stato per sessione. La prima è quella di partenza.
  const tabsRef = useRef<Tab[]>([
    makeTab({
      agent: initialAgent,
      agentName: initialAgentName,
      messages: initial,
      title: initialTitle,
      files: initialFiles,
    }),
  ]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [, setTick] = useState(0);
  const touch = () => setTick((t) => t + 1);

  // Chiavi dei preset: contatore monotono (Date.now() può ripetersi).
  const presetKeyRef = useRef(0);
  const nextPreset = () => ++presetKeyRef.current;

  // Sidebar: visibile solo se aperta E il terminale è largo abbastanza.
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const sidebarVisible = sidebarOpen && columns >= 100;
  const [focus, setFocus] = useState<TuiFocus>("input");
  const effectiveFocus: TuiFocus = sidebarVisible ? focus : "input";

  // Overlay: un solo livello alla volta (help > sessioni > diff > agents/login).
  const [helpOpen, setHelpOpen] = useState(false);
  const [diffView, setDiffView] = useState<{ title: string; lines: DiffLine[] } | null>(null);
  const [agentChoices, setAgentChoices] = useState<AgentChoice[] | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [liveInfo, setLiveInfo] = useState<SessionInfo | null>(null);
  const info = liveInfo ?? session;
  // Budget freemium per agente: la stessa tariffa per ogni scheda con lo
  // stesso agente, quindi si tiene in mappa per slug.
  const limitsRef = useRef<Map<string, AgentLimit>>(new Map());
  // Sessione presente? Se il sito non risponde 401 restiamo "forse": la CLI
  // storica non faceva il whoami, e non vogliamo bloccare la chat senza prove.
  const [loggedIn, setLoggedIn] = useState<boolean>(session?.authenticated !== false);

  // Popup di selezione sopra la chat: la conversazione resta visibile
  // sotto, il popup scompare appena si sceglie (o si annulla con Esc).
  const [popup, setPopup] = useState<PopupState | null>(null);
  const [popupSelected, setPopupSelected] = useState(0);

  const [inputHeight, setInputHeight] = useState(3);
  const finishedRef = useRef(false);

  // La scheda attiva: tutto ciò che legge e scrive lo stato di sessione
  // passa di qui, così il resto del codice non cambia.
  const tab = tabsRef.current[Math.min(activeIndex, tabsRef.current.length - 1)];
  const tabs = tabsRef.current;
  // L'agente è della scheda: due schede possono parlare con agenti diversi.
  const agent = tab.agent;
  const agentName = tab.agentName;

  const suppressMenuRef = useRef(false);

  // La scheda attiva in un ref: `handleDraftChange` deve avere un'identità
  // stabile, altrimenti l'effetto dell'Input che segnala la bozza si
  // rieseguirebbe a ogni cambio scheda e riverserebbe il testo vecchio in
  // quella nuova.
  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;

  const handleDraftChange = useCallback((text: string) => {
    const list = tabsRef.current;
    const current = list[Math.min(activeIndexRef.current, list.length - 1)];
    if (!current) return;
    current.draft = text;
    if (suppressMenuRef.current) {
      suppressMenuRef.current = false;
      touch();
      return;
    }
    const opens = text.startsWith("/") && !text.includes("\n");
    if (!opens) {
      if (current.menuOpen) {
        current.menuOpen = false;
        touch();
      }
      return;
    }
    // La selezione torna in alto a ogni digitazione: il comando
    // evidenziato corrisponde sempre a quello che l'utente sta scrivendo.
    // Le frecce la spostano senza più modificare la bozza.
    // `touch()` va fatto SEMPRE: il filtro del menu (`matchCommands`) è
    // calcolato a livello App, e senza il tick l'App non ridisegna — con il
    // menu già aperto la lista restava quella del primo "/" e Invio
    // eseguiva il comando sbagliato.
    current.menuSelected = 0;
    current.menuOpen = true;
    touch();
  }, []);

  const pushMsg = (m: ChatMessage) => {
    tab.messages = [...tab.messages, m];
    touch();
  };
  /** Output di un comando `/`: resta a schermo, non entra nella cronologia. */
  const pushSystem = (title: string, body: string | string[]) => {
    const content = Array.isArray(body) ? body.join("\n") : body;
    pushMsg({ role: "assistant", content, system: title });
  };
  /**
   * Modifica l'ultimo messaggio di UNA scheda.
   *
   * Il parametro è esplicito e non implicito: durante lo streaming la
   * scheda che lavora può non essere quella attiva (l'utente ha cambiato
   * scheda), e la risposta deve finire dove è partita.
   */
  const patchLastOf = (t: Tab, fn: (m: ChatMessage) => ChatMessage) => {
    const arr = [...t.messages];
    arr[arr.length - 1] = fn(arr[arr.length - 1]);
    t.messages = arr;
    touch();
  };
  const dropLastOf = (t: Tab) => {
    t.messages = t.messages.slice(0, -1);
    touch();
  };

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    // tutte le schede aperte smettono di fare richieste
    for (const t of tabsRef.current) t.abort?.abort();
    onExit(
      tabsRef.current.map((t) => ({
        agent: t.agent,
        agentName: t.agentName,
        messages: t.messages
          .filter((m) => !m.system)
          .map((m) =>
            // Il riepilogo della compattazione sopravvive come turno
            // ordinario (contiene il contesto che serve alla ripresa).
            m.kind === "compaction"
              ? { role: "assistant", content: m.content }
              : { role: m.role, content: m.content },
          ),
        title: t.title,
        files: t.files,
      })),
    );
    exit();
  };

  // --- Schede -------------------------------------------------------------

  /**
   * Attiva una scheda: l'editor torna a quello della scheda (bozza
   * inclusa). Il testo scritto nella scheda che si lascia resta lì.
   */
  const activateTab = (index: number) => {
    const target = tabsRef.current[index];
    if (!target) return;
    target.menuOpen = false;
    // La chiave del preset è univoca, così l'Input applica la bozza anche
    // tornando a una scheda già visitata.
    target.preset = { text: target.draft, key: nextPreset() };
    setActiveIndex(index);
    touch();
  };

  /** Nuova scheda con lo stesso agente di quella attiva. */
  const newTab = () => {
    const current = activeTab();
    const fresh = makeTab({ agent: current.agent, agentName: current.agentName });
    tabsRef.current = [...tabsRef.current, fresh];
    setActiveIndex(tabsRef.current.length - 1);
    // L'editor della nuova scheda parte vuoto.
    fresh.preset = { text: "", key: nextPreset() };
    touch();
  };

  /** Chiude la scheda attiva: all'ultima scheda si esce dalla chat. */
  const closeTab = () => {
    const list = tabsRef.current;
    if (list.length <= 1) {
      finish();
      return;
    }
    const idx = Math.min(activeIndex, list.length - 1);
    const closing = list[idx];
    closing.abort?.abort();
    tabsRef.current = list.filter((_, i) => i !== idx);
    // Dopo la chiusura si resta su una scheda vicina, con il suo editor.
    const next = Math.min(idx, tabsRef.current.length - 1);
    const target = tabsRef.current[next];
    target.menuOpen = false;
    target.preset = { text: target.draft, key: nextPreset() };
    setActiveIndex(next);
    touch();
  };

  const activeTab = () => tabsRef.current[Math.min(activeIndex, tabsRef.current.length - 1)];

  /** Popup con le schede aperte: Invio ci va. */
  const openTabPicker = () => {
    const list = tabsRef.current;
    openPopup({
      title: "Schede",
      hint: "↑↓ · Invio",
      items: [
        ...list.map((t, i) => ({
          key: t.id,
          label: `${i + 1}. ${t.title}`,
          hint: `${t.agentName}${t.id === activeTab().id ? " · attiva" : ""}${t.streaming ? " · in corso" : ""}`,
        })),
        { key: "__new__", label: "+ Nuova scheda", hint: "Ctrl+T" },
      ],
      onSelect: (item) => {
        if (item.key === "__new__") {
          newTab();
          return;
        }
        const idx = list.findIndex((t) => t.id === item.key);
        if (idx >= 0) activateTab(idx);
      },
    });
  };

  // --- Tasti globali ------------------------------------------------------

  useInput((input, key) => {
    if (key.ctrl && input === "c") {
      finish();
      return;
    }
    if (key.ctrl && input === "b") {
      setSidebarOpen((o) => !o);
      return;
    }
    // Ctrl+T nuova scheda, Ctrl+W chiude la scheda attiva.
    if (key.ctrl && input === "t") {
      newTab();
      return;
    }
    if (key.ctrl && input === "w") {
      closeTab();
      return;
    }
    // Alt+1..9: vai alla scheda N.
    if (key.meta && /^[1-9]$/.test(input)) {
      activateTab(Number(input) - 1);
      return;
    }
    // Alt+freccia: scheda precedente/successiva.
    if (key.meta && key.leftArrow) {
      activateTab((activeIndex - 1 + tabsRef.current.length) % tabsRef.current.length);
      return;
    }
    if (key.meta && key.rightArrow) {
      activateTab((activeIndex + 1) % tabsRef.current.length);
      return;
    }    // Popup aperto: possiede i tasti (frecce, Invio, Esc). L'editor del
    // testo è disattivato finché il popup è aperto (vedi `focused`).
    if (popup) {
      const items = popup.items;
      if (key.upArrow) {
        setPopupSelected((s) => (items.length ? (s - 1 + items.length) % items.length : 0));
        return;
      }
      if (key.downArrow) {
        setPopupSelected((s) => (items.length ? (s + 1) % items.length : 0));
        return;
      }
      if (key.return) {
        const item = items[Math.min(popupSelected, Math.max(0, items.length - 1))];
        if (item) {
          const onSelect = popup.onSelect;
          setPopup(null);
          onSelect(item);
        }
        return;
      }
      if (key.escape) {
        setPopup(null);
        return;
      }
      return;
    }
    // Overlay aperti (help/sessioni/diff): possiedono i loro tasti.
    if (helpOpen || diffView || loginOpen) return;
    if (tab.menuOpen) {
      const body = commandBody(tab.draft);
      const list = menuList;
      if (key.upArrow) {
        tab.menuSelected = list.length ? (tab.menuSelected - 1 + list.length) % list.length : 0;
        touch();
        return;
      }
      if (key.downArrow) {
        tab.menuSelected = list.length ? (tab.menuSelected + 1) % list.length : 0;
        touch();
        return;
      }
      if (key.tab || key.return) {
        const def = list[menuSel];

        if (!def) {
          tab.menuOpen = false;
          tab.preset = { text: "", key: nextPreset() };
          if (body) tab.notice = `Comando sconosciuto: /${body} — /help per l'elenco.`;
          touch();
          return;
        }
        const { args, rest } = commandArgs(def, body);
        if (!def.picker && def.args.some((a) => a.required) && args.length === 0) {
          // Suggerimento argomento: precompila e chiudi il menu.
          suppressMenuRef.current = true;
          tab.preset = { text: `/${def.name} `, key: nextPreset() };
          tab.menuOpen = false;
          touch();
          return;
        }
        runSlashCommand(def, args, rest);
        return;
      }
      if (key.escape) {
        tab.menuOpen = false;
        tab.preset = { text: tab.draft.startsWith("/") ? tab.draft.slice(1) : tab.draft, key: nextPreset() };
        touch();
        return;
      }
      return;
    }
    if (key.tab && sidebarVisible) {
      setFocus((f) => (f === "input" ? "sidebar" : "input"));
      return;
    }
    if (effectiveFocus !== "sidebar") return;
    const files = tab.files.filter((f) => f.head >= 0);
    if (key.escape) {
      setFocus("input");
      return;
    }
    if (key.upArrow) {
      if (files.length > 0) {
        tab.selected = (tab.selected - 1 + files.length) % files.length;
        touch();
      }
      return;
    }
    if (key.downArrow) {
      if (files.length > 0) {
        tab.selected = (tab.selected + 1) % files.length;
        touch();
      }
      return;
    }
    if (key.return) {
      const f = files[tab.selected];
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
    tab.menuOpen = false;
    tab.preset = { text: "", key: nextPreset() };
    const ctx = buildCommandContext();
    void Promise.resolve()
      .then(() => def.handler(ctx, args, rest))
      .catch((error) => {
        tab.notice = `Comando /${def.name}: ${error instanceof Error ? error.message : String(error)}`;
        touch();
      });
  }

  function buildCommandContext(): CommandContext {
    return {
      agent,
      agentName,
      getMessages: () =>
        activeTab().messages
          .filter((m) => !m.system)
          .map(({ role, content }) => ({ role, content })),
      resetAll: () => {
        const t = activeTab();
        t.messages = [];
        t.files = [];
        t.undo = [];
        t.redo = [];
        t.selected = 0;
        t.title = t.agentName;
        t.titleTouched = false;
        touch();
      },
      clearMessages: () => {
        activeTab().messages = [];
        touch();
      },
      getTitle: () => activeTab().title,
      setTitle: (t: string) => {
        activeTab().titleTouched = true;
        activeTab().title = t;
        touch();
      },
      undo: () => undoLastChange(),
      redo: () => redoChange(),
      openDiff: (filename?: string) => openDiff(filename),
      openHelp: () => setHelpOpen(true),
      openSessions: () => openSessionPicker(),
      openAgents: () => void openAgentPicker("owned"),
      openCatalog: () => void openAgentPicker("catalog"),
      pickAgent: (onPicked: (slug: string) => void) => void openAgentPicker("owned", onPicked),
      preset: (text: string) => applyPreset(text),
      openLogin: () => setLoginOpen(true),
      openTabs: () => openTabPicker(),
      onLogout: () => {
        setLoggedIn(false);
        setLiveInfo({ email: null, plan: null, messagesRemaining: null, authenticated: false });
        touch();
      },
      exit: () => finish(),
      notice: (msg: string) => {
        activeTab().notice = msg;
        touch();
      },
      system: (title: string, body: string | string[]) => pushSystem(title, body),
      runAgent: (slug: string, prompt: string) => runIsolatedAgent(slug, prompt),
    };
  }

  /**
   * Run isolata (comando `/run`): un altro agente risponde a un prompt
   * senza che il prompt entri nella conversazione corrente.
   */
  async function runIsolatedAgent(slug: string, prompt: string): Promise<string> {
    const t = activeTab();
    t.activity = `run ${slug}…`;
    touch();
    let out = "";
    try {
      await streamAgent(
        slug,
        [{ role: "user", content: prompt }],
        (event) => {
          if (event.type === "text" && typeof event.content === "string") {
            out += event.content;
          } else if (event.type === "tool_start") {
            t.activity = `sto lavorando: ${String(event.toolName || "tool")}…`;
            touch();
          } else if (event.type === "error") {
            throw new Error(String(event.message || "Errore agente"));
          }
        },
      );
      return out;
    } finally {
      t.activity = null;
      touch();
    }
  }

  /** Apre un popup sopra la chat (la chat resta visibile sotto). */
  function openPopup(state: PopupState) {
    tab.menuOpen = false;
    setPopupSelected(0);
    setPopup(state);
  }

  /** Scrive un testo nell'input senza riaprire il menu dei comandi. */
  function applyPreset(text: string) {
    suppressMenuRef.current = true;
    tab.preset = { text, key: nextPreset() };
    touch();
  }

  /**
   * Selettore agenti in popup.
   * - "owned": i tuoi agenti prima, poi il resto del catalogo;
   * - "catalog": tutto il catalogo, con prezzi.
   * Se `onPicked` è dato serve solo a scegliere (comando `/run`): non
   * cambia l'agente attivo.
   */
  async function openAgentPicker(
    scope: "owned" | "catalog",
    onPicked?: (slug: string) => void,
  ) {
    tab.notice = null;
    touch();
    let owned: AgentChoice[] = [];
    try {
      owned = await fetchAgentChoices();
    } catch (error) {
      // Senza rete o senza sessione si mostra comunque il catalogo: la
      // scelta resta possibile (e l'errore resta visibile).
      tab.notice = `Elenco dei tuoi agenti non disponibile: ${error instanceof Error ? error.message : String(error)} — mostro il catalogo.`;
      touch();
    }
    const ownedSlugs = new Set(owned.map((c) => c.slug));
    const catalogItems: PopupItem[] = CATALOG.filter((c) => !c.comingSoon).map((c) => ({
      key: c.slug,
      label: c.name,
      hint: `${c.category} · ${c.price}${ownedSlugs.has(c.slug) ? "" : " · non attivato"}`,
    }));
    const ownedItems: PopupItem[] = owned.map((c) => ({
      key: c.slug,
      label: c.name,
      hint: `${c.category ?? ""}${c.price ? ` · ${c.price}` : ""}${c.slug === agent ? " · attivo" : ""}`,
    }));
    const items = scope === "catalog" ? catalogItems : [...ownedItems, ...catalogItems.filter((c) => !ownedSlugs.has(c.key))];
    // Con una conversazione in corso il cambio agente compatta: meglio dirlo
    // nel footer del popup, dove l'utente sta guardando prima di confermare.
    const hint = `↑↓ · Invio${activeTab().messages.some((m) => !m.system) ? " · la chat viene compattata" : ""}`;

    openPopup({
      title: scope === "catalog" ? "Catalogo agenti" : "Scegli l'agente",
      hint,
      items,
      emptyText: "(nessun agente: accedi con /login)",
      onSelect: (item) => {
        if (onPicked) {
          onPicked(item.key);
          return;
        }
        const isOwned = ownedSlugs.has(item.key);
        if (!isOwned) {
          const cat = CATALOG.find((c) => c.slug === item.key);
          tab.notice = `"${cat?.name ?? item.key}" non è attivo sul tuo account: attivalo su ${SITE}/agents/${item.key}`;
          touch();
          return;
        }
        switchAgent(item.key);
      },
    });
  }

  /** Popup con le chat precedenti: Invio riprende quella scelta. */
  function openSessionPicker() {
    const t = activeTab();
    const sessions = listSessions().filter((s) => s.agent === t.agent);
    openPopup({
      title: "Chat precedenti",
      hint: "↑↓ · Invio",
      items: sessions.map((s) => ({
        key: s.code,
        label: s.title || s.preview || s.code,
        hint: s.code,
      })),
      emptyText: "(nessuna chat precedente per questo agente)",
      onSelect: (item) => resumeSession(item.key),
    });
  }

  /**
   * Diff: con il nome del file lo apre direttamente; senza, se i file
   * modificati sono più di uno apre il popup per scegliere (come in
   * OpenCode), altrimenti mostra l'unico diff.
   */
  function openDiff(filename?: string) {
    const t = activeTab();
    const files = t.files.filter((f) => f.head >= 0);
    if (filename) {
      const f =
        files.find((x) => x.filename === filename) ??
        files.find((x) => x.filename.includes(filename));
      if (!f) {
        t.notice = `File non trovato: ${filename}`;
        touch();
        return;
      }
      openSingleDiff(f.filename);
      return;
    }
    if (files.length === 0) {
      t.notice = "Nessuna modifica in sessione.";
      touch();
      return;
    }
    if (files.length === 1) {
      openSingleDiff(files[0].filename);
      return;
    }
    openPopup({
      title: "Modifiche",
      hint: "↑↓ · Invio",
      items: [
        { key: "__all__", label: "Tutte le modifiche", hint: `${files.length} file` },
        ...files.map((f) => ({
          key: f.filename,
          label: f.filename,
          hint: `+${f.added} -${f.removed}`,
        })),
      ],
      onSelect: (item) => {
        if (item.key === "__all__") showAllDiff(files);
        else openSingleDiff(item.key);
      },
    });
  }

  /** Diff di tutti i file modificati insieme. */
  function showAllDiff(files: TrackedFile[]) {
    const lines: DiffLine[] = [];
    for (const f of files) {
      const oldText = f.head > 0 ? (f.versions[f.head - 1] ?? "") : "";
      const newText = f.versions[f.head] ?? "";
      lines.push({ kind: "@", text: `== ${f.filename} (+${f.added} -${f.removed})` });
      lines.push(...unifiedDiff(f.filename, oldText, newText));
    }
    if (lines.length === 0) {
      activeTab().notice = "Nessuna modifica in sessione.";
      touch();
      return;
    }
    setDiffView({ title: `Modifiche (${files.length} file)`, lines });
  }

  function openSingleDiff(filename: string) {
    const f = activeTab().files.find((x) => x.filename === filename);
    if (!f || f.head < 0) return;
    const oldText = f.head > 0 ? (f.versions[f.head - 1] ?? "") : "";
    setDiffView({ title: filename, lines: unifiedDiff(filename, oldText, f.versions[f.head] ?? "") });
  }

  /** Ripresa da /sessions: sostituisce conversazione, file e titolo. */
  function resumeSession(code: string) {
    try {
      const s = loadChatSession(code);
      const t = activeTab();
      if (s.agent !== t.agent) {
        t.notice = `La sessione è dell'agente "${s.agent}".`;
        touch();
        return;
      }
      t.messages = s.messages.map((m) => ({ role: m.role, content: m.content }));
      t.files = Array.isArray(s.files) ? s.files : [];
      t.undo = [];
      t.redo = [];
      if (typeof s.title === "string" && s.title) {
        t.title = s.title;
        t.titleTouched = true;
      }
      t.selected = 0;
      touch();
      t.notice = `Sessione ${s.code} ripresa.`;
      touch();
    } catch (error) {
      activeTab().notice = error instanceof Error ? error.message : String(error);
      touch();
    }
  }

  /** Ritorna informazioni utente fresche (header/status) senza bloccare. */
  const refreshSession = async () => {    try {
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

  /**
   * Budget freemium dell'agente: serve al link di abbonamento nella chat
   * vuota e al contatore nel footer. Silenzioso in caso di errore: è un
   * extra, non deve mai bloccare la chat.
   */
  const loadLimit = useCallback(async (slug: string) => {
    try {
      limitsRef.current.set(slug, await agentLimit(slug));
    } catch {
      limitsRef.current.set(slug, { unlimited: true } as AgentLimit);
    }
    touch();
  }, []);

  // Al cambio agente (e all'avvio) il budget va ricaricato.
  useEffect(() => {
    const timer = setTimeout(() => void loadLimit(agent), 0);
    return () => clearTimeout(timer);
  }, [agent, loadLimit]);
  /** Carica (una volta) gli agenti posseduti per il popup /agents. */
  const fetchAgentChoices = async (): Promise<AgentChoice[]> => {
    if (agentChoices) return agentChoices;
    const who = await userWhoAmI();
    const choices: AgentChoice[] = who.owned.map((slug) => {
      const cat = CATALOG.find((a) => a.slug === slug);
      return { slug, name: cat?.name ?? slug, category: cat?.category, price: cat?.price };
    });
    const result = choices.length > 0 ? choices : [{ slug: agent, name: agentName }];
    setAgentChoices(result);
    return result;
  };

  /**
   * /agents → Invio: cambia agente.
   *
   * Con una conversazione in corso non si riparte pulito: la chat precedente
   * viene compattata, come OpenCode fa al cambio modello. Il riepilogo lo
   * scrive l'agente che lascia il posto, appare a schermo come blocco
   * "chat compattata" e sostituisce il trascrito nel contesto del nuovo
   * agente. Se la compattazione fallisce (rete, piano esaurito, timeout)
   * niente va perso in silenzio: la conversazione resta visibile e va per
   * intero al nuovo agente, con l'avviso che spiega perché.
   */
  const switchAgent = async (slug: string) => {
    const t = activeTab();
    if (t.streaming) {
      t.notice = "Attendi che l'agente finisca (o premi Esc per interrompere) prima di cambiare agente.";
      touch();
      return;
    }
    if (t.compacting) return;
    if (slug === t.agent) {
      t.notice = `Agente già attivo: ${t.agentName}. La conversazione continua.`;
      touch();
      return;
    }
    const newName = CATALOG.find((c) => c.slug === slug)?.name ?? slug;

    const turns = t.messages.filter((m) => !m.system);
    if (turns.length === 0) {
      // Nessuna conversazione in corso: ripartenza pulita (comportamento
      // di prima, senza riepilogo da compilare).
      t.agent = slug;
      t.agentName = newName;
      t.files = [];
      t.undo = [];
      t.redo = [];
      t.selected = 0;
      t.title = newName;
      t.titleTouched = false;
      t.notice = `Agente attivo: ${newName}. Nuova conversazione pronta.`;
      touch();
      return;
    }

    const prevAgent = t.agent;
    const prevAgentName = t.agentName;
    t.compacting = true;
    t.activity = `Sto compattando la conversazione con ${prevAgentName}…`;
    touch();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 90_000);
    try {
      let summary = "";
      await streamAgent(
        prevAgent,
        [...stripFlags(t.messages), { role: "user", content: SWITCH_SUMMARY_PROMPT(prevAgentName) }],
        (event) => {
          if (event.type === "text" && typeof event.content === "string") summary += event.content;
        },
        { signal: ctrl.signal, ephemeral: true },
      );
      summary = summary.trim();
      if (!summary) throw new Error("risposta vuota");
      // La conversazione precedente lascia il posto al riepilogo: a schermo
      // resta solo il blocco "chat compattata" e nella cronologia il solo
      // riepilogo, come contesto per il nuovo agente.
      t.messages = [
        {
          role: "assistant",
          kind: "compaction",
          prevAgent: prevAgentName,
          prevCount: turns.length,
          content: summary,
        },
      ];
      t.agent = slug;
      t.agentName = newName;
      // I file restano: è lo stesso lavoro, cambia solo chi ci lavora.
      // Best-effort: al server vanno riproposti sotto il nuovo agente (lì
      // le copie delle chat sono per agente).
      for (const f of t.files.filter((x) => x.head >= 0)) {
        void saveAgentFiles(slug, [{ name: f.filename, content: f.versions[f.head] ?? "" }]);
      }
      void loadLimit(prevAgent);
      void loadLimit(slug);
      t.notice = `Agente attivo: ${newName}. Il riepilogo della chat precedente entra nel nuovo contesto.`;
      touch();
    } catch (error) {
      const why =
        (error as Error)?.name === "AbortError"
          ? "tempo scaduto"
          : error instanceof ApiError
            ? `errore ${error.status}`
            : error instanceof Error
              ? error.message
              : String(error);
      // Compattazione fallita: il trascrito integrale continua a valere.
      t.agent = slug;
      t.agentName = newName;
      t.notice = `Agente attivo: ${newName}. Compattazione fallita (${why}): la conversazione precedente resta visibile e passa per intero al nuovo agente.`;
      void loadLimit(slug);
      touch();
    } finally {
      clearTimeout(timer);
      t.compacting = false;
      t.activity = null;
      touch();
    }
  };

  /** Registra un evento `file` dallo stream + persistenza best-effort. */
  const recordFileEvent = (t: Tab, filename: string, content: string) => {
    const { files, transition } = applyFileEvent(t.files, filename, content);
    if (!transition) return;
    t.files = files;
    t.undo.push(transition);
    t.redo = [];
    t.selected = Math.min(t.selected, Math.max(0, files.filter((f) => f.head >= 0).length - 1));
    touch();
    // Parità col web client: il file resta disponibile su altri dispositivi.
    // Mai bloccante, mai un errore in faccia: la sidebar è già aggiornata.
    void saveAgentFiles(t.agent, [{ name: filename, content }]).then((ok) => {
      if (!ok) {
        t.notice = `Salvataggio server di ${filename} fallito: resta solo in questa sessione.`;
        touch();
      }
    });
  };

  /** Sincronizza il server dopo undo/redo: POST del contenuto o DELETE. */
  const syncFileToServer = async (filename: string, head: number, versions: string[]): Promise<boolean> => {
    if (head < 0) return deleteAgentFile(filename);
    return saveAgentFiles(activeTab().agent, [{ name: filename, content: versions[head] ?? "" }]);
  };

  const undoLastChange = async () => {
    const t = activeTab();
    const change = t.undo.pop();
    if (!change) {
      t.notice = "Niente da annullare.";
      touch();
      return;
    }
    const inverse: FileTransition = { filename: change.filename, from: change.to, to: change.from };
    t.files = applyTransition(t.files, inverse);
    t.redo.push(change);
    touch();
    const f = t.files.find((x) => x.filename === change.filename);
    const ok = f ? await syncFileToServer(change.filename, inverse.to, f.versions) : false;
    t.notice = ok ? `Annullata modifica a ${change.filename}.` : `Annullata in locale, sincronizzazione di ${change.filename} fallita.`;
    touch();
  };

  const redoChange = async () => {
    const t = activeTab();
    const change = t.redo.pop();
    if (!change) {
      t.notice = "Niente da ripristinare.";
      touch();
      return;
    }
    t.files = applyTransition(t.files, change);
    t.undo.push({ filename: change.filename, from: change.to, to: change.from });
    touch();
    const f = t.files.find((x) => x.filename === change.filename);
    const ok = f ? await syncFileToServer(change.filename, change.to, f.versions) : false;
    t.notice = ok ? `Ripristinata modifica a ${change.filename}.` : `Ripristinata in locale, sincronizzazione di ${change.filename} fallita.`;
    touch();
  };

  const askConfirm = (t: Tab, toolName: string): Promise<boolean> =>
    new Promise((resolve) => {
      t.confirmResolve = resolve;
      t.confirm = { toolName };
      touch();
    });

  const answerConfirm = (yes: boolean) => {
    const resolve = tab.confirmResolve;
    tab.confirmResolve = null;
    tab.confirm = null;
    touch();
    resolve?.(yes);
  };

  const handleStreamEvent = (t: Tab) => (event: Record<string, unknown>) => {
    if (event.type === "text" && typeof event.content === "string") {
      const chunk = event.content;
      patchLastOf(t, (m) => ({ ...m, content: m.content + chunk }));
    } else if (event.type === "tool_start") {
      const name = String(event.toolName || "tool");
      t.activity = `sto lavorando: ${name}…`;
      patchLastOf(t, (m) => ({ ...m, tools: upsertTool(m.tools, { name, state: "running" }) }));
    } else if (event.type === "tool_done") {
      const name = String(event.toolName || "tool");
      t.activity = null;
      patchLastOf(t, (m) => ({ ...m, tools: upsertTool(m.tools, { name, state: "done" }) }));
    } else if (event.type === "file" && typeof event.filename === "string") {
      const filename = String(event.filename);
      const content = typeof event.content === "string" ? event.content : "";
      t.activity = `sto scrivendo: ${filename}…`;
      patchLastOf(t, (m) => {
        const tools = upsertTool(m.tools, { name: `file: ${filename}`, state: "running" });
        return { ...m, tools };
      });
      recordFileEvent(t, filename, content);
      patchLastOf(t, (m) => ({ ...m, tools: m.tools?.map((x) => (x.name === `file: ${filename}` ? { ...x, state: "done" as const } : x)) }));
    } else if (event.type === "connection" && typeof event.provider === "string") {
      t.activity = null;
      patchLastOf(t, (m) => ({
        ...m,
        tools: [
          ...(m.tools ?? []),
          { name: `connetti ${event.provider} — dashboard/integrazioni`, state: "error" as const },
        ],
      }));
    } else if (event.type === "tool_confirm") {
      t.pending = {
        token: typeof event.token === "string" ? event.token : "",
        toolName: String(event.toolName || "tool"),
      };
      t.activity = "in attesa di conferma…";
    } else if (event.type === "error") {
      throw new Error(String(event.message || "Errore agente"));
    }
  };

  const runTurn = async (text: string) => {
    // La run appartiene alla scheda da cui è partita: anche se l'utente
    // cambia scheda mentre l'agente lavora, la risposta finisce lì.
    const t = activeTab();
    t.notice = null;
    t.activity = null;
    // Durante la compattazione l'agente cambia: un messaggio partito ora
    // finirebbe a chi non deve. Meglio fermarlo e spiegare.
    if (t.compacting) {
      t.notice = "Sto già cambiando agente: aspetta la fine della compattazione.";
      touch();
      return;
    }
    // Nessuna sessione: non parte nessuna run, si spiega come entrare.
    if (!loggedIn) {
      t.notice =
        "Non sei autenticato: usa /login per accedere col browser (consigliato) o incolla un token. Poi riprova il messaggio.";
      touch();
      return;
    }
    t.messages = [...t.messages, { role: "user", content: text }];
    t.messages = [...t.messages, { role: "assistant", content: "", streaming: true }];
    t.streaming = true;
    touch();
    const ctrl = new AbortController();
    t.abort = ctrl;
    try {
      let approvalToken: string | undefined;
      // Come runWithApproval della CLI classica: max 5 conferme per run.
      for (let round = 0; round < 5; round++) {
        t.pending = null;
        await streamAgent(
          t.agent,
          stripFlags(t.messages),
          handleStreamEvent(t),
          approvalToken ? { approvalToken, signal: ctrl.signal } : { signal: ctrl.signal },
        );
        const pending = t.pending as { toolName: string; token: string } | null;
        if (!pending) break;
        const yes = await askConfirm(t, pending.toolName);
        if (!yes) {
          patchLastOf(t, (m) => ({ ...m, content: `${m.content}\n_(operazione annullata)_` }));
          break;
        }
        approvalToken = pending.token;
      }
      t.online = true;
    } catch (error) {
      if ((error as Error)?.name === "AbortError" || ctrl.signal.aborted) {
        patchLastOf(t, (m) => ({
          ...m,
          content: `${m.content}\n_(interrotto)_`,
          tools: m.tools?.map((x) => (x.state === "running" ? { ...x, state: "error" as const } : x)),
        }));
      } else if (error instanceof ApiError) {
        // Come la CLI classica: l'errore non entra in cronologia, resta il
        // messaggio utente e si mostra l'avviso. Il server ha risposto:
        // la connessione c'è.
        dropLastOf(t);
        t.notice = friendlyApiError(error.status, error.message);
        t.online = true;
        // Titolo automatico dopo il primo scambio riuscito (max ~6 parole dal
        // primo messaggio). Una sola volta: /rename (passo 4) lo cambia a mano.
        if (!t.titleTouched) {
          const firstUser = t.messages.find((m) => m.role === "user");
          if (firstUser) {
            t.titleTouched = true;
            const auto = makeTitle(firstUser.content);
            if (auto) t.title = auto;
          }
        }
        touch();
      } else {
        dropLastOf(t);
        t.notice = `Errore di connessione: ${(error as Error)?.message || String(error)}`;
        t.online = false;
        touch();
      }
    } finally {
      patchLastOf(t, (m) => ({ ...m, streaming: false }));
      t.streaming = false;
      t.abort = null;
      t.activity = null;
      touch();
      // Ogni risposta consuma un messaggio gratuito: il contatore va
      // aggiornato (footer e link di abbonamento).
      void loadLimit(t.agent);
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

  const liveFiles = tab.files.filter((f) => f.head >= 0);
  const safeSelected = Math.min(tab.selected, Math.max(0, liveFiles.length - 1));
  const totals = fileTotals(tab.files);
  const menuList = matchCommands(tab.draft);
  const menuSel = Math.min(tab.menuSelected, Math.max(0, menuList.length - 1));
  const limit = limitsRef.current.get(agent) ?? null;

  // Riga della prova gratuita: solo con la chat vuota e senza abbonamento
  // attivo. Va a piena larghezza della colonna (non dentro la colonna
  // della chat) così il link all'abbonamento non viene mai tagliato, e la
  // scritta è volutamente corta: resta su una riga anche con la sidebar
  // aperta (colonna da 68 caratteri a un terminale da 100).
  const trialLine =
    limit && limit.unlimited === false && tab.messages.length === 0
      ? {
          label: `Prova ${limit.remaining}/${limit.limit}`,
          url: `${SITE}/agents/${agent}`,
        }
      : null;

  // Header: logo(1) + separatore(1) + stato(1). Il margine interno è gestito
  // da paddingX senza righe extra.
  const headerH = showHeader ? 3 : 0;
  const chrome = headerH + 1 + 1 + (tab.notice ? 1 : 0) + (tab.activity ? 1 : 0) + inputHeight + (trialLine ? 1 : 0);
  // Il menu occupa righe fisse: va tolto dal budget della chat, altrimenti
  // il layout sfora e Ink taglia righe a caso.
  const menuRowsShown = tab.menuOpen
    ? Math.min(menuList.length, MAX_MENU_ROWS) + (menuList.length > MAX_MENU_ROWS ? 1 : 0)
    : 0;
  const menuH = tab.menuOpen ? menuRowsShown + 2 : 0; // +2 bordi
  // Il popup di selezione sta sopra l'input, come il menu: le sue righe
  // escono dal budget della chat, altrimenti il layout sfora.
  const popupRowsShown = popup
    ? Math.min(popup.items.length, MAX_POPUP_ROWS) + (popup.items.length > MAX_POPUP_ROWS ? 1 : 0)
    : 0;
  const popupH = popup ? popupRowsShown + 4 : 0; // +2 bordi, +1 titolo, +1 footer
  const chatHeight = Math.max(3, rows - chrome - menuH - popupH);
  const chatWidth = sidebarVisible ? Math.max(20, columns - SIDEBAR_WIDTH - 1) : columns;
  // Input centrato: larghezza comoda (max 100 colonne) e allineato al centro.
  const inputWidth = Math.max(30, Math.min(chatWidth, 100));

  // Schermata iniziale: conversazione vuota e nessun overlay aperto. Invece
  // della chat con l'input in fondo, il benvenuto e l'input multilinea sono
  // centrati (stile OpenCode). Appena parte un messaggio si torna al layout
  // normale con l'input in basso. Il menu dei comandi e i popup restano
  // dentro la schermata iniziale: non devono far saltare il layout.
  const startView =
    tab.messages.length === 0 && !tab.streaming && !tab.notice && !tab.activity;
  // Nella schermata iniziale l'input è una scatola centrata, non a tutta
  // larghezza: si vede che è "al centro" anche a terminale largo.
  const startInputWidth = Math.max(30, Math.min(chatWidth, 72));

  const tabInfos: TabInfo[] = tabs.map((t) => ({
    id: t.id,
    title: t.title,
    agentName: t.agentName,
    streaming: t.streaming,
    pending: Boolean(t.pending),
  }));

  /**
   * L'editor del testo: usato sia dalla schermata iniziale (input multilinea
   * centrato) sia dal layout normale (input in fondo).
   */
  const renderInput = (minLines: number) => (
    <ChatInput
      onSubmit={(text) => void runTurn(text)}
      streaming={tab.streaming}
      onInterrupt={() => tab.abort?.abort()}
      confirm={tab.confirm}
      onConfirm={answerConfirm}
      placeholder={`Scrivi a ${tab.agentName}… (Invio invia, / comandi)`}
      onHeightChange={setInputHeight}
      // Con il popup aperto l'editor si spegne: i tasti sono del
      // popup (frecce, Invio, Esc), non della bozza.
      focused={!popup && effectiveFocus === "input"}
      menuActive={tab.menuOpen || Boolean(popup)}
      preset={tab.preset}
      onDraftChange={handleDraftChange}
      // Cambiando scheda l'editor torna a quello della nuova
      // scheda (bozza inclusa).
      resetKey={tab.id}
      minLines={minLines}
    />
  );

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

  // Il login resta a schermo intero (schermata con scelte e campi): le
  // selezioni di agenti, sessioni e file usano invece il popup sopra la
  // chat, così la conversazione resta visibile.
  if (loginOpen) {
    return (
      <Box flexDirection="column" height={rows}>
        <LoginScreen
          onDone={() => {
            setLoginOpen(false);
            void refreshSession();
            touch();
          }}
          onExit={() => setLoginOpen(false)}
        />
      </Box>
    );
  }

  return (
    <Box flexDirection="row" height={rows}>
      <Box flexDirection="column" flexGrow={1}>
        {showHeader ? (
          <Header version={localVersion()} email={info?.email} plan={info?.plan} agentName={agentName} />
        ) : null}
        <Box flexDirection="row">
          <TabBar tabs={tabInfos} activeId={tab.id} width={chatWidth} />
        </Box>
        {trialLine ? (
          <Box>
            <Text color={theme.muted}>
              <Text color={theme.warning}>{trialLine.label}</Text>
              {" · "}
              <Text color={theme.primary}>{trialLine.url}</Text>
            </Text>
          </Box>
        ) : null}
        {startView ? (
          // Schermata iniziale: benvenuto e input multilinea al centro dello
          // schermo (stile OpenCode). Nessuna chat da mostrare ancora.
          <Box flexDirection="column" flexGrow={1} alignItems="center" justifyContent="center">
            <Box width={startInputWidth} flexDirection="column" alignItems="center">
              <Welcome agentName={tab.agentName} centered />
              {tab.menuOpen ? (
                <Box width={startInputWidth} flexDirection="column" marginTop={1}>
                  <CommandMenu commands={menuList} selected={menuSel} width={startInputWidth} />
                </Box>
              ) : null}
              {popup ? (
                <Box width={startInputWidth} flexDirection="column" marginTop={1}>
                  <Popup
                    title={popup.title}
                    hint={popup.hint}
                    items={popup.items}
                    selected={Math.min(popupSelected, Math.max(0, popup.items.length - 1))}
                    width={startInputWidth}
                    emptyText={popup.emptyText}
                    footer={popup.footer}
                  />
                </Box>
              ) : null}
              <Box marginTop={2} width={startInputWidth}>
                {renderInput(3)}
              </Box>
            </Box>
          </Box>
        ) : (
          <>
            <Box flexDirection="column" height={chatHeight} alignItems="center">
              <Box width={inputWidth} flexDirection="column">
                <Chat
                  messages={tab.messages}
                  agentName={tab.agentName}
                  width={inputWidth}
                  maxHeight={chatHeight}
                />
              </Box>
            </Box>
            {tab.notice ? (
              <Box>
                <Text color={theme.warning} wrap="truncate">
                  {tab.notice}
                </Text>
              </Box>
            ) : null}
            {tab.activity ? (
              <Box>
                <Spinner label={tab.activity} />
              </Box>
            ) : null}
            {tab.menuOpen ? (
              <Box alignItems="center">
                <Box width={inputWidth} flexDirection="column">
                  <CommandMenu commands={menuList} selected={menuSel} width={inputWidth} />
                </Box>
              </Box>
            ) : null}
            {popup ? (
              <Box alignItems="center">
                <Box width={inputWidth} flexDirection="column">
                  <Popup
                    title={popup.title}
                    hint={popup.hint}
                    items={popup.items}
                    selected={Math.min(popupSelected, Math.max(0, popup.items.length - 1))}
                    width={inputWidth}
                    emptyText={popup.emptyText}
                    footer={popup.footer}
                  />
                </Box>
              </Box>
            ) : null}
            <Box alignItems="center">
              <Box width={inputWidth} flexDirection="column">
                {renderInput(1)}
              </Box>
            </Box>
          </>
        )}
        <StatusBar agent={agent} cwd={path.basename(process.cwd()) || process.cwd()} online={tab.online} session={info} limit={limit} />
      </Box>
      {sidebarVisible ? (
        <Sidebar
          title={tab.title}
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
