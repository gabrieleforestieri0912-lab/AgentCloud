import { adminRequest, agentLimit, userRequest, userWhoAmI } from "../api.js";
import { clearCredentials, loadConfig, loadCredentials } from "../config.js";
import { compareVersions, latestVersion, localVersion } from "../update.js";
import { currentThemeName } from "./theme.js";
import type { ChatMessage } from "./Chat.js";

/** Sito AgentCloud: i link di abbonamento agli agenti. */
const SITE = "https://www.agentcloud.agency";

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
  /** /sessions: popup con le chat precedenti, Invio riprende. */
  openSessions: () => void;
  /** /agents: popup con i tuoi agenti (e il catalogo), Invio cambia agente. */
  openAgents: () => void;
  /** /catalog: popup con tutto il catalogo, prezzi inclusi. */
  openCatalog: () => void;
  /** Apre il popup degli agenti e passa lo slug scelto. */
  pickAgent: (onPicked: (slug: string) => void) => void;
  /** Scrive un testo nell'input (senza riaprire il menu dei comandi). */
  preset: (text: string) => void;
  /** /login: overlay di login (browser o token) dentro la chat. */
  openLogin: () => void;
  /** /tabs: popup con le schede aperte, Invio ne cambia. */
  openTabs: () => void;
  /** /logout: credenziali rimosse, la chat resta aperta ma non autenticata. */
  onLogout: () => void;
  exit: () => void;
  notice: (msg: string) => void;
  /**
   * Mostra un blocco di output nella chat (versione, catalogo, usage...).
   * Il blocco NON entra nella cronologia inviata all'agente: è roba della
   * CLI, non della conversazione.
   */
  system: (title: string, body: string | string[]) => void;
  /**
   * Esegue una run isolata con un altro agente (comando `/run`): il prompt
   * non entra nella conversazione corrente.
   */
  runAgent: (agentSlug: string, prompt: string) => Promise<string>;
};

export type CommandDef = {
  /**
   * Nome del comando, senza "/". Può contenere spazi ("admin tenants list"):
   * il matching allora lavora su frasi intere, non sul solo primo token.
   */
  name: string;
  description: string;
  usage: string;
  args: CommandArg[];
  /**
   * Il comando gestisce da solo i suoi argomenti (es. `/run` apre il popup
   * degli agenti): l'App non deve fermarlo con il "suggerimento argomento".
   */
  picker?: boolean;
  /**
   * `args` = argomenti posizionali; `rest` = tutto il testo dopo il nome
   * del comando (per `--flag value` e per prompt con spazi).
   */
  handler: (ctx: CommandContext, args: string[], rest: string) => void | Promise<void>;
};

async function doLogin(ctx: CommandContext): Promise<void> {
  // La schermata di login si apre sempre: serve per entrare la prima volta,
  // ma anche per cambiare account o rifare una sessione scaduta.
  ctx.openLogin();
}

/** Messaggio d'errore leggibile (niente stack trace in faccia all'utente). */
function errText(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

/** Toglie le virgolette attorno a un valore, se presenti. */
function unquote(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1);
  }
  if (trimmed.length >= 2 && trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

/** `--key value`, `--key=value` e `--flag` (booleano) in un testo qualsiasi. */
export function parseFlags(input: string): { flags: Record<string, string>; positional: string[] } {
  const flags: Record<string, string> = {};
  const positional: string[] = [];
  const tokens = input.match(/"[^"]*"|'[^']*'|\S+/g) ?? [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.startsWith("--")) {
      const eq = token.indexOf("=");
      if (eq > 0) {
        flags[token.slice(2, eq)] = unquote(token.slice(eq + 1));
        continue;
      }
      const key = token.slice(2);
      const next = tokens[i + 1];
      if (next !== undefined && !next.startsWith("--")) {
        flags[key] = unquote(next);
        i++;
      } else {
        flags[key] = "true";
      }
      continue;
    }
    positional.push(unquote(token));
  }
  return { flags, positional };
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
    name: "version",
    description: "Versione della CLI, di Node e dell'API",
    usage: "/version",
    args: [],
    handler: (ctx) =>
      ctx.system("Versione", [
        `agentcloud-cli v${localVersion()}`,
        `Node ${process.version} (${process.platform}/${process.arch})`,
        `API ${loadConfig().apiUrl}`,
        "Equivalente: agentcloud --version",
      ]),
  },
  {
    name: "tabs",
    description: "Elenco delle schede aperte (Invio ne cambia)",
    usage: "/tabs",
    args: [],
    handler: (ctx) => ctx.openTabs(),
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
    name: "agents",
    description: "Scegli l'agente attivo (popup con i tuoi agenti)",
    usage: "/agents",
    args: [],
    handler: (ctx) => ctx.openAgents(),
  },
  {
    name: "catalog",
    description: "Catalogo agenti e prezzi (popup di scelta)",
    usage: "/catalog",
    args: [],
    handler: (ctx) => ctx.openCatalog(),
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
    description: "Esci dall'account (torna alla chat non autenticata)",
    usage: "/logout",
    args: [],
    handler: (ctx) => {
      clearCredentials();
      ctx.notice("Disconnesso. Usa /login per entrare di nuovo.");
      ctx.onLogout();
    },
  },
  {
    name: "whoami",
    description: "Mostra l'utente autenticato e i suoi agenti",
    usage: "/whoami",
    args: [],
    handler: async (ctx) => {
      try {
        const who = await userWhoAmI();
        ctx.system("Utente autenticato", [
          `Email: ${who.email || "(non disponibile)"}`,
          `Agenti attivi: ${who.owned.length}`,
          ...(who.owned.length ? who.owned.map((slug) => `  - ${slug}`) : []),
        ]);
      } catch (error) {
        ctx.system("Utente non disponibile", [errText(error)]);
      }
    },
  },
  {
    name: "usage",
    description: "Piano corrente e consumi (messaggi gratuiti residui)",
    usage: "/usage",
    args: [],
    handler: async (ctx) => {
      const rows: string[] = [];
      try {
        const data = await userRequest<{
          plan?: string;
          tokensUsed?: number;
          tokenLimit?: number;
          runs?: number;
        }>("/api/user/usage");
        rows.push(`Piano: ${data.plan ?? "?"}`);
        rows.push(`Token usati: ${data.tokensUsed ?? "?"} / ${data.tokenLimit ?? "?"}`);
        rows.push(`Run: ${data.runs ?? "?"}`);
      } catch (error) {
        rows.push(`Uso non disponibile: ${errText(error)}`);
      }
      // Messaggi gratuiti residui: stessa fonte del banner in chat.
      try {
        const limit = await agentLimit(ctx.agent);
        if (limit.unlimited) {
          rows.push("Messaggi gratuiti: nessun limite (abbonamento attivo)");
        } else {
          rows.push(
            `Messaggi gratuiti residui: ${limit.remaining} su ${limit.limit} al giorno` +
              (limit.resetAt ? ` (reset ${new Date(limit.resetAt).toLocaleTimeString()})` : ""),
          );
          rows.push(`Abbonati: ${SITE}/agents/${ctx.agent}`);
        }
      } catch (error) {
        rows.push(`Budget non disponibile: ${errText(error)}`);
      }
      ctx.system("Uso e piano", rows);
    },
  },
  {
    name: "config",
    description: "Configurazione locale (URL API, agente predefinito, credenziali)",
    usage: "/config",
    args: [],
    handler: (ctx) => {
      const config = loadConfig();
      ctx.system("Configurazione", [
        `API URL: ${config.apiUrl}`,
        `Agente predefinito: ${config.defaultAgent ?? "(nessuno)"}`,
        `Tema: ${config.theme ?? currentThemeName()}`,
        `Credenziali: ${loadCredentials() ? "presenti" : "assenti"}`,
        "Per cambiarla: agentcloud config --url <url>",
      ]);
    },
  },
  {
    name: "update",
    description: "Controlla se c'è una versione nuova della CLI",
    usage: "/update",
    args: [],
    handler: async (ctx) => {
      try {
        const local = localVersion();
        const latest = await latestVersion();
        const cmp = compareVersions(local, latest);
        if (cmp === 0) ctx.system("Aggiornamenti", [`Sei già aggiornato (v${local}).`]);
        else if (cmp > 0)
          ctx.system("Aggiornamenti", [
            `Versione locale v${local} più recente di quella pubblicata (v${latest}).`,
          ]);
        else
          ctx.system("Aggiornamenti", [
            `Disponibile v${latest} (locale v${local}).`,
            "Installa con: agentcloud update",
          ]);
      } catch (error) {
        ctx.system("Aggiornamenti", [errText(error)]);
      }
    },
  },
  {
    name: "run",
    description: "Esegui una richiesta isolata con un altro agente",
    usage: "/run <agente> <prompt>",
    args: [
      { name: "agente", placeholder: "support-agent", required: true },
      { name: "prompt", placeholder: "cosa deve fare", required: true },
    ],
    // L'agente mancante si sceglie dal popup, il prompt si scrive dopo.
    picker: true,
    handler: async (ctx, args, rest) => {
      const slug = (args[0] ?? "").trim();
      const prompt = rest.slice(slug.length).trim();
      if (!slug) {
        // Senza agente: si sceglie dal popup, poi il prompt si scrive.
        ctx.pickAgent((chosen) => ctx.preset(`/run ${chosen} `));
        return;
      }
      if (!prompt) {
        ctx.notice("Uso: /run <agente> <prompt>");
        return;
      }
      try {
        const answer = await ctx.runAgent(slug, prompt);
        ctx.system(`run ${slug}`, answer.trim() || "(nessuna risposta)");
      } catch (error) {
        ctx.system(`run ${slug} — errore`, [errText(error)]);
      }
    },
  },
  {
    name: "chat",
    description: "Sei già nella chat: parla con l'agente attivo",
    usage: "/chat",
    args: [],
    handler: (ctx) => {
      ctx.notice(`Sei già in chat con ${ctx.agentName}. Scrivi il messaggio e premi Invio.`);
    },
  },
  {
    name: "admin tenants list",
    description: "Elenca i tenant registrati (serve AGENTCLOUD_ADMIN_TOKEN)",
    usage: "/admin tenants list",
    args: [],
    handler: async (ctx) => {
      try {
        const data = await adminRequest<{ tenants?: unknown[] }>("/api/admin/tenants");
        ctx.system("admin tenants list", JSON.stringify(data.tenants ?? data, null, 2));
      } catch (error) {
        ctx.system("admin tenants list — errore", [errText(error)]);
      }
    },
  },
  {
    name: "admin integrations status",
    description: "Stato delle integrazioni (serve AGENTCLOUD_ADMIN_TOKEN)",
    usage: "/admin integrations status [--tenant <id>]",
    args: [{ name: "tenant", placeholder: "tenant-id", required: false }],
    handler: async (ctx, _args, rest) => {
      try {
        const { flags } = parseFlags(rest);
        const query = flags.tenant ? `?tenant=${encodeURIComponent(flags.tenant)}` : "";
        const data = await adminRequest(`/api/admin/integrations/status${query}`);
        ctx.system("admin integrations status", JSON.stringify(data, null, 2));
      } catch (error) {
        ctx.system("admin integrations status — errore", [errText(error)]);
      }
    },
  },
  {
    name: "admin flags show",
    description: "Feature flag visibili dalla CLI (sola lettura, come il comando CLI)",
    usage: "/admin flags show",
    args: [],
    handler: (ctx) => {
      // Come `agentcloud admin flags show`: nessuna API, si legge solo
      // l'ambiente in cui gira la CLI (i flag di Vercel vanno controllati
      // nella dashboard).
      ctx.system("admin flags show", [
        `AGENTCLOUD_VERTICAL=${process.env.AGENTCLOUD_VERTICAL || "(non disponibile nella CLI; verifica Vercel)"}`,
        `AGENTCLOUD_FEATURE_FLAGS=${process.env.AGENTCLOUD_FEATURE_FLAGS ? "(configurato; valore omesso)" : "(non disponibile nella CLI)"}`,
      ]);
    },
  },
  {
    name: "admin email send",
    description: "Invia un'email (serve AGENTCLOUD_ADMIN_TOKEN)",
    usage: "/admin email send --to <email> --subject <testo> [--body <testo>|--html <html>]",
    args: [
      { name: "to", placeholder: "destinatario@esempio.it", required: true },
      { name: "subject", placeholder: "oggetto", required: true },
      { name: "body", placeholder: "testo", required: false },
      { name: "html", placeholder: "html", required: false },
    ],
    handler: async (ctx, _args, rest) => {
      const { flags } = parseFlags(rest);
      if (!flags.to || !flags.subject || (!flags.body && !flags.html)) {
        ctx.notice("Uso: /admin email send --to <email> --subject <testo> --body <testo>");
        return;
      }
      try {
        await adminRequest("/api/email/send", {
          method: "POST",
          body: JSON.stringify({
            to: flags.to,
            subject: flags.subject,
            text: flags.body,
            html: flags.html,
          }),
        });
        ctx.system("admin email send", [`Email inviata a ${flags.to}.`]);
      } catch (error) {
        ctx.system("admin email send — errore", [errText(error)]);
      }
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
  return COMMANDS.find((c) => c.name.toLowerCase() === name.trim().toLowerCase());
}

/** Testo scritto dopo "/" (minuscolo, senza slash iniziale). */
export function commandBody(draft: string): string {
  const body = draft.startsWith("/") ? draft.slice(1) : draft;
  return body.trim().toLowerCase();
}

/**
 * Argomenti di un comando: tutto il testo che segue il nome.
 * `rest` conserva gli spazi (serve a `/run <agente> <prompt con spazi>`).
 */
export function commandArgs(def: CommandDef, body: string): { args: string[]; rest: string } {
  const rest = body.slice(def.name.length).trim();
  return { args: rest ? rest.split(/\s+/) : [], rest };
}

/**
 * Filtra il registro per il testo digitato.
 *
 * I nomi possono contenere spazi ("admin tenants list"): il confronto è
 * fatto su frasi intere. Ordine di preferenza: corrispondenza esatta, poi
 * prefisso del nome ("ad" -> "admin …"), poi nome già completo con
 * argomenti ("run support-agent …"), poi corrispondenza nella descrizione.
 */
export function matchCommands(query: string): CommandDef[] {
  const q = commandBody(query);
  if (!q) return [...COMMANDS];
  const exact: CommandDef[] = [];
  const byPrefix: CommandDef[] = [];
  const byBody: CommandDef[] = [];
  const byDescription: CommandDef[] = [];
  for (const c of COMMANDS) {
    const name = c.name.toLowerCase();
    if (name === q) exact.push(c);
    else if (name.startsWith(q)) byPrefix.push(c);
    else if (q.startsWith(name) && /\s/.test(q.charAt(name.length))) byBody.push(c);
    else if (c.description.toLowerCase().includes(q)) byDescription.push(c);
  }
  byPrefix.sort((a, b) => a.name.length - b.name.length);
  byBody.sort((a, b) => a.name.length - b.name.length);
  return [...exact, ...byPrefix, ...byBody, ...byDescription];
}
