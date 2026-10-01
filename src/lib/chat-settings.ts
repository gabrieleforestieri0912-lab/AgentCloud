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
