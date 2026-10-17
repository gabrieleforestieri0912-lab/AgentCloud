/**
 * Preferenze rapide della chat (il pannello aperto dalla rotella in alto).
 *
 * Vivono in localStorage perché servono a due componenti distinti: il pannello
 * (AppHeader) le modifica, la chat (ChatInterface) le applica — l'agente
 * predefinito alle nuove conversazioni, la dimensione del testo all'area
 * messaggi. Nessuna scrittura su DB: sono preferenze del browser.
 */

export type ChatTextSize = "sm" | "md" | "lg";

export const CHAT_TEXT_SIZES: readonly ChatTextSize[] = ["sm", "md", "lg"];

export const CHAT_DEFAULT_AGENT_KEY = "agentcloud_chat_default_agent";
export const CHAT_TEXT_SIZE_KEY = "agentcloud_chat_text_size";
/**
 * Sidebar della chat aperta/chiusa su desktop. È una preferenza e non stato
 * effimero: senza persistenza la sidebar richiusa al reload si riaprirebbe
 * sempre, e l'utente che l'ha chiusa per guadagnare spazio perderebbe la
 * scelta a ogni visita. `localStorage` come il resto delle preferenze chat:
 * niente scrittura su DB.
 */
export const CHAT_SIDEBAR_OPEN_KEY = "agentcloud_chat_sidebar_open";

/**
 * Zoom applicato all'area della chat: scala insieme testo, bolle e anteprime,
 * così la dimensione resta coerente qualunque sia la densità dei componenti
 * (i testi usano misure fisse, non relative al contenitore).
 */
const CHAT_TEXT_ZOOM: Record<ChatTextSize, number> = { sm: 0.9, md: 1, lg: 1.15 };

export function isChatTextSize(value: unknown): value is ChatTextSize {
  return value === "sm" || value === "md" || value === "lg";
}

export function chatTextZoom(size: ChatTextSize): number {
  return CHAT_TEXT_ZOOM[size] ?? 1;
}

/** Slug dell'agente predefinito; stringa vuota = nessuno (chat generica). */
export function readDefaultAgent(): string {
  try {
    return localStorage.getItem(CHAT_DEFAULT_AGENT_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveDefaultAgent(slug: string): void {
  try {
    localStorage.setItem(CHAT_DEFAULT_AGENT_KEY, slug);
  } catch {
    // Storage non disponibile: la preferenza resta valida per la sessione.
  }
}

export function readChatTextSize(): ChatTextSize {
  try {
    const value = localStorage.getItem(CHAT_TEXT_SIZE_KEY);
    return isChatTextSize(value) ? value : "md";
  } catch {
    return "md";
  }
}

export function saveChatTextSize(size: ChatTextSize): void {
  try {
    localStorage.setItem(CHAT_TEXT_SIZE_KEY, size);
  } catch {
    // Storage non disponibile: la preferenza resta valida per la sessione.
  }
}

/**
 * Bozze dell'input della chat, per conversazione. Senza persistenza il testo
 * già scritto spariva a un reload (o a un aggiornamento della pagina): è lavoro
 * dell'utente, non stato effimero. Si salva solo il testo — gli allegati hanno
 * anteprime come data URL e gonfierebbero lo storage per un beneficio minore.
 */
export const CHAT_DRAFTS_KEY = "agentcloud_chat_drafts";

export type ChatDrafts = Record<string, string>;

export function readChatDrafts(): ChatDrafts {
  try {
    const raw = localStorage.getItem(CHAT_DRAFTS_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const out: ChatDrafts = {};
    for (const [id, text] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof text === "string" && text) out[id] = text;
    }
    return out;
  } catch {
    // Storage non disponibile o malformato: si riparte senza bozze.
    return {};
  }
}

export function saveChatDrafts(drafts: ChatDrafts): void {
  try {
    localStorage.setItem(CHAT_DRAFTS_KEY, JSON.stringify(drafts));
  } catch {
    // Storage non disponibile: la bozza resta valida per la sessione.
  }
}

/**
 * Conversazione aperta per ultima. Al reload la chat riapre sempre la prima
 * della cronologia: se l'utente stava scrivendo altrove, il testo tornava solo
 * dopo un click. Ricordare l'id rende il ripristino della bozza immediato.
 */
export const CHAT_ACTIVE_CONV_KEY = "agentcloud_chat_active_conv";

export function readActiveConversation(): string {
  try {
    return localStorage.getItem(CHAT_ACTIVE_CONV_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveActiveConversation(id: string): void {
  try {
    localStorage.setItem(CHAT_ACTIVE_CONV_KEY, id);
  } catch {
    // Storage non disponibile: si riaprirà la prima conversazione.
  }
}

/**
 * Sidebar aperta su desktop. Default `true`: una sidebar già ristretta è una
 * scelta dell'utente, una sidebar vuota all'ingresso è solo una sorpresa.
 */
export function readSidebarOpen(): boolean {
  try {
    return localStorage.getItem(CHAT_SIDEBAR_OPEN_KEY) !== "false";
  } catch {
    return true;
  }
}

export function saveSidebarOpen(open: boolean): void {
  try {
    localStorage.setItem(CHAT_SIDEBAR_OPEN_KEY, open ? "true" : "false");
  } catch {
    // Storage non disponibile: la preferenza resta valida per la sessione.
  }
}
