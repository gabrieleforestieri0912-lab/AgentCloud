/**
 * Client-safe i18n constants.
 *
 * These live in their own module (no `next/headers`) so client components
 * (e.g. LanguageProvider) can import them without pulling server-only code
 * into the browser bundle. Server components should use `./locale.ts`.
 */

export const LOCALE_COOKIE = "agentcloud_locale";

export const LOCALES = ["it", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "it";

export function isLocale(value: unknown): value is Locale {
  return LOCALES.includes(value as Locale);
}
