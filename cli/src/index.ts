#!/usr/bin/env node

import { Command } from "commander";
import * as http from "http";
import * as crypto from "crypto";
import { loadConfig, saveConfig } from "./config.js";
import { executeAgent } from "./api.js";

const program = new Command();

program
  .name("agentcloud")
  .description("CLI ufficiale di AgentCloud - Esegui e gestisci agenti AI dal terminale")
  .version("0.1.0");

// Helper: apri browser in modo cross-platform senza dipendere da `open` ESM dinamico
async function openBrowser(url: string) {
  try {
    const mod: any = await import("open");
    const fn = mod.default ?? mod.open ?? mod;
    await fn(url);
  } catch {
    console.log(`Apri manualmente questo URL nel browser:\n  ${url}`);
  }
}

program
  .command("login")
  .description("Autenticazione via browser (apre la pagina di login web) o con token diretto")
  .argument("[token]", "Il tuo API token di AgentCloud (se già in possesso, altrimenti avvia il flusso browser)")
  .option("--api-url <url>", "Override URL base API (default https://agentcloud.agency)")
  .action(async (tokenArg: string | undefined, opts: { apiUrl?: string }) => {
    // Caso legacy: token passato direttamente
    if (tokenArg && tokenArg.trim().length > 8 && !tokenArg.startsWith("http")) {
      saveConfig({ token: tokenArg.trim(), ...(opts.apiUrl ? { apiUrl: opts.apiUrl } : {}) });
      console.log("✓ Token di autenticazione salvato con successo!");
      return;
    }

    const config = loadConfig();
    const apiUrl = opts.apiUrl ?? config.apiUrl ?? "https://agentcloud.agency";
    if (opts.apiUrl) saveConfig({ apiUrl });

    const state = crypto.randomBytes(16).toString("hex");
    const chosenPort = 0; // 0 = porta libera

    // Avvia server locale per callback
    const server = http.createServer();
    let resolved = false;

    const tokenPromise = new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          try { server.close(); } catch {}
          reject(new Error("Timeout: nessun callback ricevuto entro 5 minuti. Riprova con `agentcloud login`."));
        }
      }, 5 * 60 * 1000);

      server.on("request", (req, res) => {
        const url = new URL(req.url ?? "/", `http://127.0.0.1`);
        if (url.pathname === "/callback") {
          const token = url.searchParams.get("token");
          const returnedState = url.searchParams.get("state");
          const error = url.searchParams.get("error");
          if (error) {
            res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
            res.end(`<html><body style="font-family:sans-serif;padding:40px"><h2>Autenticazione fallita</h2><p>${error}</p><p>Chiudi questa finestra e riprova.</p></body></html>`);
            clearTimeout(timeout);
            if (!resolved) { resolved = true; reject(new Error(error)); }
            try { server.close(); } catch {}
            return;
          }
          if (!token) {
            res.writeHead(400, { "Content-Type": "text/plain" });
            res.end("Missing token");
            return;
          }
          if (returnedState !== state) {
            res.writeHead(400, { "Content-Type": "text/plain" });
            res.end("State mismatch");
            clearTimeout(timeout);
            if (!resolved) { resolved = true; reject(new Error("State mismatch - possibile attacco CSRF")); }
            try { server.close(); } catch {}
            return;
          }
          // Successo
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(`<html><head><meta charset=\"utf-8\"/><title>AgentCloud CLI</title></head><body style=\"font-family:Manrope, sans-serif;background:#0A0A0F;color:#F9FAFB;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0\"><div style=\"background:#13131A;border:1px solid #262635;border-radius:16px;padding:32px;max-width:420px;text-align:center\"><div style=\"font-size:32px\">✅</div><h1 style=\"margin:12px 0 8px\">Autenticato!</h1><p style=\"color:#9CA3AF;font-size:14px\">Token salvato nella CLI. Puoi chiudere questa finestra e tornare al terminale.</p><p style=\"color:#6366F1;font-size:12px;margin-top:16px\">agentcloud list — per vedere gli agenti</p></div></body></html>`);
          clearTimeout(timeout);
          if (!resolved) { resolved = true; resolve(token); }
          setTimeout(() => { try { server.close(); } catch {} }, 500);
        } else {
          res.writeHead(404, { "Content-Type": "text/plain" });
          res.end("Not found");
        }
      });
    });

    await new Promise<void>((resolve, reject) => {
      server.listen(chosenPort, "127.0.0.1", () => resolve());
      server.on("error", reject);
    });
    const addr = server.address() as { port: number };
    const port = addr.port;

    const cliAuthUrl = `${apiUrl.replace(/\/$/, "")}/cli/auth?port=${port}&state=${state}`;

    console.log("\n🔐 AgentCloud CLI — Autenticazione via browser\n");
    console.log(`  Avvio server locale su http://127.0.0.1:${port}/callback`);
    console.log(`  Apertura browser su:\n  ${cliAuthUrl}\n`);
    console.log("  Se il browser non si apre, copia l'URL sopra manualmente.");
    console.log("  In attesa di completare il login sul web...\n");

    await openBrowser(cliAuthUrl);

    try {
      const token = await tokenPromise;
      saveConfig({ token: token.trim() });
      console.log("✓ Autenticazione completata! Token salvato in ~/.agentcloud/config.json");
      console.log("  Prova: agentcloud list  |  agentcloud run support-agent \"ciao\"\n");
    } catch (e: any) {
      console.error(`\n❌ ${e.message}\n`);
      process.exit(1);
    }
  });

program
  .command("logout")
  .description("Rimuove il token salvato")
  .action(() => {
    saveConfig({ token: undefined } as any);
    // rimuove fisicamente la chiave
    const cfg = loadConfig();
    if ((cfg as any).token) {
      // se saveConfig non ha rimosso, forziamo
      const fs = require("fs");
      const path = require("path");
      const os = require("os");
      const file = path.join(os.homedir(), ".agentcloud", "config.json");
      try {
        const raw = JSON.parse(fs.readFileSync(file, "utf-8"));
        delete raw.token;
        fs.writeFileSync(file, JSON.stringify(raw, null, 2));
      } catch {}
    }
    console.log("✓ Logout effettuato. Token rimosso.");
  });

program
  .command("whoami")
  .description("Mostra l'utente autenticato (richiede token valido)")
  .action(async () => {
    const cfg = loadConfig();
    if (!cfg.token) {
      console.log("Non autenticato. Esegui: agentcloud login");
      return;
    }
    try {
      const res = await fetch(`${cfg.apiUrl}/api/user/owned`, { headers: { Authorization: `Bearer ${cfg.token}` } });
      const data = await res.json().catch(() => ({}));
      console.log(`API: ${cfg.apiUrl}`);
      console.log(`Token: ****${cfg.token.slice(-4)}`);
      console.log(`Status /api/user/owned: ${res.status}`);
      console.log(JSON.stringify(data, null, 2));
    } catch (e: any) {
      console.error(`Errore: ${e.message}`);
    }
  });

program
  .command("config")
  .description("Mostra o aggiorna la configurazione corrente")
  .option("--url <url>", "Imposta l'URL base dell'API AgentCloud")
  .action((options: { url?: string }) => {
    if (options.url) {
      saveConfig({ apiUrl: options.url });
      console.log(`✓ API URL aggiornato a: ${options.url}`);
    }
    const current = loadConfig();
    console.log("\nConfigurazione attuale:");
    console.log(`- API URL: ${current.apiUrl}`);
    console.log(`- Token: ${current.token ? "********" + current.token.slice(-4) : "(non impostato)"}`);
    console.log(`- Agente predefinito: ${current.defaultAgent}\n`);
  });

program
  .command("list")
  .description("Elenca gli agenti disponibili")
  .action(() => {
    console.log("\nAgenti principali di AgentCloud:");
    console.log("  • support-agent   - Assistenza clienti 24/7 con risoluzione ticket");
    console.log("  • email-assistant - Automazione inbox, categorizzazione e draft email");
    console.log("  • lead-qualifier  - Qualifica lead e scoring contatti per CRM\n");
  });

program
  .command("run")
  .description("Esegui un prompt con un agente specifico")
  .argument("<agent>", "Slug dell'agente (es. support-agent, email-assistant)")
  .argument("<prompt>", "Istruzione da eseguire")
  .action(async (agent: string, prompt: string) => {
    try {
      console.log(`\n⏳ Esecuzione in corso con [${agent}]...`);
      const startTime = Date.now();
      const result = await executeAgent(agent, prompt);
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);

      console.log(`✓ Risposta completata in ${duration}s:\n`);
      const output = result.output || result.response || JSON.stringify(result, null, 2);
      console.log(output);
      console.log("");
    } catch (err: any) {
      console.error(`\n❌ Errore durante l'esecuzione: ${err.message}\n`);
      if (String(err.message).includes("401") || String(err.message).includes("Non autenticato")) {
        console.error("Suggerimento: esegui `agentcloud login` per autenticarti via browser.\n");
      }
      process.exit(1);
    }
  });

program.parse(process.argv);
