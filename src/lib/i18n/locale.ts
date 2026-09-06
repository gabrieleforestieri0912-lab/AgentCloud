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
 * i18n leggero per AgentCloud.
 *
 * Priorità di risoluzione della lingua:
 *  1. Cookie esplicito (l'utente ha scelto una lingua col toggle)
 *  2. Header paese geografico (x-vercel-ip-country / cf-ipcountry / x-country)
 *  3. Header Accept-Language
 *  4. DEFAULT_LOCALE
 *
 * Gli URL restano invariati (nessun routing /it /en): la scelta viene
 * persistita in un cookie leggibile sia dai client sia dai server component.
 *
 * NOTA: questo modulo è server-only (legge `next/headers`). I client component
 * che servono solo nome del cookie / costanti devono importare da
 * `./constants`.
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
 * Server-only: risolve la lingua corrente della richiesta.
 * - Se esiste un cookie valido, vince lui (scelta esplicita dell'utente).
 * - Altrimenti auto-rilevamento da paese / Accept-Language.
 */
export async function getLocale(): Promise<Locale> {
  try {
    const store = await cookies();
    const value = store.get(LOCALE_COOKIE)?.value;
    if (isLocale(value)) return value;
    // Nessuna scelta esplicita → auto-rilevamento dagli header (paese + lingua)
    const { country, acceptLanguage } = await getGeoAndAcceptLanguage();
    return detectLocale({ country, acceptLanguage });
  } catch {
    // cookies()/headers() non disponibili in alcuni contesti edge — mai far fallire il rendering.
    return DEFAULT_LOCALE;
  }
}

/**
 * Helper per middleware/proxy: rileva la lingua da una NextRequest SENZA
 * usare `next/headers`. Serve per impostare il cookie automatico alla prima
 * visita, quando il proxy non può leggere i cookie come un server component.
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

