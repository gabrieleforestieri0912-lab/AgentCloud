import { cookies } from "next/headers";
import {
  LOCALE_COOKIE,
  DEFAULT_LOCALE,
  isLocale,
  type Locale,
} from "./constants";

export {
  LOCALE_COOKIE,
  LOCALES,
  DEFAULT_LOCALE,
  isLocale,
  type Locale,
} from "./constants";

/**
 * Lightweight i18n for AgentCloud.
 *
 * The default language is Italian; the navbar toggle switches to English. The
 * choice is persisted in a cookie so both client and server components can
 * read it — URLs stay unchanged (no /it /en routing).
 *
 * NOTE: this module is server-only (it reads `next/headers`). Client
 * components that only need the cookie name / locale constants should import
 * from `./constants` instead.
 */

/**
 * Server-only: resolve the current locale from the cookie.
 * Falls back to Italian when the cookie is missing or invalid.
 */
export async function getLocale(): Promise<Locale> {
  try {
    const store = await cookies();
    const value = store.get(LOCALE_COOKIE)?.value;
    return isLocale(value) ? value : DEFAULT_LOCALE;
  } catch {
    // cookies() is unavailable in some edge contexts — never fail rendering.
    return DEFAULT_LOCALE;
  }
}

