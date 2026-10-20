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
- Keep prose explanations outside the code blocks; never mix explanation lines into a fenced block.
- Format links as markdown with a MEANINGFUL label: use the real site or page name (e.g. [example.com — Page title](https://example.com/page)). If you don't know the real name, use the domain or full URL itself as the label. NEVER use generic labels like "sito web", "website", "site", "link", "qui" or "clicca qui": the chat UI shows the label as-is, so a generic label hides where the link goes. Bare https://… URLs written plainly are also rendered as clickable links.`;

/**
 * Fonti dopo una ricerca online: perché l'utente si fidi, deve vedere DA DOVE
 * arrivano le informazioni — non solo il testo.
 *
 * Senza un ordine esplicito il modello usa i risultati di web_search /
 * scrape_page ma non li cita mai, così la risposta sembra inventata. La regola
 * impone una sezione "Fonti" con i link ESATTI restituiti dai tool (titolo e
 * URL copiati dai blocchi <contesto_esterno>), mai inventati. La chat UI li
 * rende già cliccabili (vedi parser markdown: link + URL nudi).
 *
 * In inglese di proposito, come OUTPUT_FORMAT_DIRECTIVE.
 */
export const RESEARCH_SOURCES_DIRECTIVE = `Sources:
- Whenever your answer uses results from the web_search or scrape_page tools in this conversation, end the answer with a short "**Fonti:**" section (or "**Sources:**" in the user's language): one bullet per source as a markdown link with the EXACT title and URL from the tool result, e.g. - [Page title](https://example.com/page). Max 5 sources, most relevant first.
- Copy title and URL verbatim from the <contesto_esterno> blocks: never invent, shorten or "clean up" URLs, and never cite a page no tool returned in this conversation.
- If the answer did not use any web_search / scrape_page result, write no Fonti section (the Example links rule below covers helpful links for that case).`;

/**
 * Quando la risposta spiega un "come si fa", un esempio concreto vale più di
 * mille parole: tutorial video e guide ufficiali rendono la risposta "top".
 * Ma senza un ordine esplicito il modello o non mette mai link, o li inventa
 * (ID video YouTube falsi, URL profonde inesistenti che portano a 404).
 *
 * Per YouTube la UI ha un ponte server (/api/youtube) che valida ogni link in
 * bolle: un ID valido rende la card reale del video (titolo + anteprima),
 * mentre un ID inesistente o un link di ricerca viene risolto al primo
 * risultato della ricerca per il testo del link. Da qui la regola: video
 * diretti solo con ID certo ed etichetta descrittiva (che è anche la query di
 * ripiego), altrimenti ricerca. Per il resto restano homepage ufficiali: la
 * struttura di un dominio conosciuto non cambia, quella di un articolo sì.
 *
 * In inglese di proposito, come OUTPUT_FORMAT_DIRECTIVE.
 */
export const EXAMPLE_LINKS_DIRECTIVE = `Example links:
- When the answer explains a how-to, a setup, or a tool ("come creo…", "how do I…", "come collego…"), add at the end of the answer one short line "Video utili:" (or "Useful videos:" in the user's language) with 1-3 YouTube links as markdown. Link a specific VIDEO when you know its exact ID: [Next.js in 100 Seconds — Fireship](https://www.youtube.com/watch?v=VIDEO_ID) — the chat UI checks it server-side and shows the real title and thumbnail of that video. Make the link text specific to the user's topic (+ the word tutorial), because it is what the UI falls back to as a YouTube search when the ID turns out not to exist, e.g. [Come creare un prodotto Shopify tutorial (YouTube)](https://www.youtube.com/watch?v=...). When you do not know any ID, use a search link instead: https://www.youtube.com/results?search_query=come+creare+prodotto+shopify+tutorial (words joined with +).
- When you mention an official tool or documentation (Shopify, Gmail, Stripe, Google Calendar, …), link its official homepage or help center once, e.g. [Guida ufficiale Shopify](https://help.shopify.com). Use only the well-known root or /help domain you are sure exists — never invent deep article URLs.
- Keep links few (max 3-4 per answer) and only when they truly help the user's request. Short answers, greetings and confirmations need no links.`;

/**
 * Link che l'utente incolla: il modello deve leggere la pagina, non dire
 * che non può aprirla.
 *
 * Senza un ordine esplicito, davanti a un link il modello risponde "non
 * posso aprire i link" (o inventa il contenuto): il tool `scrape_page` esiste
 * proprio per questo, ma senza dire "quando l'utente ti dà un link, leggi
 * la pagina" il modello non lo usa. La direttiva fissa anche cosa fare quando
 * la lettura fallisce: dirlo, non raggirare.
 *
 * In inglese di proposito, come OUTPUT_FORMAT_DIRECTIVE.
 */
export const LINK_ANALYSIS_DIRECTIVE = `Links the user gives you:
- When the user's message contains a URL — they paste a link and ask what it is, to analyze it, to summarize it, to compare it, to translate it, to rewrite it, or simply to look at it — call the scrape_page tool on that URL and answer from the page's ACTUAL content. Never answer that you cannot open links while you have the tool.
- Use the fetched content as the primary source: work on what is really written there, and say which page you read (title + URL).
- If the fetch fails (blocked, timeout, not a web page, unreachable address), say plainly what failed and offer the next step (web_search on the same topic, or the user pasting the text). Never invent the page content, never describe a page you did not read.
- Only fetch URLs the user provided or that a tool returned in this conversation.`;

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
