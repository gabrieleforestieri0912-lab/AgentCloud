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
import { pageSeo } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const isIt = locale === "it";
  const title = isIt ? "Marketplace Agenti AI" : "AI Agent Marketplace";
  const description = isIt
    ? "Sfoglia agenti AI preconfigurati per marketing, operations, supporto, finanza e altro. Attiva agenti pronti all'uso che automatizzano i workflow aziendali."
    : "Browse pre-built AI agents for marketing, operations, support, finance and more. Deploy ready-to-use agents that automate your business workflows.";
  return pageSeo({ title, description, path: "/agents", locale });
}

// The listing is gated by the runtime feature flags (server-only env vars),
// so it must be rendered per-request instead of baked at build time.
export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const available = AVAILABLE_AGENTS.map((a) => localizeAgent(a, locale));
  const comingSoon = COMING_SOON_AGENTS.map((a) => localizeAgent(a, locale));
  const isIt = locale === "it";

  return (
    <main className="min-h-screen bg-neutral-950">
      <Navbar marketplaceAgents={available} />

      <section className="bg-[linear-gradient(180deg,#101014_0%,#0a0a0f_100%)] px-4 pb-16 pt-28 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 max-w-2xl">
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

          {/* Custom agent CTA — prominent so users who can't find what
              they need know we'll build it for them. */}
          <div className="relative mt-16 overflow-hidden rounded-3xl border border-white/5 bg-neutral-900 p-10 text-center shadow-xl shadow-black/20 sm:p-14">
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
                {isIt
                  ? "Non trovi l'agente che cerchi?"
                  : "Can't find the agent you need?"}
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-neutral-400">
                {isIt
                  ? "Contattaci e lo progettiamo su misura per il tuo business. Colleghiamo i tuoi strumenti e consegniamo l'automazione pronta all'uso."
                  : "Contact us and we'll design it custom for your business. We connect your tools and deliver the automation ready to use."}
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
