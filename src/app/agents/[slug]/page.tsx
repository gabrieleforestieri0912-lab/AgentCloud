import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Plug,
  ShieldCheck,
  Star,
  Users,
  Sparkles,
  Zap,
  RefreshCw,
  Layers,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AgentIcon from "@/components/AgentIcon";
import AgentPreview from "@/components/AgentPreview";
import AgentCard from "@/components/AgentCard";
import { AGENTS, getAgentBySlug } from "@/lib/agents";

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

  return {
    title: `${agent.name} | AgentCloud`,
    description: agent.description,
  };
}

const USE_CASE_EXAMPLES: Record<string, string[]> = {
  "executive-assistant": [
    "Schedule a board meeting across 8 time zones with agenda and prep docs",
    "Draft weekly status reports from Slack threads and email updates",
    "Organize a quarterly offsite including travel, accommodation, and activities",
  ],
  "email": [
    "Auto-reply to common support inquiries with knowledge-base accuracy",
    "Draft and send personalized follow-up sequences for inbound leads",
    "Summarize daily inbox into a 5-minute briefing with action items",
  ],
};

function getUseCases(slug: string, tasks: string[]): string[] {
  if (USE_CASE_EXAMPLES[slug]) return USE_CASE_EXAMPLES[slug];
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

function getFAQs(slug: string, name: string): [string, string][] {
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
  const agent = getAgentBySlug(slug);

  if (!agent) notFound();

  const relatedAgents = AGENTS.filter(
    (a) => a.slug !== agent.slug && a.category === agent.category,
  ).slice(0, 3);

  const useCases = getUseCases(slug, agent.tasks);
  const faqs = getFAQs(slug, agent.shortName);

  return (
    <main className="min-h-screen bg-neutral-950">
      <Navbar />

      {/* ─── Hero ─── */}
      <section className="bg-[linear-gradient(180deg,#101014_0%,#0a0a0f_100%)] px-4 pb-16 pt-28 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/agents"
            className="mb-8 inline-flex items-center gap-2 text-sm font-bold text-neutral-400 transition-colors hover:text-white"
          >
            <ArrowLeft size={16} />
            Back to marketplace
          </Link>

          <div className="grid gap-10 lg:grid-cols-[1fr_420px] lg:items-start">
            <div>
              <div className="mb-5 flex flex-wrap items-center gap-3">
                <div className={`flex h-13 w-13 items-center justify-center rounded-lg ${agent.accent}`}>
                  <AgentIcon icon={agent.icon} size={25} className="text-white" />
                </div>
                <span className="rounded-full bg-brand-500/20 px-3 py-1 text-sm font-bold text-brand-300">
                  {agent.badge}
                </span>
                <span className="rounded-full bg-neutral-800 px-3 py-1 text-sm font-bold text-neutral-400">
                  {agent.category}
                </span>
              </div>

              <h1 className="max-w-4xl text-5xl font-bold tracking-tight text-white sm:text-6xl">
                {agent.name}
              </h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-neutral-400">
                {agent.longDescription}
              </p>

              {/* Target audience */}
              <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-neutral-500">
                <Users size={16} className="text-brand-400" />
                For {agent.industry}
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href={`/agents/${agent.slug}/deploy`}
                  className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-400"
                >
                  Configure agent
                  <ArrowRight size={16} />
                </Link>
                <a
                  href="#preview"
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-neutral-900 px-6 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:border-white/20"
                >
                  Try preview
                </a>
              </div>
            </div>

            {/* Stats sidebar */}
            <div className="rounded-xl border border-white/5 bg-neutral-900 p-6 shadow-xl shadow-brand-500/5">
              <div className="mb-5 grid grid-cols-3 gap-3 text-center">
                {[
                  [agent.rating, "Rating"],
                  [agent.installs, "Installs"],
                  [agent.setupTime, "Setup"],
                ].map(([value, label]) => (
                  <div key={label} className="rounded-lg bg-neutral-800 px-3 py-4">
                    <p className="text-2xl font-bold text-white">{value}</p>
                    <p className="text-xs font-semibold text-neutral-400">{label}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3 rounded-lg bg-neutral-800 p-3 text-neutral-300">
                  <Star size={17} className="text-purple-400 shrink-0" />
                  Rated by teams using this workflow weekly
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-neutral-800 p-3 text-neutral-300">
                  <Clock3 size={17} className="text-brand-400 shrink-0" />
                  Typical launch time: {agent.setupTime}
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-neutral-800 p-3 text-neutral-300">
                  <ShieldCheck size={17} className="text-purple-400 shrink-0" />
                  Built for GDPR-aware business workflows
                </div>
              </div>

              <div className="mt-5 border-t border-white/5 pt-5">
                <p className="text-sm font-semibold text-neutral-400">Setup price</p>
                <p className="text-3xl font-bold text-white">{agent.price}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Content + Preview ─── */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_420px]">
          <div className="space-y-8">
            {/* What this agent automates */}
            <div className="rounded-xl border border-white/5 bg-neutral-900 p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-2xl font-bold text-white">
                <Zap size={22} className="text-brand-400" />
                What this agent automates
              </h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {agent.tasks.map((task) => (
                  <div key={task} className="flex items-center gap-3 rounded-lg bg-neutral-800 p-4">
                    <CheckCircle2 size={18} className="text-purple-400 shrink-0" />
                    <span className="text-sm font-semibold text-neutral-200">{task}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* How it works */}
            <div className="rounded-xl border border-white/5 bg-neutral-900 p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-2xl font-bold text-white">
                <RefreshCw size={22} className="text-purple-400" />
                How it works
              </h2>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-neutral-400">
                {agent.shortName} follows a structured workflow to deliver results every time.
              </p>
              <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {agent.workflow.map((step, index) => (
                  <div key={step} className="relative rounded-lg border border-white/5 bg-neutral-800 p-4">
                    <p className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white">
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
            <div className="rounded-xl border border-white/5 bg-neutral-900 p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-2xl font-bold text-white">
                <Sparkles size={22} className="text-brand-400" />
                Use case examples
              </h2>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-neutral-400">
                Real scenarios where {agent.shortName} delivers value out of the box.
              </p>
              <div className="mt-5 space-y-3">
                {useCases.map((useCase, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 rounded-lg border border-white/5 bg-neutral-800 px-4 py-3.5"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-500/20 text-xs font-bold text-brand-300">
                      {i + 1}
                    </span>
                    <span className="text-sm font-semibold leading-relaxed text-neutral-200">
                      {useCase}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Integrations */}
            <div className="rounded-xl border border-white/5 bg-neutral-900 p-6 shadow-sm">
              <div className="mb-2 flex items-center gap-2">
                <Plug size={22} className="text-brand-400" />
                <h2 className="text-2xl font-bold text-white">Integrations</h2>
              </div>
              <p className="text-sm font-semibold leading-relaxed text-neutral-400">
                {agent.shortName} connects directly with your existing tool stack.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {agent.integrations.map((integration) => (
                  <span
                    key={integration}
                    className="rounded-full border border-white/5 bg-neutral-800 px-3.5 py-1.5 text-sm font-semibold text-neutral-300"
                  >
                    {integration}
                  </span>
                ))}
              </div>
            </div>

            {/* FAQ */}
            <div className="rounded-xl border border-white/5 bg-neutral-900 p-6 shadow-sm">
              <h2 className="mb-2 text-2xl font-bold text-white">Frequently asked questions</h2>
              <div className="mt-5 space-y-4">
                {faqs.map(([question, answer]) => (
                  <div key={question} className="rounded-lg bg-neutral-800 px-4 py-3.5">
                    <p className="text-sm font-bold text-white">{question}</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-neutral-400">{answer}</p>
                  </div>
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
          <div className="mx-auto max-w-7xl">
            <div className="mb-2 flex items-center gap-2">
              <Layers size={22} className="text-brand-400" />
              <h2 className="text-2xl font-bold text-white">
                More in {agent.category}
              </h2>
            </div>
            <p className="text-sm font-semibold text-neutral-400">
              Other agents designed for the same workflow area.
            </p>
            <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {relatedAgents.map((a) => (
                <AgentCard key={a.slug} agent={a} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── CTA ─── */}
      <section className="border-t border-white/5 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to deploy {agent.shortName}?
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-neutral-400">
            Set up in minutes, no code required. Start automating your{" "}
            {agent.category.toLowerCase()} workflows today.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href={`/agents/${agent.slug}/deploy`}
              className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-8 py-3.5 text-base font-bold text-white transition-colors hover:bg-brand-400"
            >
              Configure and deploy
              <ArrowRight size={18} />
            </Link>
            <Link
              href="/chat"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-neutral-900 px-8 py-3.5 text-base font-bold text-white transition-colors hover:border-white/20"
            >
              Ask our AI
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
