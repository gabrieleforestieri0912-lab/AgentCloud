import { clearCredentials, loadConfig, loadCredentials } from "../config.js";
import { browserLogin } from "../browser-login.js";
import { currentThemeName } from "./theme.js";
import type { ChatMessage } from "./Chat.js";

export type CommandArg = {
  name: string;
  placeholder: string;
  required: boolean;
};

/**
 * Contesto che l'App passa agli handler: tutto ciò che un comando può fare,
 * niente di più. Per aggiungere un comando basta una voce in COMMANDS.
 */
export type CommandContext = {
  agent: string;
  agentName: string;
  getMessages: () => ChatMessage[];
  /** /new: azzera conversazione, file, stack e titolo. */
  resetAll: () => void;
  /** /clear: azzera la conversazione a schermo (file e titolo restano). */
  clearMessages: () => void;
  getTitle: () => string;
  setTitle: (title: string) => void;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  openDiff: (filename?: string) => void;
  openHelp: () => void;
  openSessions: () => void;
  exit: () => void;
  notice: (msg: string) => void;
};

export type CommandDef = {
  name: string;
  description: string;
  usage: string;
  args: CommandArg[];
  handler: (ctx: CommandContext, args: string[]) => void | Promise<void>;
};

async function doLogin(ctx: CommandContext): Promise<void> {
  if (loadCredentials()) {
    ctx.notice("Sei già autenticato. Usa /logout per uscire e cambiare account.");
    return;
  }
  ctx.notice("Si apre il browser per accedere…");
  try {
    await browserLogin(loadConfig().apiUrl.replace(/\/$/, ""));
    ctx.notice("Accesso completato.");
  } catch (error) {
    ctx.notice(`Accesso fallito: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export const COMMANDS: CommandDef[] = [
  {
    name: "help",
    description: "Elenco comandi e scorciatoie",
    usage: "/help",
    args: [],
    handler: (ctx) => ctx.openHelp(),
  },
  {
    name: "new",
    description: "Nuova chat (azzera conversazione, file e titolo)",
    usage: "/new",
    args: [],
    handler: (ctx) => {
      ctx.resetAll();
      ctx.notice("Nuova chat pronta.");
    },
  },
  {
    name: "sessions",
    description: "Elenco e ripresa delle chat precedenti",
    usage: "/sessions",
    args: [],
    handler: (ctx) => ctx.openSessions(),
  },
  {
    name: "rename",
    description: "Rinomina la chat corrente (aggiorna la sidebar)",
    usage: "/rename <titolo>",
    args: [{ name: "titolo", placeholder: "nuovo titolo…", required: true }],
    handler: (ctx, args) => {
      const title = args.join(" ").trim();
      if (!title) {
        ctx.notice("Uso: /rename <titolo>");
        return;
      }
      ctx.setTitle(title);
      ctx.notice(`Chat rinominata: ${title}`);
    },
  },
  {
    name: "undo",
    description: "Annulla l'ultima modifica ai file",
    usage: "/undo",
    args: [],
    handler: (ctx) => ctx.undo(),
  },
  {
    name: "redo",
    description: "Ripristina la modifica annullata",
    usage: "/redo",
    args: [],
    handler: (ctx) => ctx.redo(),
  },
  {
    name: "diff",
    description: "Mostra le modifiche (tutte o di un file)",
    usage: "/diff [file]",
    args: [{ name: "file", placeholder: "nome file…", required: false }],
    handler: (ctx, args) => ctx.openDiff(args[0]),
  },
  {
    name: "clear",
    description: "Pulisce la conversazione a schermo",
    usage: "/clear",
    args: [],
    handler: (ctx) => {
      ctx.clearMessages();
      ctx.notice("Conversazione pulita (contesto azzerato, file invariati).");
    },
  },
  {
    name: "theme",
    description: "Mostra il tema attivo",
    usage: "/theme",
    args: [],
    handler: (ctx) => {
      ctx.notice(`Tema attivo: ${currentThemeName()} (unico disponibile).`);
    },
  },
  {
    name: "login",
    description: "Accedi al tuo account AgentCloud",
    usage: "/login",
    args: [],
    handler: (ctx) => doLogin(ctx),
  },
  {
    name: "logout",
    description: "Esci dall'account (chiude anche la chat)",
    usage: "/logout",
    args: [],
    handler: (ctx) => {
      clearCredentials();
      ctx.notice("Disconnesso.");
      ctx.exit();
    },
  },
  {
    name: "exit",
    description: "Esce dalla CLI",
    usage: "/exit",
    args: [],
    handler: (ctx) => ctx.exit(),
  },
];

export function findCommand(name: string): CommandDef | undefined {
  return COMMANDS.find((c) => c.name === name.toLowerCase());
}

/**
 * Filtra per il menu: prima i nomi che iniziano, poi quelli che contengono,
 * poi le descrizioni che contengono.
 */
export function filterCommands(query: string): CommandDef[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...COMMANDS];
  const starts: CommandDef[] = [];
  const contains: CommandDef[] = [];
  const inDesc: CommandDef[] = [];
  for (const c of COMMANDS) {
    if (c.name.startsWith(q)) starts.push(c);
    else if (c.name.includes(q)) contains.push(c);
    else if (c.description.toLowerCase().includes(q)) inDesc.push(c);
  }
  return [...starts, ...contains, ...inDesc];
}
