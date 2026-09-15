#!/usr/bin/env node

import { Command } from "commander";
import { loadConfig, saveConfig } from "./config.js";
import { executeAgent } from "./api.js";

const program = new Command();

program
  .name("agentcloud")
  .description("CLI ufficiale di AgentCloud - Esegui e gestisci agenti AI dal terminale")
  .version("0.1.0");

program
  .command("login")
  .description("Configura il Bearer token o l'API key di AgentCloud")
  .argument("<token>", "Il tuo API token di AgentCloud")
  .action((token: string) => {
    saveConfig({ token });
    console.log("✓ Token di autenticazione salvato con successo!");
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
      process.exit(1);
    }
  });

program.parse(process.argv);
