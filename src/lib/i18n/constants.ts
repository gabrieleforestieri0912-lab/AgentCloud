/**
 * Costanti i18n client-safe.
 *
 * Vivono in un modulo dedicato (senza `next/headers`) così i client component
 * (es. LanguageProvider) possono importarle senza trascinare codice
 * server-only nel bundle del browser. I server component devono usare
 * `./locale.ts`.
 */

export const LOCALE_COOKIE = "agentcloud_locale";

export const LOCALES = ["it", "en", "es", "de", "fr"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** Etichette leggibili per il toggle lingua / locale OpenGraph */
export const LOCALE_LABELS: Record<Locale, { short: string; long: string; og: string }> = {
  it: { short: "IT", long: "Italiano", og: "it_IT" },
  en: { short: "EN", long: "English", og: "en_US" },
  es: { short: "ES", long: "Español", og: "es_ES" },
  de: { short: "DE", long: "Deutsch", og: "de_DE" },
  fr: { short: "FR", long: "Français", og: "fr_FR" },
};

export function isLocale(value: unknown): value is Locale {
  return LOCALES.includes(value as Locale);
}

/**
 * Mappa paese → locale per il rilevamento automatico geografico.
 * Usa gli header Vercel (`x-vercel-ip-country`), Cloudflare (`cf-ipcountry`)
 * e simili. Solo i paesi elencati vengono mappati a una lingua specifica;
 * tutti gli altri ripiegano su Accept-Language / default.
 */
export const COUNTRY_LOCALE_MAP: Record<string, Locale> = {
  IT: "it",
  ES: "es",
  MX: "es",
  AR: "es",
  CL: "es",
  CO: "es",
  PE: "es",
  VE: "es",
  UY: "es",
  PY: "es",
  BO: "es",
  EC: "es",
  DE: "de",
  AT: "de",
  CH: "de",
  LI: "de",
  FR: "fr",
  BE: "fr",
  CA: "fr", // verrà disambiguato via Accept-Language; fr di default per FR-BE/CA
  LU: "fr",
  MC: "fr",
};

const ACCEPT_LANG_TO_LOCALE: Record<string, Locale> = {
  it: "it",
  en: "en",
  es: "es",
  de: "de",
  fr: "fr",
};

export function localeFromCountry(country: string | null | undefined): Locale | null {
  if (!country) return null;
  const upper = country.trim().toUpperCase();
  return COUNTRY_LOCALE_MAP[upper] ?? null;
}

export function localeFromAcceptLanguage(header: string | null | undefined): Locale | null {
  if (!header) return null;
  // Analizza "fr-CH, fr;q=0.9, en;q=0.8, de;q=0.7, *;q=0.5": prende il primo
  // tag di lingua valido rispettando l'ordine di preferenza indicato.
  const parts = header.split(",").map((p) => p.trim());
  for (const part of parts) {
    const [tag] = part.split(";").map((s) => s.trim());
    if (!tag || tag === "*") continue;
    const base = tag.split("-")[0]?.toLowerCase();
    if (!base) continue;
    const loc = ACCEPT_LANG_TO_LOCALE[base];
    if (loc) return loc;
  }
  return null;
}

export function detectLocale(opts: {
  country?: string | null;
  acceptLanguage?: string | null;
}): Locale {
  return (
    localeFromCountry(opts.country) ??
    localeFromAcceptLanguage(opts.acceptLanguage) ??
    DEFAULT_LOCALE
  );
}
