/**
 * Messaggi d'errore API localizzati.
 *
 * Perché esiste: le route API devono rispondere in italiano/inglese/... con
 * messaggi coerenti col resto dell'interfaccia. Server-only: risolve la lingua
 * attiva dal cookie (stesso meccanismo degli altri helper i18n server-side) e
 * restituisce il messaggio per una chiave d'errore del dizionario,
 * interpolando eventuali placeholder {token}.
 *
 * I client component NON devono importare questo modulo (trascina next/headers).
 */

import { getLocale } from "./locale";
import { type Locale } from "./constants";
import { getDictionary, t, type Dictionary } from "./dictionaries";

export type ApiErrorKey = keyof Dictionary["apiErrors"];

export type ApiErrorParams = Record<string, string | number>;

/** Lookup puro — testabile senza cookie. */
export function apiErrorMessageForLocale(
  locale: Locale,
  key: ApiErrorKey,
  params?: ApiErrorParams,
): string {
  const template = getDictionary(locale).apiErrors[key];
  return params ? t(template, params) : template;
}

/** Server-only: localized message for the current request locale. */
export async function apiErrorMessage(
  key: ApiErrorKey,
  params?: ApiErrorParams,
): Promise<string> {
  return apiErrorMessageForLocale(await getLocale(), key, params);
}
