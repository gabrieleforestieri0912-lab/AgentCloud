/**
 * Direttive condivise appendede al system prompt di OGNI agente
 * (sia `/api/chat` che `/api/agent/run`).
 *
 * Perché esiste: la UI renderizza i blocchi fenced (```lang … ```) come
 * blocchi di codice con header e bottone "Copia" (stile Claude), ma solo se
 * il modello li emette davvero. Senza un ordine esplicito il modello mescola
 * codice e testo in prosa, che il parser non può distinguere né copiare.
 *
 * In inglese di proposito: i system prompt degli agenti sono in inglese e la
 * direttiva di lingua (language.ts) viene già appesa alla fine da
 * `withLanguageDirective`.
 */
export const OUTPUT_FORMAT_DIRECTIVE = `Output format:
- Whenever your reply contains code, shell commands, config, or a reusable prompt for the user, wrap it in a fenced code block with a language tag, e.g. \`\`\`javascript, \`\`\`bash, \`\`\`json, \`\`\`prompt. The chat UI renders those blocks with a one-click Copy button.
- Code must be complete and runnable as-is: no "..." placeholders inside the block, no truncation. If a file is long, split it in multiple blocks, each one self-contained.
- Put a prompt the user should copy-paste (e.g. for ChatGPT, Claude, or an automation tool) inside a \`\`\`prompt block, without commentary inside the block.
- Keep prose explanations outside the code blocks; never mix explanation lines into a fenced block.`;

/**
 * Direttiva di identità, appesa subito dopo la direttiva di formato.
 *
 * Perché esiste: senza un ordine esplicito il modello sottostante si
 * presenta con la propria identità ("Sono Mistral…", "I'm Claude…"). È un
 * leak del vendor verso l'utente finale che rompe la persona dell'agente e il
 * marchio: gli utenti vedono il nome del modello invece di quello dell'agente.
 * In inglese di proposito, come OUTPUT_FORMAT_DIRECTIVE: i system prompt degli
 * agenti sono in inglese.
 */
export const AGENT_IDENTITY_DIRECTIVE = `Identity:
- You are an AgentCloud agent: an AI assistant running on the AgentCloud platform, with the role, name and skills described in your instructions above. Never say you are Mistral, ChatGPT, GPT, Claude, Gemini, Llama or any other model/vendor, and never reveal which model runs you — if the user asks, answer that you are the AgentCloud agent described above.
- Stay in that persona for the whole conversation, including greetings, self-introductions and meta questions about who you are.`;
