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
/**
 * Locale BCP-47 per formattare date e numeri con la lingua attiva.
 *
 * Perché esiste: `locale === "it" ? "it-IT" : "en-US"` crea un ramo a due sole
 * lingue, e un utente tedesco si ritrovava date in formato americano.
 */
export const DATE_LOCALES: Record<Locale, string> = {
  it: "it-IT",
  en: "en-GB",
  es: "es-ES",
  de: "de-DE",
  fr: "fr-FR",
};

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
 * Mappa paese -> locale per il rilevamento automatico geografico.
 * Usa gli header Vercel (`x-vercel-ip-country`), Cloudflare (`cf-ipcountry`)
 * e simili.
 *
 * Regola di prodotto:
 *  - Germania (e area germanofona) -> tedesco
 *  - Spagna, Messico e America Latina -> spagnolo
 *  - Francia e paesi francofoni (Africa inclusa) -> francese
 *  - Italia -> italiano
 *  - tutti gli altri paesi -> inglese (DEFAULT_LOCALE)
 *
 * L'elenco è esaustivo: i paesi non presenti non "indovinano" la lingua
 * dall'Accept-Language, finiscono direttamente in inglese.
 */
export const COUNTRY_LOCALE_MAP: Record<string, Locale> = {
  // Italiano
  IT: "it",

  // Spagnolo — Spagna, Messico e America Latina
  ES: "es",
  MX: "es",
  AR: "es",
  BO: "es",
  CL: "es",
  CO: "es",
  CR: "es",
  CU: "es",
  DO: "es",
  EC: "es",
  GT: "es",
  HN: "es",
  NI: "es",
  PA: "es",
  PE: "es",
  PR: "es",
  PY: "es",
  SV: "es",
  UY: "es",
  VE: "es",

  // Tedesco — Germania, Austria, Svizzera tedesca, Liechtenstein
  DE: "de",
  AT: "de",
  CH: "de",
  LI: "de",

  // Francese — Francia, Europa francofona
  FR: "fr",
  BE: "fr",
  CA: "fr", // disambiguato poi dall'Accept-Language (Québec/Nuova Brunswick)
  LU: "fr",
  MC: "fr",

  // Francese — Africa francofona (Maghreb, Ovest, Centro, Oceano Indiano)
  DZ: "fr",
  MA: "fr",
  TN: "fr",
  SN: "fr",
  CI: "fr",
  ML: "fr",
  BF: "fr",
  NE: "fr",
  TG: "fr",
  BJ: "fr",
  GN: "fr",
  CM: "fr",
  TD: "fr",
  CF: "fr",
  GQ: "fr",
  CG: "fr",
  CD: "fr",
  GA: "fr",
  MG: "fr",
  MU: "fr",
  SC: "fr",
  KM: "fr",
  DJ: "fr",
  RW: "fr",
  BI: "fr",
  HT: "fr",
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

/**
 * Risolve la lingua della richiesta.
 *
 * Il paese ha la precedenza: se lo conosciamo usiamo la sua lingua, se non lo
 * conosciamo la lingua è l'inglese (non l'Accept-Language, altrimenti un utente
 * in un paese non mappato vedrebbe la lingua delle preferenze del browser
 * invece dell'inglese previsto dalla regola di prodotto).
 * L'Accept-Language entra in gioco solo quando il paese è ignoto: è il caso di
 * `next dev` e degli ambienti senza header geografico, dove senza di esso si
 * finirebbe sempre in inglese.
 */
export function detectLocale(opts: {
  country?: string | null;
  acceptLanguage?: string | null;
}): Locale {
  const country = opts.country?.trim() ? opts.country : null;
  if (country) {
    return localeFromCountry(country) ?? DEFAULT_LOCALE;
  }
  return localeFromAcceptLanguage(opts.acceptLanguage) ?? DEFAULT_LOCALE;
}
