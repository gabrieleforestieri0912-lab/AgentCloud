/**
 * Localized API error messages.
 *
 * Server-only: resolves the active locale from the cookie (same mechanism as
 * every other server-side i18n helper) and returns the message for an error
 * key from the dictionary, interpolating any {token} placeholders.
 *
 * Client components must NOT import this module (it pulls in next/headers).
 */

import { getLocale } from "./locale";
import { type Locale } from "./constants";
import { getDictionary, t, type Dictionary } from "./dictionaries";

export type ApiErrorKey = keyof Dictionary["apiErrors"];

export type ApiErrorParams = Record<string, string | number>;

/** Pure lookup — testable without cookies. */
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
