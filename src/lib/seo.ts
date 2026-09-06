import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/site-url";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/constants";

/**
 * Costruisce metadata SEO coerenti per ogni pagina.
 *
 * Come funziona e perché:
 * - Imposta un canonical che punta a sé stesso, così ogni rotta viene
 *   indicizzata sul proprio URL (il layout di root imposta solo il canonical
 *   della homepage, che altrimenti verrebbe ereditato da tutte le pagine
 *   figlie — una trappola da contenuto duplicato per Google).
 * - Riporta gli stessi title/description nelle card OpenGraph + Twitter così
 *   il link condiviso viene mostrato in modo ricco (e raccoglie la
 *   `opengraph-image` di root).
 *
 * Il titolo usa il template di root ("%s | AgentCloud"): passa quindi un
 * titolo SENZA suffisso " | AgentCloud" per evitare doppio branding.
 */
export function pageSeo(opts: {
  title: string;
  description: string;
  path: string;
  locale?: Locale;
}): Metadata {
  const BASE = getSiteUrl();
  const url = `${BASE}${opts.path}`;
  const locale = opts.locale ?? DEFAULT_LOCALE;
  const ogLocale = locale === "it" ? "it_IT" : "en_US";

  return {
    title: opts.title,
    description: opts.description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      siteName: "AgentCloud",
      title: opts.title,
      description: opts.description,
      locale: ogLocale,
    },
    twitter: {
      card: "summary_large_image",
      title: opts.title,
      description: opts.description,
    },
  };
}
