import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BundleCard from "@/components/BundleCard";
import FloatingBrandBubbles from "@/components/FloatingBrandBubbles";
import type { FloatingBubble } from "@/components/FloatingBrandBubbles";
import { BUNDLES } from "@/lib/bundles";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { pageSeo } from "@/lib/seo";
import { AGENTS, AVAILABLE_AGENTS, localizeAgent } from "@/lib/agents";
import { getSiteUrl } from "@/lib/site-url";

const BUNDLES_BUBBLES: FloatingBubble[] = [
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

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const { bundlePage } = getDictionary(locale);
  const title = bundlePage.metaTitle;
  const description = bundlePage.metaDescription;
  return {
    ...pageSeo({ title, description, path: "/bundles", locale }),
    robots: { index: true, follow: true },
  };
}

export const dynamic = "force-dynamic";

export default async function BundlesPage() {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const navAgents = AVAILABLE_AGENTS.map((a) => localizeAgent(a, locale));

  const BASE_URL = getSiteUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: dict.bundlePage.aiAgentBundles,
    description: dict.bundlePage.bundlesDescriptionMeta,
    url: `${BASE_URL}/bundles`,
    isPartOf: { "@type": "WebSite", url: BASE_URL, name: "AgentCloud" },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: BUNDLES.length,
      itemListElement: BUNDLES.map((b, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${BASE_URL}/bundles/${b.slug}`,
        name: b.name,
        description: b.description,
      })),
    },
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-neutral-950">
      {/* Background identico alla landing — gradient fisso + radiali + hairline + bolle fluttuanti */}
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
      <FloatingBrandBubbles bubbles={BUNDLES_BUBBLES} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main id="main-content" className="relative z-10 flex-1">
        <Navbar marketplaceAgents={navAgents} />
        <section className="px-4 pb-16 pt-28 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl 3xl:max-w-[1720px]">
          {/* Hero */}
          <div className="mb-12 max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-400">
              {dict.bundlePage.bundlesAndSave}
            </p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
              {dict.bundlePage.aiAgentBundles}
            </h1>
            <p className="mt-6 text-lg leading-8 text-neutral-400">
              {dict.bundlePage.groupAndSave}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/agents"
                className="inline-flex items-center justify-center rounded-full border border-white/10 bg-neutral-900 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:border-white/20"
              >
                {dict.bundlePage.seeSingleAgents}
              </Link>
            </div>
          </div>

          {/* Savings highlight */}
          <div className="mb-10 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-white/5 bg-neutral-900/50 p-4 text-center">
              <p className="text-2xl font-extrabold text-emerald-400">-15%</p>
              <p className="mt-1 text-sm font-semibold text-neutral-400">
                {dict.bundlePage.quarterlyPlan}
              </p>
            </div>
            <div className="rounded-xl border border-white/5 bg-neutral-900/50 p-4 text-center">
              <p className="text-2xl font-extrabold text-emerald-400">-30%</p>
              <p className="mt-1 text-sm font-semibold text-neutral-400">
                {dict.bundlePage.yearlyPlan}
              </p>
            </div>
            <div className="rounded-xl border border-white/5 bg-neutral-900/50 p-4 text-center">
              <p className="text-2xl font-extrabold text-brand-400">{BUNDLES.length}</p>
              <p className="mt-1 text-sm font-semibold text-neutral-400">
                {dict.bundlePage.availableBundles}
              </p>
            </div>
          </div>

          {/* Bundles grid */}
          <div className="grid gap-6 md:grid-cols-2">
            {BUNDLES.map((bundle) => (
              <BundleCard key={bundle.slug} bundle={bundle} />
            ))}
          </div>

          {/* Custom CTA */}
          <div className="relative mt-14 overflow-hidden rounded-3xl border border-white/5 bg-neutral-900 p-10 text-center shadow-xl shadow-black/20 sm:p-14">
            <div
              className="pointer-events-none absolute inset-0 select-none"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 30% 20%, rgba(3,139,254,0.15), transparent 45%), radial-gradient(circle at 70% 80%, rgba(168,85,247,0.10), transparent 45%)",
              }}
            />
            <div className="relative">
              <p className="mb-3 text-sm font-bold uppercase tracking-widest text-brand-400">
                {dict.bundlePage.custom}
              </p>
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                {dict.bundlePage.noBundleFits}
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-neutral-400">
                {dict.bundlePage.customBundleDesc}
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-4">
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-8 py-3.5 text-base font-bold text-white shadow-lg shadow-brand-500/25 transition-all hover:bg-brand-400"
                >
                  {dict.bundlePage.contactUs}
                </Link>
                <Link
                  href="/chat"
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-neutral-800 px-8 py-3.5 text-base font-bold text-white transition-colors hover:border-white/20"
                >
                  {dict.bundlePage.askOurAI}
                </Link>
              </div>
            </div>
          </div>
        </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
