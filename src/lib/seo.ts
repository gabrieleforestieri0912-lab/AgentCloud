import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/site-url";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/constants";

/**
 * Build consistent per-page SEO metadata.
 *
 * - Sets a self-referencing canonical so every route is indexed on its own URL
 *   (the root layout only sets the homepage canonical, which would otherwise
 *   be inherited by every child page — a duplicate-content trap).
 * - Mirrors the same title/description into OpenGraph + Twitter cards so the
 *   shared link renders richly (and picks up the root `opengraph-image`).
 *
 * The title uses the root template ("%s | AgentCloud"), so pass a BARE title
 * (no " | AgentCloud" suffix) to avoid double branding.
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
