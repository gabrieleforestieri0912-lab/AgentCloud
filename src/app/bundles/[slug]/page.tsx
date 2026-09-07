import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BundleDetailClient from "./bundle-detail-client";
import { BUNDLES, getBundleBySlug, getBundleAgents, formatPrice } from "@/lib/bundles";
import { getLocale } from "@/lib/i18n/locale";
import { pageSeo } from "@/lib/seo";
import { AVAILABLE_AGENTS, localizeAgent } from "@/lib/agents";
import { getSiteUrl } from "@/lib/site-url";

export async function generateStaticParams() {
  return BUNDLES.map((b) => ({ slug: b.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const bundle = getBundleBySlug(slug);
  if (!bundle) return {};
  const locale = await getLocale();
  const isIt = locale === "it";
  const agents = getBundleAgents(bundle);
  return {
    ...pageSeo({
      title: `${bundle.name} — ${isIt ? "Bundle Agenti AI" : "AI Agent Bundle"}`,
      description: `${bundle.description} ${isIt ? "Risparmia fino al 30% con piani trimestrali e annuali." : "Save up to 30% with quarterly and annual plans."}`,
      path: `/bundles/${slug}`,
      locale,
    }),
    openGraph: {
      type: "website",
      url: `${getSiteUrl()}/bundles/${slug}`,
      siteName: "AgentCloud",
      title: `${bundle.name} — AgentCloud`,
      description: bundle.description,
      locale: locale === "it" ? "it_IT" : "en_US",
      images: [{ url: `${getSiteUrl()}/bundles/${slug}/opengraph-image`, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${bundle.name} — AgentCloud`,
      description: bundle.description,
      images: [`${getSiteUrl()}/bundles/${slug}/opengraph-image`],
    },
    robots: { index: true, follow: true },
  };
}

export default async function BundleDetailPage({ params }: Props) {
  const { slug } = await params;
  const bundle = getBundleBySlug(slug);
  if (!bundle) notFound();

  const locale = await getLocale();
  const navAgents = AVAILABLE_AGENTS.map((a) => localizeAgent(a, locale));

  const BASE_URL = getSiteUrl();
  const agents = getBundleAgents(bundle);
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        name: bundle.name,
        description: bundle.longDescription,
        url: `${BASE_URL}/bundles/${slug}`,
        image: `${BASE_URL}/bundles/${slug}/opengraph-image`,
        brand: { "@type": "Brand", name: "AgentCloud" },
        category: "AI Agent Bundle",
        offers: {
          "@type": "AggregateOffer",
          lowPrice: bundle.pricing.yearly / 100,
          highPrice: bundle.pricing.monthly / 100,
          priceCurrency: "EUR",
          offerCount: 3,
          offers: [
            {
              "@type": "Offer",
              name: "Monthly",
              price: bundle.pricing.monthly / 100,
              priceCurrency: "EUR",
              priceSpecification: { "@type": "UnitPriceSpecification", priceCurrency: "EUR", price: bundle.pricing.monthly / 100, billingDuration: "P1M" },
            },
            {
              "@type": "Offer",
              name: "Quarterly",
              price: bundle.pricing.quarterly / 100,
              priceCurrency: "EUR",
              priceSpecification: { "@type": "UnitPriceSpecification", priceCurrency: "EUR", price: bundle.pricing.quarterly / 100, billingDuration: "P3M" },
            },
            {
              "@type": "Offer",
              name: "Yearly",
              price: bundle.pricing.yearly / 100,
              priceCurrency: "EUR",
              priceSpecification: { "@type": "UnitPriceSpecification", priceCurrency: "EUR", price: bundle.pricing.yearly / 100, billingDuration: "P1Y" },
            },
          ],
        },
        additionalProperty: agents.map((a) => ({
          "@type": "PropertyValue",
          name: a.name,
          value: a.price,
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
          { "@type": "ListItem", position: 2, name: "Bundle", item: `${BASE_URL}/bundles` },
          { "@type": "ListItem", position: 3, name: bundle.name, item: `${BASE_URL}/bundles/${slug}` },
        ],
      },
    ],
  };

  return (
    <main className="min-h-screen bg-neutral-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar marketplaceAgents={navAgents} />
      <BundleDetailClient bundle={bundle} />
      <Footer />
    </main>
  );
}
