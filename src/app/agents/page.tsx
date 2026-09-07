import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MarketplaceGrid from "@/components/MarketplaceGrid";
import { BUNDLES } from "@/lib/bundles";
import BundleCard from "@/components/BundleCard";
import { Sparkles } from "lucide-react";
// Pagina marketplace (lista agenti): server component che filtra il catalogo
// in base ai feature flag runtime e alla presenza del codice di accesso, poi
// passa il risultato alla griglia client.
import {
  AGENTS,
  AVAILABLE_AGENTS,
  COMING_SOON_AGENTS,
  localizeAgent,
} from "@/lib/agents";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { pageSeo } from "@/lib/seo";
import { hasPlatformAccess } from "@/lib/access-code";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const isIt = locale === "it";
  const title = isIt ? "Marketplace Agenti AI" : "AI Agent Marketplace";
  const description = isIt
    ? "Sfoglia agenti AI preconfigurati per marketing, operations, supporto, finanza e altro. Attiva agenti pronti all'uso che automatizzano i workflow aziendali."
    : "Browse pre-built AI agents for marketing, operations, support, finance and more. Deploy ready-to-use agents that automate your business workflows.";
  return pageSeo({ title, description, path: "/agents", locale });
}

// L'elenco dipende dai feature flag runtime (env var solo server), quindi va
// renderizzato per richiesta e non "cotto" in fase di build.
export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  // Tutti — inclusi i possessori del codice — vedono il marketplace diviso
  // come lo vede un cliente reale: una griglia "Disponibili ora" più una
  // sezione "In arrivo", così gli admin capiscono a colpo d'occhio quali
  // agenti il pubblico troverà bloccati. L'unica differenza per chi ha il
  // codice: comingSoonAccessible mantiene quelle card marcate ma cliccabili
  // (il codice le sblocca), invece di attenuate/bloccate. Navbar e menu
  // mobile elencano comunque il catalogo COMPLETO per chi ha il codice
  // (navAgents).
  const unlocked = await hasPlatformAccess();
  const available = AVAILABLE_AGENTS.map((a) => localizeAgent(a, locale));
  const comingSoon = COMING_SOON_AGENTS.map((a) =>
    localizeAgent(a, locale),
  );
  const navAgents = (unlocked ? AGENTS : AVAILABLE_AGENTS).map((a) =>
    localizeAgent(a, locale),
  );
  const isIt = locale === "it";

  return (
    <main className="min-h-screen bg-neutral-950">
      <Navbar marketplaceAgents={navAgents} />

      <section className="dark-gradient-subtle px-4 pb-16 pt-28 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl 3xl:max-w-[1720px]">
          <div className="mb-12 max-w-xl">
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

          {/* Griglia marketplace con filtri per categoria */}
          <MarketplaceGrid
            availableAgents={available}
            comingSoonAgents={comingSoon}
            availableCount={available.length}
            comingSoonCount={comingSoon.length}
            availableLabel={dict.agentsPage.availableNow}
            comingSoonLabel={dict.agentsPage.comingSoon}
            comingSoonAccessible={unlocked}
          />

          {/* Sezione Bundle — offerte trimestrali e annuali */}
          <div className="mt-14 sm:mt-16">
            <div className="flex items-center gap-3 mb-8">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/15 text-brand-400">
                <Sparkles size={20} />
              </span>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {isIt ? "Bundle & Risparmia" : "Bundles & Save"}
                </h2>
                <p className="text-sm font-semibold text-neutral-400">
                  {isIt ? "Raggruppa agenti e risparmia fino al 30% con piani trimestrali e annuali" : "Group agents and save up to 30% with quarterly and annual plans"}
                </p>
              </div>
              <Link
                href="/bundles"
                className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-neutral-900 px-4 py-2 text-xs font-bold text-neutral-300 transition-colors hover:border-white/20 hover:text-white"
              >
                {isIt ? "Vedi tutti" : "View all"}
              </Link>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              {BUNDLES.slice(0, 2).map((bundle) => (
                <BundleCard key={bundle.slug} bundle={bundle} />
              ))}
            </div>
          </div>

          {/* CTA agente personalizzato — ben visibile per chi non trova ciò
              they need know we'll build it for them. */}              <div className="relative mt-14 sm:mt-16 overflow-hidden rounded-3xl border border-white/5 bg-neutral-900 p-10 text-center shadow-xl shadow-black/20 sm:p-14">
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
