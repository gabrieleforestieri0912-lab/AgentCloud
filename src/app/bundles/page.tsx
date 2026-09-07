import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BundleCard from "@/components/BundleCard";
import { BUNDLES } from "@/lib/bundles";
import { getLocale } from "@/lib/i18n/locale";
import { pageSeo } from "@/lib/seo";
import { AGENTS, AVAILABLE_AGENTS, localizeAgent } from "@/lib/agents";
import { getSiteUrl } from "@/lib/site-url";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const isIt = locale === "it";
  const title = isIt ? "Bundle Agenti AI — Risparmia fino al 30%" : "AI Agent Bundles — Save up to 30%";
  const description = isIt
    ? "Bundle di agenti AI con offerte trimestrali e annuali. Risparmia fino al 30% rispetto al prezzo singolo. E-commerce, Marketing, Operations e All-in-One."
    : "AI agent bundles with quarterly and annual offers. Save up to 30% vs single agent pricing. E-commerce, Marketing, Operations and All-in-One.";
  return {
    ...pageSeo({ title, description, path: "/bundles", locale }),
    robots: { index: true, follow: true },
  };
}

export const dynamic = "force-dynamic";

export default async function BundlesPage() {
  const locale = await getLocale();
  const isIt = locale === "it";
  const navAgents = AVAILABLE_AGENTS.map((a) => localizeAgent(a, locale));

  const BASE_URL = getSiteUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: isIt ? "Bundle Agenti AI" : "AI Agent Bundles",
    description: isIt
      ? "Bundle di agenti AI con offerte trimestrali e annuali. Risparmia fino al 30%."
      : "AI agent bundles with quarterly and annual offers. Save up to 30%.",
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
    <main className="min-h-screen bg-neutral-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar marketplaceAgents={navAgents} />

      <section className="dark-gradient-subtle px-4 pb-16 pt-28 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl 3xl:max-w-[1720px]">
          {/* Hero */}
          <div className="mb-12 max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-400">
              {isIt ? "Bundle & Risparmia" : "Bundles & Save"}
            </p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
              {isIt ? "Bundle di Agenti AI" : "AI Agent Bundles"}
            </h1>
            <p className="mt-6 text-lg leading-8 text-neutral-400">
              {isIt
                ? "Raggruppa gli agenti che ti servono e risparmia fino al 30%. Scegli il piano trimestrale o annuale e automatizza la tua azienda."
                : "Group the agents you need and save up to 30%. Choose quarterly or annual plans and automate your business."}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/agents"
                className="inline-flex items-center justify-center rounded-full border border-white/10 bg-neutral-900 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:border-white/20"
              >
                {isIt ? "Vedi agenti singoli" : "See single agents"}
              </Link>
            </div>
          </div>

          {/* Savings highlight */}
          <div className="mb-10 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-white/5 bg-neutral-900/50 p-4 text-center">
              <p className="text-2xl font-extrabold text-emerald-400">-15%</p>
              <p className="mt-1 text-sm font-semibold text-neutral-400">
                {isIt ? "Piano Trimestrale" : "Quarterly Plan"}
              </p>
            </div>
            <div className="rounded-xl border border-white/5 bg-neutral-900/50 p-4 text-center">
              <p className="text-2xl font-extrabold text-emerald-400">-30%</p>
              <p className="mt-1 text-sm font-semibold text-neutral-400">
                {isIt ? "Piano Annuale" : "Yearly Plan"}
              </p>
            </div>
            <div className="rounded-xl border border-white/5 bg-neutral-900/50 p-4 text-center">
              <p className="text-2xl font-extrabold text-brand-400">{BUNDLES.length}</p>
              <p className="mt-1 text-sm font-semibold text-neutral-400">
                {isIt ? "Bundle Disponibili" : "Available Bundles"}
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
                {isIt ? "Su misura" : "Custom"}
              </p>
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                {isIt ? "Nessun bundle ti torna?" : "No bundle fits?"}
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-neutral-400">
                {isIt
                  ? "Crea il tuo bundle personalizzato scegliendo gli agenti che ti servono. Contattaci per un preventivo su misura."
                  : "Create your custom bundle by picking the agents you need. Contact us for a tailored quote."}
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-4">
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-8 py-3.5 text-base font-bold text-white shadow-lg shadow-brand-500/25 transition-all hover:bg-brand-400"
                >
                  {isIt ? "Contattaci" : "Contact us"}
                </Link>
                <Link
                  href="/chat"
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-neutral-800 px-8 py-3.5 text-base font-bold text-white transition-colors hover:border-white/20"
                >
                  {isIt ? "Chiedi alla nostra AI" : "Ask our AI"}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
