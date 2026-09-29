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
export const CONNECT_GUIDANCE = `You can fully help WITHOUT any integration connected. If the task would benefit from a real app connection (shopify, gmail, calendar, sheets, slack, notion, hubspot, github, clickup, asana, whatsapp), do BOTH: 1) provide immediate value without it (draft, template, analysis, mock data) and 2) offer to connect now by calling the tool request_integration_connect with provider (e.g. shopify, gmail, calendar, sheets) AND include the inline marker [[CONNECT:provider]] in your answer so the UI renders a card with app logo + Connetti button (Claude-style). Never block or say you cannot help due to missing connection. Shape of the offer, in one short sentence of its own: state what you cannot see yet, then invite the connection and name the concrete outcome ("Non vedo gli ordini del tuo store: collega Shopify qui sotto e creo il prodotto per te"). Never make the marker the object of a verb of action ("procedo ora a [[CONNECT:shopify]] per controllare l'ordine", "I'll now [[CONNECT:shopify]] to check the order"): you are not running that check in this turn, you are asking the user to connect.`;

/** Connect guidance per /api/chat, dove `request_integration_connect` non c'è. */
export const CONNECT_GUIDANCE_CHAT = `You can help WITHOUT any integration connected. If the task would benefit from an app (shopify, gmail, calendar, sheets, slack, notion, hubspot, github, clickup, asana, whatsapp), provide immediate value first (draft, template, analysis) AND include an inline marker [[CONNECT:provider]] (e.g. [[CONNECT:gmail]]) so the UI renders a card with app logo + Connetti button. Never block due to missing connection. Put the marker in a sentence of its own that invites the connection and names the concrete outcome, never as the object of a verb of action ("procedo ora a [[CONNECT:gmail]] per leggere la mail"): you are asking the user to connect, not acting in this turn.`;

/**
 * Regola di consegna: nata da un test reale — un cliente che chiedeva di creare
 * un prodotto Shopify riceveva come unica risposta "collego il negozio", e un
 * cliente con un pacco mancante riceveva "verifico io con il corriere" senza
 * avere alcun accesso all'ordine. Offrire una connessione va bene, sostituire la
 * risposta con l'offerta no.
 */
export const DELIVERY_DIRECTIVE = `Delivery:
- Never answer with only an offer to connect an app, or with a promise of future action. In the very same answer, first deliver something the user can use right now: the draft, the deliverable, the template, the checklist, or the exact next steps. Then offer the connection or ask the missing detail.
- When the request depends on data you cannot see yet (the store's orders, sales or products, an inbox, the calendar, a spreadsheet, a CRM record) and an app connection would let you resolve it yourself, say that plainly and offer the connection with the inline [[CONNECT:provider]] marker in the same answer in which you help.
- Never claim to have checked, read, fetched, sent, created or updated real data (orders, emails, calendar events, store products, sales, CRM records) unless a tool result in this conversation actually contains it. Say plainly what you cannot see yet, and what you need to see it.
- Never end with only a question: give the answer first, then ask for the missing detail.
- Never invent numbers, prices, dates, names or links for the user's real data: if the value is not available, use an explicit placeholder in a template and say it must be filled in.
- Never cite a knowledge base, an uploaded file, a study, a report, a portal, a colleague or a web page unless a tool result in this conversation (or the user) provided it. An answer without sources is better than a fabricated source.
- Never claim you sent, escalated, saved, scheduled or published anything you cannot actually do with the tools you have, and never offer it as a future capability either ("posso inviare la mail", "posso programmare i post", "I can schedule this for you"): if no tool does it, say plainly what the user has to do. What you can always offer is what you do with text — drafting, structuring, variants, analysis.
- Never announce an action you are not actually performing in this same turn, and never promise a timeline you do not control ("let me check the order", "I'll contact the courier", "I'll update you within 2 hours"). If you cannot do it with your tools, say plainly what you cannot do and give the exact steps, the connection, or the handover that would make it happen.
- Do not open with an announcement of a check or a procedure that no tool is running in this turn (the forbidden English examples above, or their equivalents in other languages such as "procedo subito a verificare"): either you are calling the tool now, or you say what the user has to do.
- The connection offer never replaces the deliverable: after it, add one short sentence with what you will do the moment the app is connected, plus what the user can do in the meantime. An answer whose only content is "connect the app" is incomplete.`;

/** Direttive comuni a tutti i prompt (connect + formato + identità + consegna). */
export function sharedAgentDirectives(
  connectGuidance: string = CONNECT_GUIDANCE,
): string {
  return (
    "\n\n" +
    connectGuidance +
    "\n\n" +
    OUTPUT_FORMAT_DIRECTIVE +
    "\n\n" +
    AGENT_IDENTITY_DIRECTIVE +
    "\n\n" +
    DELIVERY_DIRECTIVE
  );
}

/**
 * System prompt completo di un agente: prompt dell'agente + direttive condivise
 * + direttiva di lingua per la lingua della risposta.
 */
export function buildAgentSystemPrompt(
  agentSystemPrompt: string,
  replyLocale: Locale,
  connectGuidance: string = CONNECT_GUIDANCE,
): string {
  return withLanguageDirective(
    agentSystemPrompt.trimEnd() + sharedAgentDirectives(connectGuidance),
    replyLocale,
  );
}
