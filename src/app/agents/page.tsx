import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AgentCard from "@/components/AgentCard";
import {
  AVAILABLE_AGENTS,
  COMING_SOON_AGENTS,
  isAvailable,
  localizeAgent,
} from "@/lib/agents";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary, t } from "@/lib/i18n/dictionaries";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const isIt = locale === "it";
  const title = isIt
    ? "Marketplace Agenti AI"
    : "AI Agent Marketplace";
  const description = isIt
    ? "Sfoglia agenti AI preconfigurati per marketing, operations, supporto, finanza e altro. Attiva agenti pronti all'uso che automatizzano i workflow aziendali."
    : "Browse pre-built AI agents for marketing, operations, support, finance and more. Deploy ready-to-use agents that automate your business workflows.";
  return {
    title,
    description,
    openGraph: {
      title: `${title} | AgentCloud`,
      description,
    },
  };
}

// The listing is gated by the runtime feature flags (server-only env vars),
// so it must be rendered per-request instead of baked at build time.
export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const available = AVAILABLE_AGENTS.map((a) => localizeAgent(a, locale));
  const comingSoon = COMING_SOON_AGENTS.map((a) => localizeAgent(a, locale));

  return (
    <main className="min-h-screen bg-neutral-950">
      <Navbar marketplaceAgents={available} />

      <section className="bg-[linear-gradient(180deg,#101014_0%,#0a0a0f_100%)] px-4 pb-16 pt-28 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-400">
                {dict.agentsPage.badge}
              </p>
              <h1 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
                {dict.agentsPage.title}
              </h1>
              <p className="mt-6 text-lg leading-8 text-neutral-400">
                {dict.agentsPage.subtitle}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/chat"
                  className="inline-flex items-center justify-center rounded-full bg-brand-500 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-400"
                >
                  {dict.agentsPage.startChat}
                </Link>
                <Link
                  href="/demo"
                  className="inline-flex items-center justify-center rounded-full border border-white/10 bg-neutral-900 px-6 py-3 text-sm font-bold text-white transition-colors hover:border-white/20"
                >
                  {dict.agentsPage.requestDemo}
                </Link>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {available.map((agent) => (
                <div
                  key={agent.slug}
                  className="rounded-3xl border border-white/5 bg-neutral-900 p-6 shadow-sm"
                >
                  <div className="mb-4 flex items-center gap-3">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl ${agent.accent}`}
                    >
                      <span className="text-white text-lg font-bold">
                        {agent.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="text-base font-bold text-white">
                        {agent.name}
                      </p>
                      <p className="text-sm text-neutral-500">
                        {agent.category}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm leading-6 text-neutral-400">
                    {agent.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Available agents (gated by the runtime feature flags) */}
          <div className="mb-8">
            <div className="mb-6 flex items-center gap-3">
              <h2 className="text-2xl font-bold text-white">
                {dict.agentsPage.availableNow}
              </h2>
              <span className="rounded-full bg-brand-500/10 px-3 py-1 text-xs font-bold text-brand-300">
                {t(dict.agentsPage.agentsCount, { count: available.length })}
              </span>
            </div>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {available.map((agent) => (
                <AgentCard
                  key={agent.slug}
                  agent={agent}
                  available={isAvailable(agent.slug)}
                />
              ))}
            </div>
          </div>

          {/* Coming soon agents */}
          <div>
            <div className="mb-6 flex items-center gap-3">
              <h2 className="text-2xl font-bold text-white">
                {dict.agentsPage.comingSoon}
              </h2>
              <span className="rounded-full bg-neutral-800 px-3 py-1 text-xs font-bold text-neutral-400">
                {t(dict.agentsPage.agentsCount, { count: comingSoon.length })}
              </span>
            </div>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {comingSoon.slice(0, 3).map((agent) => (
                <AgentCard
                  key={agent.slug}
                  agent={agent}
                  available={false}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
