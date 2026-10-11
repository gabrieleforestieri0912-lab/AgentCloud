const SITE = "https://www.agentcloud.agency";

/**
 * Banner stile "welcome screen": solo ASCII sicuro su ogni terminale
 * (niente blocchi Unicode che su PowerShell si rompono).
 */
export function printWelcome(): void {
  console.log(`
  ==================================================
    AgentCloud CLI — i tuoi agenti AI dal terminale
  ==================================================

  Inizia in 2 passi:
    1. agentcloud login           si apre il browser, accedi, fatto
    2. agentcloud chat <agente>   es. agentcloud chat support-agent

  Comandi utili:
    agentcloud agents catalog     cosa puoi usare e quanto costa
    agentcloud run <agente> "..."   una risposta secca, senza chat
    agentcloud usage              piano e consumi
    agentcloud update             aggiorna la CLI

  Aiuto completo: agentcloud --help
  Web: ${SITE}
`);
}

/** Istruzioni di accesso stampate quando serve autenticarsi. */
export function printLoginHint(): void {
  console.log("Per continuare accedi dal browser:");
  console.log("  agentcloud login");
  console.log("Si apre il browser: accedi sul sito e il terminale riceve il token da solo.");
}
