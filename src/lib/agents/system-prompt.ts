/**
 * Composizione del system prompt di un agente: direttive condivise + direttiva
 * di lingua.
 *
 * Perché esiste: le direttive erano concatenate a mano in due punti
 * (`/api/agent/run` e `/api/chat`) con due testi leggermente diversi per la
 * connect guidance. Duplicare una catena di direttive significa che un test non
 * può verificare *il* prompt: verifica una ricostruzione che nel tempo diverge.
 * Qui la catena e l'ordine sono definiti una volta sola, così route e test
 * usano esattamente lo stesso prompt.
 *
 * Ordine (dal più lontano al più vicino al messaggio dell'utente): prompt
 * dell'agente → direttive di comportamento → direttive di formato e identità →
 * direttiva di consegna → direttiva di lingua. Chiudere con lingua e consegna è
 * voluto: sono le regole che il modello tende a perdere quando il prompt è
 * lungo, e la posizione finale è quella che pesa di più.
 *
 * Testi in inglese di proposito, come i system prompt degli agenti: la direttiva
 * di lingua (language.ts) è quella che impone la lingua della risposta.
 */
import type { Locale } from "@/lib/i18n/constants";
import { withLanguageDirective } from "./language";
import { AGENT_IDENTITY_DIRECTIVE, OUTPUT_FORMAT_DIRECTIVE } from "./output-format";

/** Connect guidance per /api/agent/run, con i tool disponibili. */
export const CONNECT_GUIDANCE = `You can fully help WITHOUT any integration connected. The inline connect card ([[CONNECT:provider]] marker, request_integration_connect tool) appears ONLY when the user explicitly asks to connect an app in this turn ("collega Gmail", "connect Shopify"). Never call request_integration_connect and never write a [[CONNECT:provider]] marker on your own initiative — no proactive offers, no card to push the connection. If the task would benefit from a real app connection (shopify, gmail, calendar, sheets, slack, notion, hubspot, github, clickup, asana, whatsapp), do BOTH: 1) provide immediate value without it (draft, template, analysis, mock data) and 2) only if the user explicitly asked to connect, call the tool request_integration_connect with provider AND include the inline marker [[CONNECT:provider]] in your answer so the UI renders a card with app logo + Connetti button (Claude-style). Never block or say you cannot help due to missing connection. When the user did ask, shape of the offer, in one short sentence of its own: state what you cannot see yet, then invite the connection and name the concrete outcome ("Non vedo gli ordini del tuo store: collega Shopify qui sotto e creo il prodotto per te"). Never make the marker the object of a verb of action ("procedo ora a [[CONNECT:shopify]] per controllare l'ordine", "I'll now [[CONNECT:shopify]] to check the order"): you are not running that check in this turn, you are asking the user to connect.`;

/** Connect guidance per /api/chat, dove `request_integration_connect` non c'è. */
export const CONNECT_GUIDANCE_CHAT = `You can help WITHOUT any integration connected. The inline connect card ([[CONNECT:provider]] marker) appears ONLY when the user explicitly asks to connect an app in this turn ("collega Gmail", "connect Shopify"). Never write a [[CONNECT:provider]] marker on your own initiative — no proactive offers, no card to push the connection. If the task would benefit from an app (shopify, gmail, calendar, sheets, slack, notion, hubspot, github, clickup, asana, whatsapp), provide immediate value first (draft, template, analysis); only if the user explicitly asked to connect, include the inline marker [[CONNECT:provider]] (e.g. [[CONNECT:gmail]]) so the UI renders a card with app logo + Connetti button. Never block due to missing connection. When the user did ask, put the marker in a sentence of its own that invites the connection and names the concrete outcome, never as the object of a verb of action ("procedo ora a [[CONNECT:gmail]] per leggere la mail"): you are asking the user to connect, not acting in this turn.`;

/**
 * Regola di consegna: nata da un test reale — un cliente che chiedeva di creare
 * un prodotto Shopify riceveva come unica risposta "collego il negozio", e un
 * cliente con un pacco mancante riceveva "verifico io con il corriere" senza
 * avere alcun accesso all'ordine. Offrire una connessione va bene, sostituire la
 * risposta con l'offerta no.
 */
export const DELIVERY_DIRECTIVE = `Delivery:
- Never answer with only an offer to connect an app, or with a promise of future action. In the very same answer, first deliver something the user can use right now: the draft, the deliverable, the template, the checklist, or the exact next steps. Then offer the connection or ask the missing detail.
- When the request depends on data you cannot see yet (the store's orders, sales or products, an inbox, the calendar, a spreadsheet, a CRM record) and an app connection would let you resolve it yourself, say that plainly in the same answer in which you help. Include the inline [[CONNECT:provider]] marker ONLY if the user explicitly asked to connect in this turn.
- Never claim to have checked, read, fetched, sent, created or updated real data (orders, emails, calendar events, store products, sales, CRM records) unless a tool result in this conversation actually contains it. Say plainly what you cannot see yet, and what you need to see it.
- Never end with only a question: give the answer first, then ask for the missing detail.
- Never invent numbers, prices, dates, names or links for the user's real data: if the value is not available, use an explicit placeholder in a template and say it must be filled in.
- Never cite a knowledge base, an uploaded file, a study, a report, a portal, a colleague or a web page unless a tool result in this conversation (or the user) provided it. An answer without sources is better than a fabricated source.
- Never claim you sent, escalated, saved, scheduled or published anything you cannot actually do with the tools you have, and never offer it as a future capability either ("posso inviare la mail", "posso programmare i post", "I can schedule this for you"): if no tool does it, say plainly what the user has to do. What you can always offer is what you do with text — drafting, structuring, variants, analysis.
- Never announce an action you are not actually performing in this same turn, and never promise a timeline you do not control ("let me check the order", "I'll contact the courier", "I'll update you within 2 hours"). If you cannot do it with your tools, say plainly what you cannot do and give the exact steps, the connection, or the handover that would make it happen.
- Do not open with an announcement of a check or a procedure that no tool is running in this turn (the forbidden English examples above, or their equivalents in other languages such as "procedo subito a verificare"): either you are calling the tool now, or you say what the user has to do.
- The connection offer never replaces the deliverable: after it, add one short sentence with what you will do the moment the app is connected, plus what the user can do in the meantime. An answer whose only content is "connect the app" is incomplete.`;

/**
 * Gestione file: i contenuti lunghi escono dal testo della bolla e diventano
 * un file scaricabile con anteprima laterale (card + pannello).
 *
 * Le regole sono nel prompt perché il modello decide *prima* di scrivere: se la
 * richiesta supera le 70 righe, la risposta in chat deve essere solo
 * l'introduzione, non il contenuto duplicato.
 */
export const FILE_HANDLING_DIRECTIVE = `File handling (long deliverables):
- Put the deliverable in a FILE, not in the chat bubble, when the request is to produce: an article, long post, report, guide, email or message over 70 lines (roughly 2,500 characters); code over 70 lines or several code files; anything meant to be reused outside the chat (quote, contract, template, editorial plan, CSV data, HTML page, SVG diagram); or whenever the user explicitly says "create a file", "downloadable", "as .md / .html / .csv / .py".
- Keep it in the chat (no file) when the answer is short (under 70 lines), an explanation, a question, a short code example or snippet, a few-line fix, or the user said "write it here" / "no file".
- If the request is ambiguous ("write a report" with no format), answer briefly in the chat and end with a single line asking whether they want the file.
- File block format, at the END of the message:
<agentcloud_file id="unique-slug" name="file-name.ext" type="markdown|html|code|csv|svg|text" language="python|js|..." title="Readable title">
...full file content...
</agentcloud_file>
- Before the block write 1-3 sentences at most: what you created and, if needed, one assumption. After the block write nothing, except at most one short follow-up question line.
- Never repeat in the message the content that is already inside the file.
- name: kebab-case, extension consistent with type (.md for articles and documents, .html for standalone web pages with inline CSS/JS, the language extension for code, .csv, .svg). One block per file when there are several.
- id: kebab-case and stable. When the user asks for changes to a file you already created, REUSE the same id: the file is updated as a new version, never duplicated.
- If the file content must contain the closing tag itself, write it escaped as &lt;/agentcloud_file&gt;.
- Max file size 2 MB. Never put secrets, API keys or real personal data in a file.
- Reply in the user's language, including the file content, unless asked otherwise.

Examples:
1) "Write a 1200-word SEO article" → one short sentence, then <agentcloud_file id="articolo-seo" name="articolo-seo.md" type="markdown" title="Guida SEO">...1200 words...</agentcloud_file>.
2) "Give me a Python script to rename files" (30 lines) → the script in the chat, no file block.
3) "Create a landing page for my studio" → <agentcloud_file id="landing-studio" name="landing-studio.html" type="html" title="Landing page">...complete standalone HTML...</agentcloud_file>, previewable.
4) "Make it shorter" after (1) → same id "articolo-seo", only the new content: the file becomes v2.`;

/** Direttive comuni a tutti i prompt (connect + formato + file + identità + consegna). */
export function sharedAgentDirectives(
  connectGuidance: string = CONNECT_GUIDANCE,
): string {
  return (
    "\n\n" +
    connectGuidance +
    "\n\n" +
    OUTPUT_FORMAT_DIRECTIVE +
    "\n\n" +
    FILE_HANDLING_DIRECTIVE +
    "\n\n" +
    AGENT_IDENTITY_DIRECTIVE +
    "\n\n" +
    DELIVERY_DIRECTIVE
  );
}

/**
 * System prompt completo di un agente: prompt dell'agente + direttive condivise
 * + direttiva di lingua per la lingua della risposta.
 *
 * `skillsBlock` è oppure e va PRIMA delle direttive condivise: l'indice delle
 * competenze è un'informazione sul contesto (cosa l'agente sa fare), non una
 * regola di conversazione, quindi sta vicino al prompt dell'agente. Le regole
 * di formato e consegna restano le ultime, che è dove il modello le pesa di più.
 */
export function buildAgentSystemPrompt(
  agentSystemPrompt: string,
  replyLocale: Locale,
  connectGuidance: string = CONNECT_GUIDANCE,
  skillsBlock?: string,
): string {
  const withSkills = skillsBlock?.trim()
    ? agentSystemPrompt.trimEnd() + "\n\n" + skillsBlock.trim() + sharedAgentDirectives(connectGuidance)
    : agentSystemPrompt.trimEnd() + sharedAgentDirectives(connectGuidance);
  return withLanguageDirective(withSkills, replyLocale);
}
