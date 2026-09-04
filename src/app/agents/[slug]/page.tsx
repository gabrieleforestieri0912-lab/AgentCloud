import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Plug,
  ShieldCheck,
  Users,
  Sparkles,
  Zap,
  RefreshCw,
  Layers,
  Rocket,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AgentIcon from "@/components/AgentIcon";
import AgentPreview from "@/components/AgentPreview";
import AgentCard from "@/components/AgentCard";
import {
  AGENTS,
  AVAILABLE_AGENTS,
  getAgentBySlug,
  isAvailable,
  localizeAgent,
} from "@/lib/agents";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary, t } from "@/lib/i18n/dictionaries";
import { pageSeo } from "@/lib/seo";
import { hasPlatformAccess } from "@/lib/access-code";

type AgentDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return AGENTS.map((agent) => ({ slug: agent.slug }));
}

export async function generateMetadata({ params }: AgentDetailPageProps) {
  const { slug } = await params;
  const agent = getAgentBySlug(slug);

  if (!agent) return {};

  const locale = await getLocale();
  const localized = localizeAgent(agent, locale);

  return pageSeo({
    title: localized.name,
    description: localized.description,
    path: `/agents/${slug}`,
    locale,
  });
}

const USE_CASE_EXAMPLES: Record<string, string[]> = {
  "email-manager": [
    "Triage a week of unread email into priorities, folders, and drafts",
    "Extract every commitment and deadline hidden in my inbox threads",
    "Send a morning digest with what needs my decision today",
  ],
};

const USE_CASE_EXAMPLES_IT: Record<string, string[]> = {
  "email-manager": [
    "Smista una settimana di email non lette in priorità, cartelle e bozze",
    "Estrai ogni impegno e scadenza nascosti nelle conversazioni della casella",
    "Invia un digest mattutino con ciò che richiede oggi la tua decisione",
  ],
};

function getUseCases(
  slug: string,
  tasks: string[],
  locale: "it" | "en",
): string[] {
  const examples = locale === "it" ? USE_CASE_EXAMPLES_IT : USE_CASE_EXAMPLES;
  if (examples[slug]) return examples[slug];
  if (locale === "it") {
    return tasks.map(
      (task) =>
        `Automatizza "${task.toLowerCase()}" dall'inizio alla fine con ${slug.includes("-") ? "i tuoi strumenti connessi" : "workflow basati sull'AI"}`,
    );
  }
  return tasks.map(
    (task) =>
      `Automate "${task.toLowerCase()}" end-to-end with ${slug.includes("-") ? "your connected tools" : "AI-powered workflows"}`,
  );
}

const AGENT_FAQS: Record<string, [string, string][]> = {
  "default": [
    ["What data does this agent access?", "The agent only accesses the tools and data sources you connect. No data is stored longer than needed to complete your task, and all processing happens in a GDPR-compliant environment."],
    ["Can I customize the workflow?", "Yes. Every agent lets you adjust triggers, actions, and outputs to match your specific business process."],
    ["How long does setup take?", "Setup typically takes 1-2 days, including connecting your tools and configuring the first workflow."],
    ["Can I cancel anytime?", "Absolutely. You can pause or cancel your subscription at any time with no penalties."],
  ],
};

function getFAQs(
  slug: string,
  name: string,
  locale: "it" | "en",
): [string, string][] {
  if (locale === "it") {
    return [
      [`Come si collega ${name} ai miei strumenti?`, `${name} si collega tramite integrazioni API sicure con OAuth 2.0. Approvi ogni connessione una sola volta e l'agente gestisce il resto.`],
      [`Posso personalizzare cosa automatizza ${name}?`, `Sì. Puoi configurare trigger, azioni e output per adattarli al tuo workflow esatto. L'agente impara dalle tue regolazioni nel tempo.`],
      [`Quanto tempo serve perché ${name} sia pienamente operativo?`, `Il setup richiede in genere ${name.includes("Assistente") ? "lo stesso giorno" : "1-2 giorni lavorativi"}, inclusa la configurazione delle integrazioni e il primo test del workflow.`],
      [`I miei dati sono al sicuro con ${name}?`, `Tutti i dati sono crittografati in transito e a riposo. L'agente opera in un ambiente conforme al GDPR con controlli SOC 2.`],
    ];
  }
  if (AGENT_FAQS[slug]) return AGENT_FAQS[slug];
  return [
    [`How does ${name} connect to my tools?`, `${name} connects via secure API integrations with OAuth 2.0. You approve each connection once and the agent handles the rest.`],
    [`Can I customize what ${name} automates?`, `Yes. You can configure triggers, actions, and outputs to match your exact workflow. The agent learns from your adjustments over time.`],
    [`How long until ${name} is fully operational?`, `Setup typically takes ${name.includes("Assistant") ? "same day" : "1-2 business days"}, including integration configuration and first workflow test.`],
    [`Is my data secure with ${name}?`, `All data is encrypted in transit and at rest. The agent operates in a GDPR-compliant environment with SOC 2 controls.`],
  ];
}

export default async function AgentDetailPage({ params }: AgentDetailPageProps) {
  const { slug } = await params;
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const rawAgent = getAgentBySlug(slug);
  if (!rawAgent) notFound();
  const agent = localizeAgent(rawAgent, locale);
  // Access-code holders unlock every agent — including "coming soon" ones —
  // so the deploy CTA and related cards treat the whole catalog as live.
  const unlocked = await hasPlatformAccess();
  const available = unlocked || isAvailable(slug);

  const relatedAgents = AGENTS.filter(
    (a) => a.slug !== agent.slug && a.category === agent.category,
  )
    .slice(0, 3)
    .map((a) => localizeAgent(a, locale));

  const marketplaceAgents = (unlocked ? AGENTS : AVAILABLE_AGENTS).map((a) =>
    localizeAgent(a, locale),
  );

  const useCases = getUseCases(slug, agent.tasks, locale);
  const faqs = getFAQs(slug, agent.shortName, locale);

  return (
    <main className="min-h-screen bg-neutral-950">
      <Navbar marketplaceAgents={marketplaceAgents} />

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#101014_0%,#0a0a0f_100%)] px-4 pb-16 pt-28 sm:px-6 lg:px-8">
        {/* Soft brand glow behind the header */}
        <div
          className="pointer-events-none absolute inset-0 select-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 10%, rgba(3,139,254,0.10), transparent 40%), radial-gradient(circle at 85% 25%, rgba(217,70,239,0.06), transparent 45%)",
          }}
        />
        <div className="relative mx-auto max-w-7xl 3xl:max-w-[1720px]">
          <Link
            href="/agents"
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-neutral-900/60 px-4 py-2 text-sm font-bold text-neutral-400 backdrop-blur transition-colors hover:border-white/20 hover:text-white"
          >
            <ArrowLeft size={16} />
            {dict.agentDetail.backToMarketplace}
          </Link>

          <div className="grid gap-10 lg:grid-cols-[1fr_400px] lg:items-start">
            <div>
              <div className="mb-6 flex flex-wrap items-center gap-3">
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg shadow-black/20 ${agent.accent}`}
                >
                  <AgentIcon
                    icon={agent.icon}
                    brand={agent.brand}
                    size={26}
                    className="text-white"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-xs font-bold text-brand-300">
                    {agent.category}
                  </span>
                  <span className="rounded-full border border-white/10 bg-neutral-900/70 px-3 py-1 text-xs font-bold text-neutral-400">
                    {agent.badge}
                  </span>
                </div>
              </div>

              <h1 className="max-w-4xl text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
                {agent.name}
              </h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-neutral-400">
                {agent.longDescription}
              </p>

              <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-neutral-500">
                <Users size={16} className="text-brand-400" />
                {t(dict.agentDetail.forIndustry, { industry: agent.industry })}
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                {available ? (
                  <Link
                    href={`/agents/${agent.slug}/deploy`}
                    className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-500/25 transition-all hover:bg-brand-400 hover:shadow-brand-500/35"
                  >
                    {dict.agentDetail.configureAgent}
                    <ArrowRight size={16} />
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-neutral-900 px-7 py-3.5 text-sm font-bold text-neutral-500">
                    {dict.common.comingSoon}
                  </span>
                )}
                <a
                  href="#preview"
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-neutral-900 px-7 py-3.5 text-sm font-bold text-white shadow-sm transition-colors hover:border-white/20"
                >
                  {dict.agentDetail.tryPreview}
                </a>
              </div>
            </div>

            {/* Sticky sidebar — only real info: price, setup, integrations */}
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <div className="space-y-6">
                {/* Price + plan card */}
                <div className="rounded-2xl border border-white/5 bg-neutral-900/80 p-6 shadow-xl shadow-black/20 backdrop-blur">
                  <div className="mb-4 flex items-center gap-2.5 border-b border-white/5 pb-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/15 text-brand-400">
                      <Rocket size={18} />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-white">
                        {dict.agentDetail.setupPrice}
                      </h2>
                      <p className="text-xs font-semibold text-neutral-500">
                        {dict.deploy.flowNote}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-3xl font-bold text-white">
                        {agent.price}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-neutral-500">
                        {dict.agentDetail.setup}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-full bg-neutral-800 px-3 py-1.5 text-xs font-bold text-neutral-300">
                      <Clock3 size={13} className="text-brand-400" />
                      {agent.setupTime}
                    </div>
                  </div>

                  <div className="mt-5 space-y-2.5">
                    {agent.tasks.slice(0, 3).map((task) => (
                      <div
                        key={task}
                        className="flex items-center gap-2.5 text-sm font-semibold text-neutral-300"
                      >
                        <CheckCircle2 size={16} className="shrink-0 text-brand-400" />
                        {task}
                      </div>
                    ))}
                  </div>

                  <Link
                    href={available ? `/agents/${agent.slug}/deploy` : "/demo"}
                    className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white transition-all ${
                      available
                        ? "bg-brand-500 shadow-lg shadow-brand-500/20 hover:bg-brand-400"
                        : "bg-neutral-800 text-neutral-400"
                    }`}
                  >
                    {available ? (
                      <>
                        {dict.agentDetail.configureAndDeploy}
                        <ArrowRight size={16} />
                      </>
                    ) : (
                      dict.common.comingSoon
                    )}
                  </Link>

                  <Link
                    href="/chat"
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-5 py-3 text-sm font-bold text-white transition-colors hover:border-white/20"
                  >
                    {dict.agentDetail.askOurAi}
                  </Link>
                </div>

                {/* Integrations card */}
                <div className="rounded-2xl border border-white/5 bg-neutral-900/80 p-6 shadow-xl shadow-black/20 backdrop-blur">
                  <div className="mb-4 flex items-center gap-2.5 border-b border-white/5 pb-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/15 text-purple-400">
                      <Plug size={18} />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-white">
                        {dict.agentDetail.integrationsTitle}
                      </h2>
                      <p className="text-xs font-semibold text-neutral-500">
                        {t(dict.agentDetail.integrationsDesc, { name: agent.shortName })}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {agent.integrations.map((integration) => (
                      <span
                        key={integration}
                        className="rounded-full border border-white/10 bg-neutral-800 px-3.5 py-1.5 text-xs font-semibold text-neutral-300"
                      >
                        {integration}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Trust card */}
                <div className="rounded-2xl border border-white/5 bg-neutral-900/80 p-6 shadow-xl shadow-black/20 backdrop-blur">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                      <ShieldCheck size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">
                        {dict.agentDetail.gdprNote}
                      </p>
                      <p className="mt-1 text-xs font-semibold leading-5 text-neutral-500">
                        {locale === "it"
                          ? "Configurazione guidata senza codice: colleghi i tuoi strumenti e attivi l'agente in pochi minuti."
                          : "Code-free guided setup: connect your tools and deploy the agent in minutes."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* ─── Content + Preview ─── */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl 3xl:max-w-[1720px] gap-8 lg:grid-cols-[1fr_420px] 3xl:grid-cols-[1fr_480px]">
          <div className="space-y-8">
            {/* What this agent automates */}
            <div className="rounded-2xl border border-white/5 bg-neutral-900 p-6 shadow-sm transition-shadow hover:shadow-lg hover:shadow-black/20">
              <h2 className="flex items-center gap-2 text-2xl font-bold text-white">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/15 text-brand-400">
                  <Zap size={18} />
                </span>
                {dict.agentDetail.whatAutomates}
              </h2>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {agent.tasks.map((task) => (
                  <div
                    key={task}
                    className="flex items-center gap-3 rounded-xl border border-white/5 bg-neutral-800/60 p-4 transition-colors hover:border-brand-500/20"
                  >
                    <CheckCircle2 size={18} className="shrink-0 text-brand-400" />
                    <span className="text-sm font-semibold text-neutral-200">{task}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* How it works */}
            <div className="rounded-2xl border border-white/5 bg-neutral-900 p-6 shadow-sm transition-shadow hover:shadow-lg hover:shadow-black/20">
              <h2 className="flex items-center gap-2 text-2xl font-bold text-white">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/15 text-purple-400">
                  <RefreshCw size={18} />
                </span>
                {dict.agentDetail.howItWorks}
              </h2>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-neutral-400">
                {t(dict.agentDetail.howItWorksDesc, { name: agent.shortName })}
              </p>
              <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {agent.workflow.map((step, index) => (
                  <div
                    key={step}
                    className="relative rounded-xl border border-white/5 bg-neutral-800/60 p-4 transition-colors hover:border-brand-500/20"
                  >
                    <p className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br from-brand-500 to-purple-500 text-sm font-bold text-white shadow-lg shadow-brand-500/20">
                      {index + 1}
                    </p>
                    <p className="text-sm font-bold text-neutral-200">{step}</p>
                    {index < agent.workflow.length - 1 && (
                      <div className="absolute -right-2 top-5 hidden text-neutral-600 lg:block">
                        <ArrowRight size={16} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Use cases */}
            <div className="rounded-2xl border border-white/5 bg-neutral-900 p-6 shadow-sm transition-shadow hover:shadow-lg hover:shadow-black/20">
              <h2 className="flex items-center gap-2 text-2xl font-bold text-white">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-pink-500/15 text-pink-400">
                  <Sparkles size={18} />
                </span>
                {dict.agentDetail.useCases}
              </h2>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-neutral-400">
                {t(dict.agentDetail.useCasesDesc, { name: agent.shortName })}
              </p>
              <div className="mt-5 space-y-3">
                {useCases.map((useCase, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 rounded-xl border border-white/5 bg-neutral-800/60 px-4 py-3.5 transition-colors hover:border-brand-500/20"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-500/15 text-xs font-bold text-brand-300">
                      {i + 1}
                    </span>
                    <span className="text-sm font-semibold leading-relaxed text-neutral-200">
                      {useCase}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* FAQ */}
            <div className="rounded-2xl border border-white/5 bg-neutral-900 p-6 shadow-sm transition-shadow hover:shadow-lg hover:shadow-black/20">
              <h2 className="mb-2 text-2xl font-bold text-white">
                {dict.agentDetail.faqTitle}
              </h2>
              <div className="mt-5 space-y-3">
                {faqs.map(([question, answer]) => (
                  <details
                    key={question}
                    className="group rounded-xl border border-white/5 bg-neutral-800/60 px-4 py-3.5 transition-colors hover:border-white/10"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold text-white">
                      {question}
                      <span className="text-neutral-500 transition-transform group-open:rotate-45">
                        +
                      </span>
                    </summary>
                    <p className="mt-2.5 text-sm leading-relaxed text-neutral-400">
                      {answer}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          </div>

          {/* Sticky preview */}
          <div id="preview" className="lg:sticky lg:top-24 lg:self-start">
            <AgentPreview agent={agent} />
          </div>
        </div>
      </section>

      {/* ─── Related agents ─── */}
      {relatedAgents.length > 0 && (
        <section className="border-t border-white/5 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl 3xl:max-w-[1720px]">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/15 text-brand-400">
                <Layers size={18} />
              </span>
              <h2 className="text-2xl font-bold text-white">
                {t(dict.agentDetail.moreIn, { category: agent.category })}
              </h2>
            </div>
            <p className="text-sm font-semibold text-neutral-400">
              {dict.agentDetail.relatedDesc}
            </p>
            <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {relatedAgents.map((a) => (
                <AgentCard
                  key={a.slug}
                  agent={a}
                  available={unlocked || isAvailable(a.slug)}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── CTA ─── */}
      <section className="border-t border-white/5 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {t(dict.agentDetail.readyToDeploy, { name: agent.shortName })}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-neutral-400">
            {t(dict.agentDetail.readyToDeployDesc, { category: agent.category })}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            {available && (
              <Link
                href={`/agents/${agent.slug}/deploy`}
                className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-8 py-3.5 text-base font-bold text-white shadow-lg shadow-brand-500/25 transition-all hover:bg-brand-400"
              >
                {dict.agentDetail.configureAndDeploy}
                <ArrowRight size={18} />
              </Link>
            )}
            <Link
              href="/chat"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-neutral-900 px-8 py-3.5 text-base font-bold text-white transition-colors hover:border-white/20"
            >
              {dict.agentDetail.askOurAi}
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
