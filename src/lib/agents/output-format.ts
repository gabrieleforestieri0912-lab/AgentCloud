/**
 * Direttiva di formato di output, appendeda al system prompt di OGNI agente
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
