import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FloatingBrandBubbles from "@/components/FloatingBrandBubbles";
import type { FloatingBubble } from "@/components/FloatingBrandBubbles";
import BundleDetailClient from "./bundle-detail-client";

const BUNDLE_DETAIL_BUBBLES: FloatingBubble[] = [
  { top: "4%", left: "18%", size: "w-11 h-11", brand: "google", delay: "0.6s", anim: "animate-float-gentle" },
  { top: "7%", left: "72%", size: "w-10 h-10", brand: "shopify", delay: "0s", anim: "animate-float-gentle" },
  { top: "12%", left: "4%", size: "w-10 h-10", brand: "discord", delay: "1.4s", anim: "animate-float-gentle" },
  { top: "15%", left: "88%", size: "w-10 h-10", brand: "stripe", delay: "1.2s", anim: "animate-float-reverse" },
  { top: "28%", left: "2%", size: "w-9 h-9", brand: "calendly", delay: "1.1s", anim: "animate-float-reverse" },
  { top: "32%", left: "92%", size: "w-10 h-10", brand: "mailchimp", delay: "0.3s", anim: "animate-float-gentle" },
  { top: "55%", left: "3%", size: "w-9 h-9", brand: "whatsapp", delay: "0.4s", anim: "animate-float-reverse" },
  { top: "60%", left: "90%", size: "w-10 h-10", brand: "notion", delay: "2.2s", anim: "animate-float-gentle" },
  { top: "78%", left: "6%", size: "w-10 h-10", brand: "github", delay: "1.0s", anim: "animate-float-reverse" },
  { top: "82%", left: "85%", size: "w-10 h-10", brand: "facebook", delay: "0.9s", anim: "animate-float-reverse" },
];
import { BUNDLES, getBundleBySlug, getBundleAgents, formatPrice } from "@/lib/bundles";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { LOCALE_LABELS } from "@/lib/i18n/constants";
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
  const dict = getDictionary(locale);
  const agents = getBundleAgents(bundle);
  return {
    ...pageSeo({
      title: `${bundle.name} — ${dict.bundlePage.aiAgentBundles}`,
      description: `${bundle.description} ${dict.bundleDetail.savingsNote}`,
      path: `/bundles/${slug}`,
      locale,
    }),
    openGraph: {
      type: "website",
      url: `${getSiteUrl()}/bundles/${slug}`,
      siteName: "AgentCloud",
      title: `${bundle.name} — AgentCloud`,
      description: bundle.description,
      locale: LOCALE_LABELS[locale].og,
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
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-neutral-950">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 dark-gradient-main" />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 10%, rgba(3,139,254,.18), transparent 32%), radial-gradient(circle at 85% 12%, rgba(234,67,53,.14), transparent 28%), radial-gradient(circle at 50% 85%, rgba(168,85,247,.12), transparent 36%)",
          }}
        />
        <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-brand-500/20 to-transparent" />
      </div>
      <FloatingBrandBubbles bubbles={BUNDLE_DETAIL_BUBBLES} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main id="main-content" className="relative z-10 flex-1">
        <Navbar marketplaceAgents={navAgents} />
        <BundleDetailClient bundle={bundle} />
      </main>
      <Footer />
    </div>
  );
}
