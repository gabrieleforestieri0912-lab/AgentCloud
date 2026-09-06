import type { Locale } from "./i18n/constants";

/**
 * Testi localizzati e leggibili per i valori `reason` che le route di
 * callback OAuth mettono in ?shopify=error&reason=... / ?google=error&reason=... .
 *
 * Perché esiste: i provider OAuth restituiscono solo codici d'errore generici;
 * questa mappa li traduce in messaggi comprensibili all'utente. Le ragioni
 * sconosciute ripiegano sul token grezzo, così l'interfaccia non mostra mai
 * un errore vuoto.
 */
const REASONS_IT: Record<string, string> = {
  auth: "devi accedere prima di collegare",
  config: "configurazione non trovata sul server",
  invalid_shop: "dominio del negozio non valido",
  missing_params: "risposta del provider incompleta",
  state_mismatch: "verifica di sicurezza non superata",
  hmac: "verifica della richiesta non superata",
  token_exchange: "scambio del token non riuscito",
  no_token: "nessun token ricevuto",
  store: "salvataggio della connessione non riuscito",
  denied: "autorizzazione negata",
  consent: "consenso non concesso",
};

const REASONS_EN: Record<string, string> = {
  auth: "sign in is required before connecting",
  config: "server configuration not found",
  invalid_shop: "invalid store domain",
  missing_params: "incomplete response from the provider",
  state_mismatch: "security check failed",
  hmac: "request verification failed",
  token_exchange: "token exchange failed",
  no_token: "no token received",
  store: "could not save the connection",
  denied: "authorization was denied",
  consent: "consent was not granted",
};

export function readableConnectReason(
  reason: string | null,
  locale: Locale,
): string {
  if (!reason) return "error";
  const map = locale === "it" ? REASONS_IT : REASONS_EN;
  return map[reason] ?? reason;
}