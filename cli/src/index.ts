#!/usr/bin/env node
import { Command } from "commander";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { clearCredentials, loadConfig, loadCredentials, saveConfig } from "./config.js";
import { loadChatSession, resumeHint, saveChatSession, type ChatSession } from "./sessions.js";
import { localVersion, maybeNotifyUpdate, runUpdate } from "./update.js";
import { browserLogin } from "./browser-login.js";
import { printLoginHint, printWelcome } from "./welcome.js";
import { select } from "./tui/select.js";
import { bold, cyan, dim, green, hr, red, yellow } from "./ui.js";
import { adminRequest, ApiError, loginUser, loginWithToken, streamAgent, userRequest, userWhoAmI } from "./api.js";
import { CATALOG } from "./catalog.js";

const SITE = "https://www.agentcloud.agency";
const program = new Command();
const agents = program.command("agents").description("Gestisci agenti posseduti e catalogo");
const admin = program.command("admin").description("Operazioni amministrative (richiede AGENTCLOUD_ADMIN_TOKEN)");

program.name("agentcloud").description("CLI AgentCloud per utenti e amministratori").version(localVersion());

function printError(error: unknown): never {
  if (error instanceof ApiError) {
    console.error(`Errore ${error.status}: ${error.message}`);
    if (error.status === 401) console.error("Suggerimento: esegui `agentcloud login`.");
    if (error.status === 402 || error.status === 429) console.error(`Gestisci il piano: ${SITE}/dashboard/subscriptions`);
  } else console.error(`Errore: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

async function askSecret(prompt: string): Promise<string> {
  output.write(prompt);
  const stdin = input as NodeJS.ReadStream & { isTTY?: boolean; setRawMode?: (mode: boolean) => void };
  if (!stdin.isTTY || !stdin.setRawMode) {
    output.write("\nNota: il terminale non supporta l'input nascosto.\n");
    const rl = readline.createInterface({ input, output });
    const value = await rl.question("");
    rl.close();
    return value;
  }
  return await new Promise((resolve) => {
    let value = "";
    const onData = (chunk: Buffer) => {
      const char = chunk.toString("utf8");
      if (char === "\\n" || char === "\\r" || char === "\\u0004") {
        stdin.setRawMode?.(false);
        stdin.pause();
        stdin.off("data", onData);
        output.write("\\n");
        resolve(value);
      } else if (char === "\\u0003") {
        stdin.setRawMode?.(false);
        stdin.pause();
        stdin.off("data", onData);
        output.write("\\n");
        resolve("");
      } else if (char === "\\u007f") {
        value = value.slice(0, -1);
      } else {
        value += char;
      }
    };
    stdin.setRawMode?.(true);
    stdin.resume();
    stdin.on("data", onData);
  });
}

async function askCredentials() {
  const rl = readline.createInterface({ input, output });
  const email = (await rl.question("Email: ")).trim();
  rl.close();
  const password = await askSecret("Password: ");
  return { email, password };
}

function printTable(rows: string[][]) {
  const widths = rows[0].map((_, i) => Math.max(...rows.map((row) => row[i]?.length || 0)));
  for (const row of rows) console.log(row.map((cell, i) => cell.padEnd(widths[i])).join("  "));
}

program.command("login").description("Accedi dal browser, con email/password o con un token API (impostazioni → Token API)").option("--password", "Usa email e password invece del browser").option("--token <token>", "Usa un token API act_… generato nelle impostazioni (pagina /account)").action(async (options: { password?: boolean; token?: string }) => {
  try {
    if (options.token) {
      await loginWithToken(options.token.trim());
      console.log("✓ Login con token completato. Credenziali salvate in ~/.agentcloud/credentials.json");
      return;
    }
    if (options.password || !output.isTTY) {
      if (!options.password && !output.isTTY) {
        console.log("Senza terminale interattivo uso email e password (il browser non si può aprire).");
      }
      const { email, password } = await askCredentials();
      await loginUser(email, password);
      console.log("✓ Login completato. Credenziali salvate in ~/.agentcloud/credentials.json");
      return;
    }
    await browserLogin(loadConfig().apiUrl.replace(/\/$/, ""));
    console.log("✓ Login completato dal browser. Credenziali salvate in ~/.agentcloud/credentials.json");
  } catch (error) { printError(error); }
});

program.command("logout").description("Rimuove le credenziali utente locali").action(() => {
  clearCredentials();
  console.log("✓ Logout completato.");
});

program.command("whoami").description("Mostra l'utente autenticato").action(async () => {
  const credentials = loadCredentials();
  if (!credentials) { console.log("Non autenticato. Esegui `agentcloud login`."); return; }
  try {
    const data = await userWhoAmI();
    console.log(`Email: ${data.email || credentials.email || "non disponibile"}`);
    console.log(`Agenti attivi: ${data.owned.length}`);
  } catch (error) { printError(error); }
});

agents.command("list").description("Elenca gli agenti posseduti").action(async () => {
  try {
    const data = await userWhoAmI();
    if (!data.owned.length) { console.log("Nessun agente attivo. Vedi il catalogo con `agentcloud agents catalog`."); return; }
    printTable([["NOME", "SLUG", "STATO"], ...data.owned.map((slug) => [slug, slug, "attivo"])]);
  } catch (error) { printError(error); }
});

agents.command("catalog").description("Mostra il catalogo e i prezzi; il checkout avviene sul web").action(() => {
  printTable([
    ["NOME", "CATEGORIA", "PREZZO", "STATO", "MARKETPLACE"],
    ...CATALOG.map((agent) => [
      agent.name,
      agent.category,
      agent.price,
      agent.comingSoon ? "Prossimamente" : "Disponibile",
      `${SITE}/agents/${agent.slug}`,
    ]),
  ]);
});

/**
 * Stato catturato dallo stream per il flusso di conferma umana. Il server mette
 * in pausa la run quando un tool modifica contenuto esistente (es. append su un
 * documento Microsoft) e manda `tool_confirm` con un token firmato. La CLI può
 * solo approvare o annullare: non può cambiare tool né argomenti.
 */
type StreamState = {
  answer: string;
  pending: { token: string; toolName: string } | null;
};

/** Gestore eventi SSE condiviso da `run` e `chat`. */
function handleEvent(event: Record<string, unknown>, state: StreamState): void {
  if (event.type === "text" && typeof event.content === "string") {
    process.stdout.write(event.content);
    state.answer += event.content;
  } else if (event.type === "tool_start") {
    process.stderr.write(yellow(`\n[tool: ${String(event.toolName)}] `));
  } else if (event.type === "tool_done") {
    process.stderr.write(dim(`[done: ${String(event.toolName)}] `));
  } else if (event.type === "file" && typeof event.filename === "string") {
    process.stderr.write(cyan(`[file: ${String(event.filename)}] `));
  } else if (event.type === "connection" && typeof event.provider === "string") {
    // La connessione OAuth si completa sul sito: qui solo l'avviso operativo.
    process.stderr.write(yellow(`\n[connessione richiesta: ${event.provider} → ${SITE}/dashboard/integrations] `));
  } else if (event.type === "tool_confirm") {
    state.pending = {
      token: typeof event.token === "string" ? event.token : "",
      toolName: String(event.toolName || "tool"),
    };
  } else if (event.type === "error") {
    throw new Error(String(event.message || "Errore agente"));
  }
}

/** Chiede conferma all'utente per un tool che modifica contenuto esistente. */
async function confirmTool(toolName: string): Promise<boolean> {
  const rl = readline.createInterface({ input, output });
  const answer = await rl.question(`\nConfermi l'esecuzione di "${toolName}"? [y/N] `);
  rl.close();
  return answer.trim().toLowerCase() === "y";
}

/**
 * Esegue una run gestendo l'eventuale pausa di conferma. `autoApprove` serve
 * alle pipeline non interattive (`run --yes`); senza TTY e senza `--yes` la
 * conferma viene negata con un avviso per non bloccare gli script.
 */
async function runWithApproval(
  agent: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  options: { autoApprove?: boolean } = {},
): Promise<string> {
  const state: StreamState = { answer: "", pending: null };
  let token: string | undefined;
  // Limite di sicurezza: una run non deve poter chiedere conferme all'infinito.
  for (let round = 0; round < 5; round++) {
    state.pending = null;
    await streamAgent(agent, messages, (event) => handleEvent(event, state), token ? { approvalToken: token } : {});
    // `handleEvent` popola `state.pending` dentro la callback: TS non vede la
    // mutazione e stringerebbe il tipo a `null`, quindi forziamo il tipo.
    const pending = state.pending as { token: string; toolName: string } | null;
    if (!pending) return state.answer;

    let approved: boolean;
    if (options.autoApprove) approved = true;
    else if (input.isTTY) approved = await confirmTool(pending.toolName);
    else {
      console.error(`\nConferma richiesta per "${pending.toolName}": nessun terminale interattivo. Usa --yes per autorizzare.`);
      approved = false;
    }
    if (!approved) {
      console.error("Operazione annullata.");
      return state.answer;
    }
    token = pending.token;
  }
  console.error("Troppe conferme richieste: interrompo la run.");
  return state.answer;
}

program.command("run").description("Esegui un prompt con un agente posseduto").argument("<agent-slug>").argument("<messaggio>").option("--yes", "Approva automaticamente le azioni che richiedono conferma").action(async (agent: string, message: string, options: { yes?: boolean }) => {
  try {
    const answer = await runWithApproval(agent, [{ role: "user", content: message }], { autoApprove: Boolean(options.yes) });
    if (!answer) console.log("Nessuna risposta ricevuta."); else console.log("\n");
  } catch (error) { printError(error); }
});

program.command("chat").description("Avvia una chat interattiva (l'agente si sceglie dentro la chat)").argument("[agent-slug]").option("--resume <codice>", "Riprendi una chat salvata in precedenza").action(async (agent: string | undefined, options: { resume?: string }) => {
  // Senza login la chat non può partire: logo + istruzioni invece di un
  // secco "non autenticato".
  if (!loadCredentials()) {
    printWelcome();
    printLoginHint();
    process.exit(1);
  }

  // Senza slug si sceglie dentro la chat (picker con frecce). Senza
  // terminale interattivo non si può scegliere: serve lo slug esplicito.
  let slug = agent;
  let resumed: ChatSession | null = null;
  if (options.resume) {
    resumed = loadChatSession(options.resume);
    if (!slug) slug = resumed.agent;
  }
  const interactiveTTY = Boolean(input.isTTY && output.isTTY);
  if (!slug) {
    if (!interactiveTTY) {
      console.error("Specifica l'agente: `agentcloud chat <agent-slug>` (senza terminale interattivo non si può scegliere).");
      process.exit(1);
    }
    const available = CATALOG.filter((a) => !a.comingSoon);
    slug = await select(
      "Con quale agente vuoi chattare?",
      available.map((a) => ({ label: a.name, hint: `${a.category} · ${a.price}`, value: a.slug })),
    );
  }
  const agentName = CATALOG.find((a) => a.slug === slug)?.name ?? slug;

  const history: Array<{ role: "user" | "assistant"; content: string }> = [];
  let sessionCode: string | undefined;
  // Ripresa: titolo e file viaggiano nel salvataggio anche dal percorso
  // classico (che non li tocca altrimenti e li perderebbe riscrivendo).
  const carriedTitle = resumed?.title;
  const carriedFiles = resumed?.files;

  // La cronologia vive solo in memoria finché non si esce: a quel punto si
  // salva su disco e si stampa il codice per tornarci.
  const saveAndHint = () => {
    if (history.length === 0) return;
    const session = saveChatSession(slug, history, sessionCode, { title: carriedTitle, files: carriedFiles });
    sessionCode = session.code;
    console.log(`\n${green(resumeHint(slug, session.code))}`);
  };

  if (resumed) {
    const session = resumed;
    if (session.agent !== slug) {
      console.error(red(`La sessione ${session.code} è dell'agente "${session.agent}": usa \`agentcloud chat ${session.agent} --resume ${session.code}\`.`));
      process.exit(1);
    }
    sessionCode = session.code;
    history.push(...session.messages);
  }

  // Terminale interattivo → TUI a schermo intero. Altrimenti (pipe, CI) o con
  // AGENTCLOUD_NO_TUI → loop readline classico, invariato.
  if (interactiveTTY && !process.env.AGENTCLOUD_NO_TUI) {
    const { runChatTui } = await import("./tui/App.js");
    const { setTheme } = await import("./tui/theme.js");
    setTheme(loadConfig().theme || "dark");
    const resumedSession = resumed;
    const result = await runChatTui({
      agent: slug,
      agentName,
      initial: history,
      initialTitle: resumedSession?.title,
      initialFiles: resumedSession?.files,
    });
    history.length = 0;
    history.push(...result.messages);
    const session = saveChatSession(slug, history, sessionCode, { title: result.title || undefined, files: result.files });
    sessionCode = session.code;
    console.log(`\n${green(resumeHint(slug, session.code))}`);
    return;
  }

  const rl = readline.createInterface({ input, output });
  // Ctrl+C: la readline da sola perderebbe la cronologia, quindi si salva qui.
  // Solo nel percorso classico: nella TUI Ctrl+C è gestito dentro l'App,
  // altrimenti l'handler scatterebbe con lo schermo alternativo attivo.
  const onSigint = () => {
    try { saveAndHint(); } catch { /* disco pieno? esci comunque */ } finally { process.exit(0); }
  };
  process.once("SIGINT", onSigint);
  try {
    if (resumed) {
      console.log(green(`Sessione ${sessionCode} ripristinata (${history.length} messaggi).`));
    }
    console.log(hr());
    console.log(`${bold(`Chat con ${agentName}`)} ${dim(`(${slug})`)}`);
    console.log(dim('Scrivi e premi Invio · "exit" per uscire · all\'uscita ricevi il codice per riprendere'));
    console.log(hr());
    while (true) {
      const raw = (await rl.question(bold(cyan("tu › ")))) as unknown as string | null;
      if (raw === null) break; // Ctrl+D / EOF
      const message = raw.trim();
      if (message.toLowerCase() === "exit") break;
      if (!message) continue;
      history.push({ role: "user", content: message });
      output.write(green(`${slug} › `));
      const answer = await runWithApproval(slug, history);
      console.log(`\n${hr()}`);
      if (answer) history.push({ role: "assistant", content: answer });
    }
    saveAndHint();
  } catch (error) {
    // Anche in caso di errore la cronologia si conserva: l'utente la ritrova
    // col codice stampato qui sotto invece di ricominciare da zero.
    try { saveAndHint(); } catch { /* ignore */ }
    printError(error);
  } finally { process.removeListener("SIGINT", onSigint); rl.close(); }
});

program.command("update").description("Aggiorna la CLI all'ultima versione pubblicata su npm").option("--check", "Controlla soltanto, senza installare").action(async (options: { check?: boolean }) => {
  try { await runUpdate(Boolean(options.check)); } catch (error) { printError(error); }
});

program.command("usage").description("Mostra uso e piano corrente").action(async () => {
  try {
    const data = await userRequest<{ plan?: string; tokensUsed?: number; tokenLimit?: number; runs?: number }>("/api/user/usage");
    printTable([["PIANO", "TOKEN USATI", "LIMITE", "RUN"], [String(data.plan || "—"), String(data.tokensUsed ?? "—"), String(data.tokenLimit ?? "—"), String(data.runs ?? "—")]]);
  } catch (error) { printError(error); }
});

const adminTenants = admin.command("tenants").description("Gestisci tenants");
adminTenants.command("list").description("Elenca i tenants registrati").action(async () => {
  try { const data = await adminRequest<{ tenants?: unknown[] }>("/api/admin/tenants"); console.log(JSON.stringify(data.tenants ?? data, null, 2)); } catch (error) { printError(error); }
});

const adminEmail = admin.command("email").description("Email transazionali");
adminEmail.command("send").requiredOption("--to <email>").requiredOption("--subject <subject>").option("--body <text>").option("--html <html>").option("--yes", "Salta conferma").action(async (options: { to: string; subject: string; body?: string; html?: string; yes?: boolean }) => {
  if (!options.body && !options.html) { console.error("Specifica --body oppure --html."); process.exit(1); }
  if (!options.yes) {
    const rl = readline.createInterface({ input, output });
    const answer = await rl.question(`Inviare email a ${options.to} con oggetto "${options.subject}"? [y/N] `);
    rl.close();
    if (answer.toLowerCase() !== "y") { console.log("Invio annullato."); return; }
  }
  try { await adminRequest("/api/email/send", { method: "POST", body: JSON.stringify({ to: options.to, subject: options.subject, text: options.body, html: options.html }) }); console.log("✓ Email inviata."); } catch (error) { printError(error); }
});

const adminIntegrations = admin.command("integrations").description("Stato integrazioni");
adminIntegrations.command("status").option("--tenant <id>", "Tenant da verificare").action(async (options: { tenant?: string }) => {
  try {
    const query = options.tenant ? `?tenant=${encodeURIComponent(options.tenant)}` : "";
    const data = await adminRequest(`/api/admin/integrations/status${query}`);
    console.log(JSON.stringify(data, null, 2));
  } catch (error) { printError(error); }
});

admin.command("flags").description("Feature flags (sola lettura)").command("show").action(() => {
  console.log("Feature flags CLI: sola lettura.");
  console.log(`AGENTCLOUD_VERTICAL=${process.env.AGENTCLOUD_VERTICAL || "(non disponibile nella CLI; verifica Vercel)"}`);
  console.log(`AGENTCLOUD_FEATURE_FLAGS=${process.env.AGENTCLOUD_FEATURE_FLAGS ? "(configurato; valore omesso)" : "(non disponibile nella CLI)"}`);
});

program.command("config").description("Mostra o aggiorna configurazione non sensibile").option("--url <url>").action((options: { url?: string }) => {
  if (options.url) saveConfig({ apiUrl: options.url });
  const config = loadConfig();
  console.log(`API URL: ${config.apiUrl}`);
  console.log(`Agente predefinito: ${config.defaultAgent}`);
  console.log(`Credenziali utente: ${loadCredentials() ? "presenti" : "assenti"}`);
  console.log("Token admin: solo AGENTCLOUD_ADMIN_TOKEN, mai salvato dalla CLI.");
});

// Senza argomenti: schermata di benvenuto con logo e istruzioni,
// poi l'help completo dei comandi.
if (process.argv.length <= 2) {
  printWelcome();
  program.outputHelp();
  process.exit(0);
}

// Avviso di aggiornamento prima di eseguire il comando (mai bloccante,
// mai negli script: vedi update.ts).
await maybeNotifyUpdate(process.argv);

program.parseAsync(process.argv).catch(printError);
