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

const REASONS_ES: Record<string, string> = {
  auth: "debes iniciar sesión antes de conectar",
  config: "configuración del servidor no encontrada",
  invalid_shop: "dominio de la tienda no válido",
  missing_params: "respuesta incompleta del proveedor",
  state_mismatch: "la comprobación de seguridad falló",
  hmac: "la verificación de la solicitud falló",
  token_exchange: "no se pudo intercambiar el token",
  no_token: "no se recibió ningún token",
  store: "no se pudo guardar la conexión",
  denied: "se denegó la autorización",
  consent: "no se concedió el consentimiento",
};

const REASONS_DE: Record<string, string> = {
  auth: "du musst dich anmelden, bevor du verbindest",
  config: "Serverkonfiguration nicht gefunden",
  invalid_shop: "ungültige Shop-Domain",
  missing_params: "unvollständige Antwort des Anbieters",
  state_mismatch: "Sicherheitsprüfung fehlgeschlagen",
  hmac: "Anfrageprüfung fehlgeschlagen",
  token_exchange: "Token-Austausch fehlgeschlagen",
  no_token: "kein Token empfangen",
  store: "Verbindung konnte nicht gespeichert werden",
  denied: "Autorisierung wurde verweigert",
  consent: "keine Einwilligung erteilt",
};

const REASONS_FR: Record<string, string> = {
  auth: "vous devez vous connecter avant de connecter un outil",
  config: "configuration du serveur introuvable",
  invalid_shop: "domaine de boutique invalide",
  missing_params: "réponse incomplète du fournisseur",
  state_mismatch: "la vérification de sécurité a échoué",
  hmac: "la vérification de la requête a échoué",
  token_exchange: "échange du jeton impossible",
  no_token: "aucun jeton reçu",
  store: "impossible d’enregistrer la connexion",
  denied: "l’autorisation a été refusée",
  consent: "le consentement n’a pas été accordé",
};

/**
 * Un solo oggetto per locale: una chiave mancante in una lingua non può
 * più ricadere silenziosamente sull'inglese, perché il tipo `Record<Locale, …>`
 * lo rende un errore di compilazione.
 */
const REASONS: Record<Locale, Record<string, string>> = {
  it: REASONS_IT,
  en: REASONS_EN,
  es: REASONS_ES,
  de: REASONS_DE,
  fr: REASONS_FR,
};

export function readableConnectReason(
  reason: string | null,
  locale: Locale,
): string {
  if (!reason) return "error";
  return REASONS[locale][reason] ?? reason;
}