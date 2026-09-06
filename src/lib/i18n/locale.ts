import { cookies, headers } from "next/headers";
import {
  LOCALE_COOKIE,
  DEFAULT_LOCALE,
  isLocale,
  detectLocale,
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
 * Priority:
 *  1. Explicit cookie (user picked a language via the toggle)
 *  2. Geo country header (x-vercel-ip-country / cf-ipcountry / x-country)
 *  3. Accept-Language header
 *  4. DEFAULT_LOCALE
 *
 * URLs stay unchanged (no /it /en routing). The choice is persisted in a
 * cookie so both client and server components can read it.
 *
 * NOTE: this module is server-only (it reads `next/headers`). Client
 * components that only need the cookie name / locale constants should import
 * from `./constants` instead.
 */

async function getGeoAndAcceptLanguage(): Promise<{
  country: string | null;
  acceptLanguage: string | null;
}> {
  try {
    const h = await headers();
    const country =
      h.get("x-vercel-ip-country") ??
      h.get("cf-ipcountry") ??
      h.get("x-country") ??
      h.get("x-geo-country") ??
      null;
    const acceptLanguage = h.get("accept-language");
    return { country, acceptLanguage };
  } catch {
    return { country: null, acceptLanguage: null };
  }
}

/**
 * Server-only: resolve the current locale.
 * - If a valid cookie exists, it wins (explicit user choice).
 * - Otherwise auto-detect from country / Accept-Language.
 */
export async function getLocale(): Promise<Locale> {
  try {
    const store = await cookies();
    const value = store.get(LOCALE_COOKIE)?.value;
    if (isLocale(value)) return value;
    // No explicit choice → auto-detect from request headers (country + language)
    const { country, acceptLanguage } = await getGeoAndAcceptLanguage();
    return detectLocale({ country, acceptLanguage });
  } catch {
    // cookies()/headers() unavailable in some edge contexts — never fail rendering.
    return DEFAULT_LOCALE;
  }
}

/**
 * Helper for middleware/proxy: detect locale from a NextRequest
 * without using `next/headers`. Used to auto-set the cookie on first visit.
 */
export function getLocaleFromRequest(req: {
  cookies: { get(name: string): { value: string } | undefined };
  headers: { get(name: string): string | null };
}): Locale {
  const cookieVal = req.cookies.get(LOCALE_COOKIE)?.value;
  if (isLocale(cookieVal)) return cookieVal;
  const country =
    req.headers.get("x-vercel-ip-country") ??
    req.headers.get("cf-ipcountry") ??
    req.headers.get("x-country") ??
    null;
  const acceptLanguage = req.headers.get("accept-language");
  return detectLocale({ country, acceptLanguage });
}

