import type { Metadata } from "next";
import { notFound } from "next/navigation";
import FeatureDetailPage from "@/components/FeatureDetailPage";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import {
  FEATURE_PATHS,
  FEATURE_SLUGS,
  getFeatureDetail,
  isFeatureSlug,
} from "@/lib/i18n/featureDetails";
import { pageSeo } from "@/lib/seo";

/**
 * Pagine di dettaglio aperte dal "Vedi dettagli" della sezione Funzionalità.
 *
 * Gli slug sono noti a build time (quattro pilastri), quindi la pagina è
 * statica per slug e i testi arrivano localizzati da `featureDetails.ts`.
 * I tre punti "in sintesi" riusano `dict.features.items`: l'ordine di
 * `FEATURE_SLUGS` deve restare allineato a quell'elenco.
 */
export const revalidate = 300;

export async function generateStaticParams() {
  return FEATURE_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (!isFeatureSlug(slug)) notFound();
  const locale = await getLocale();
  const content = getFeatureDetail(locale, slug);
  return pageSeo({
    title: content.metaTitle,
    description: content.metaDescription,
    path: FEATURE_PATHS[slug],
    locale,
  });
}

export default async function FeaturePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!isFeatureSlug(slug)) notFound();

  const locale = await getLocale();
  const content = getFeatureDetail(locale, slug);
  const dict = getDictionary(locale);

  // Stessa posizione della card in home: vedi la nota in `featureDetails.ts`.
  const index = FEATURE_SLUGS.indexOf(slug);
  const highlights = dict.features.items[index]?.details ?? [];
  const related = FEATURE_SLUGS.filter((s) => s !== slug).map((s) => ({
    label: getFeatureDetail(locale, s).badge,
    href: FEATURE_PATHS[s],
  }));

  return (
    <FeatureDetailPage
      slug={slug}
      content={content}
      highlights={highlights}
      related={related}
    />
  );
}
