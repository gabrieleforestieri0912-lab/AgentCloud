#!/usr/bin/env node
import { Command } from "commander";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { clearCredentials, loadConfig, loadCredentials, saveConfig } from "./config.js";
import { adminRequest, ApiError, loginUser, streamAgent, userRequest, userWhoAmI } from "./api.js";
import { CATALOG } from "./catalog.js";

const SITE = "https://www.agentcloud.agency";
const program = new Command();
const agents = program.command("agents").description("Gestisci agenti posseduti e catalogo");
const admin = program.command("admin").description("Operazioni amministrative (richiede AGENTCLOUD_ADMIN_TOKEN)");

program.name("agentcloud").description("CLI AgentCloud per utenti e amministratori").version("0.1.0");

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

program.command("login").description("Accedi con email e password; non salva mai la password").action(async () => {
  try {
    const { email, password } = await askCredentials();
    await loginUser(email, password);
    console.log("✓ Login completato. Credenziali salvate in ~/.agentcloud/credentials.json");
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
  printTable([["NOME", "CATEGORIA", "PREZZO", "MARKETPLACE"], ...CATALOG.map((agent) => [agent.name, agent.category, agent.price, `${SITE}/agents/${agent.slug}`])]);
});

async function runOnce(agent: string, prompt: string) {
  let answer = "";
  await streamAgent(agent, [{ role: "user", content: prompt }], (event) => {
    if (event.type === "text" && typeof event.content === "string") { process.stdout.write(event.content); answer += event.content; }
    if (event.type === "tool_start") process.stderr.write(`\n[tool: ${String(event.toolName)}] `);
    if (event.type === "error") throw new Error(String(event.message || "Errore agente"));
  });
  if (!answer) console.log("Nessuna risposta ricevuta."); else console.log("\n");
}

program.command("run").description("Esegui un prompt con un agente posseduto").argument("<agent-slug>").argument("<messaggio>").action(async (agent: string, message: string) => {
  try { await runOnce(agent, message); } catch (error) { printError(error); }
});

program.command("chat").description("Avvia una chat interattiva con un agente posseduto").argument("<agent-slug>").action(async (agent: string) => {
  const rl = readline.createInterface({ input, output });
  const history: Array<{ role: "user" | "assistant"; content: string }> = [];
  console.log(`Chat con ${agent}. Digita "exit" per uscire.`);
  try {
    while (true) {
      const message = (await rl.question("> ")).trim();
      if (!message || message.toLowerCase() === "exit") break;
      history.push({ role: "user", content: message });
      let answer = "";
      await streamAgent(agent, history, (event) => {
        if (event.type === "text" && typeof event.content === "string") { process.stdout.write(event.content); answer += event.content; }
      });
      console.log("\n");
      if (answer) history.push({ role: "assistant", content: answer });
    }
  } catch (error) { printError(error); } finally { rl.close(); }
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

program.parseAsync(process.argv).catch(printError);
