/**
 * Chiavi e valori delle preferenze utente — modulo SHARED.
 *
 * Niente import di componenti né di client Supabase: serve sia a server
 * (API /api/user/preferences) sia ai client (sync delle preferenze del
 * browser) senza trascinare dipendenze server nel bundle del browser.
 */
export const PREFERENCE_KEYS = [
  "agentcloud_dashboard_sidebar_width",
  "agentcloud_dashboard_sections",
  "agentcloud_chat_sidebar_width",
  "agentcloud_chat_sidebar_open",
  "agentcloud_chat_text_size",
  "agentcloud_chat_default_agent",
  "agentcloud_pref_email_notif",
  "agentcloud_pref_product_updates",
] as const;

export type PreferenceKey = (typeof PREFERENCE_KEYS)[number];

export type PreferenceValue = string | number | boolean;

export function isPreferenceKey(key: unknown): key is PreferenceKey {
  return typeof key === "string" && (PREFERENCE_KEYS as readonly string[]).includes(key);
}

/** Valore ammesso: primitivi (stringhe ≤ 200, numeri finiti, booleani). */
export function isPreferenceValue(value: unknown): value is PreferenceValue {
  if (typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "string") return value.length <= 200;
  return false;
}
