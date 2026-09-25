import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Check,
  Clock3,
  ShieldCheck,
  Users,
  Sparkles,
  Zap,
  RefreshCw,
  Layers,
  Rocket,
  Star,
  Timer,
  Lock,
  MessagesSquare,
  BarChart3,
  Quote,
  Shield,
  Wand2,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AgentIcon from "@/components/AgentIcon";
import AgentCard from "@/components/AgentCard";
import AddToCartButton from "@/components/AddToCartButton";
import AgentIntegrationsCard from "@/components/AgentIntegrationsCard";
import { OwnedProvider } from "@/components/OwnedProvider";
import { getSessionUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveIsAdmin } from "@/lib/admin-access";
import { getOwnedAgentSlugs } from "@/lib/agents/ownership";
import { AGENTS, AVAILABLE_AGENTS, getAgentBySlug, isAvailable, localizeAgent } from "@/lib/agents";
import { getDetailEnrichment, getPricingNotes } from "@/lib/agents/agent-detail-enrichment";
import { BUNDLES, getBundleAgents, formatMonthlyPrice } from "@/lib/bundles";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary, t } from "@/lib/i18n/dictionaries";
import { getFAQs, getUseCases } from "@/lib/i18n/agentDetail";
import { pageSeo } from "@/lib/seo";

type AgentDetailPageProps = { params: Promise<{ slug: string }> };

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
    title: `${localized.name} — ${localized.category}`,
    description: localized.longDescription.slice(0, 155),
    path: `/agents/${slug}`,
    locale,
  });
}

export default async function AgentDetailPage({ params }: AgentDetailPageProps) {
  const { slug } = await params;
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const rawAgent = getAgentBySlug(slug);
  if (!rawAgent) notFound();
  const agent = localizeAgent(rawAgent, locale);
  const available = true || isAvailable(slug);
  const relatedAgents = AGENTS.filter((a) => a.slug !== agent.slug && a.category === agent.category)
    .slice(0, 3)
    .map((a) => localizeAgent(a, locale));
  const marketplaceAgents = (true ? AGENTS : AVAILABLE_AGENTS).map((a) => localizeAgent(a, locale));
  const sessionUser = await getSessionUser();
  const genericConnected: Record<string, boolean> = {};
  let shopifyConnected = false;
  let googleConnected = false;
  let isOwned = false;
  const isAdmin = await resolveIsAdmin(sessionUser);
  if (isAdmin) isOwned = true;
  if (sessionUser?.id && !isOwned) {
    const admin = createAdminClient();
    if (admin) {
      const [{ data: gRows }, { data: sRows }, { data: gShop }, { data: ownedRow }] = await Promise.all([
        admin.from("tenant_integrations").select("provider").eq("tenant_id", sessionUser.id).eq("status", "connected"),
        admin.from("shopify_connections").select("shop_domain, uninstalled_at").eq("user_id", sessionUser.id).is("uninstalled_at", null).limit(1),
        admin.from("google_connections").select("user_id").eq("user_id", sessionUser.id).maybeSingle(),
        admin.from("user_agents").select("id").eq("user_id", sessionUser.id).eq("agent_slug", slug).eq("status", "active").maybeSingle(),
      ]);
      for (const r of (gRows ?? []) as Array<{ provider: string }>) genericConnected[r.provider] = true;
      shopifyConnected = Array.isArray(sRows) && sRows.length > 0;
      googleConnected = !!gShop;
      isOwned = !!ownedRow;
    }
  }
  const ownedSlugs = sessionUser?.id ? await getOwnedAgentSlugs(sessionUser.id, sessionUser) : [];
  const useCases = getUseCases(slug, agent.tasks, locale);
  const faqs = getFAQs(slug, agent.shortName, locale);
  const enrichment = getDetailEnrichment(agent, locale);
  const pricingNotes = getPricingNotes(locale);
  const bundleWithAgent = BUNDLES.find((b) => b.agentSlugs.includes(agent.slug));
  const bundleTeaserAgents = bundleWithAgent ? getBundleAgents(bundleWithAgent).slice(0, 4) : [];
  const isIt = locale === "it";
  return (
    <OwnedProvider initialOwned={ownedSlugs}>
      <main className="min-h-screen bg-neutral-950">
        <Navbar marketplaceAgents={marketplaceAgents} />
        <section className="relative overflow-hidden px-4 pb-10 pt-28 sm:px-6 lg:px-8">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle at 12% 8%, rgba(3,139,254,0.16), transparent 42%), radial-gradient(circle at 88% 18%, rgba(217,70,239,0.10), transparent 46%), radial-gradient(circle at 50% 85%, rgba(3,139,254,0.06), transparent 55%)",
            }}
          />
          <div className="relative mx-auto max-w-7xl 3xl:max-w-[1720px]">
            <Link
              href="/agents"
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-neutral-900/60 px-4 py-2 text-xs font-bold tracking-wide text-neutral-300 backdrop-blur transition-colors hover:border-white/20 hover:text-white"
            >
              <ArrowLeft size={13} />
              {dict.agentDetail.backToMarketplace}
            </Link>
            <div className="grid gap-8 lg:grid-cols-[1.15fr_420px] lg:items-start">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg ${agent.accent}`}>
                    <AgentIcon icon={agent.icon} brand={agent.brand} size={26} className="text-white" />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-xs font-bold text-brand-300">{agent.category}</span>
                    <span className="rounded-full border border-white/10 bg-neutral-900/70 px-3 py-1 text-xs font-bold text-neutral-300">
                      {agent.badgeLabel ?? agent.badge}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-xs font-bold text-neutral-400">
                      <Clock3 size={12} className="text-neutral-500" />
                      {agent.setupTime}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-300">
                      <Lock size={11} /> GDPR-ready
                    </span>
                  </div>
                </div>
                <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight text-white sm:text-5xl">
                  {agent.name}
                  <span className="mt-2 block bg-gradient-to-r from-brand-400 to-purple-400 bg-clip-text text-2xl font-bold tracking-tight text-transparent sm:text-3xl">
                    {agent.description}
                  </span>
                </h1>
                <p className="mt-4 max-w-3xl text-base leading-7 text-neutral-300">{agent.longDescription}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-neutral-500">
                  <Users size={13} className="text-brand-400" />
                  {t(dict.agentDetail.forIndustry, { industry: agent.industry })}
                  <span className="h-3 w-px bg-white/10" />
                  <span className="inline-flex items-center gap-1 text-neutral-400">
                    <Shield size={12} className="text-emerald-400" />
                    {dict.agentDetail.gdprNote}
                  </span>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {enrichment.kpis.map((k) => (
                    <div key={k.label} className="rounded-xl border border-white/5 bg-neutral-900/70 px-3 py-3 backdrop-blur">
                      <p className="text-lg font-bold leading-none text-white">{k.value}</p>
                      <p className="mt-1 text-xs font-bold text-neutral-200">{k.label}</p>
                      <p className="text-[11px] font-semibold leading-tight text-neutral-500">{k.sub}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  {available ? (
                    isOwned ? (
                      <Link
                        href={`/chat?agent=${agent.slug}`}
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-400"
                      >
                        {dict.agentDetail.openInChat} <ArrowRight size={16} />
                      </Link>
                    ) : (
                      <>
                        <AddToCartButton slug={agent.slug} />
                        <Link
                          href={`/chat?agent=${agent.slug}`}
                          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-neutral-900 px-6 py-3 text-sm font-bold text-white hover:bg-white/5"
                        >
                          {isIt ? "Prova in chat" : "Try in chat"} <MessagesSquare size={16} />
                        </Link>
                      </>
                    )
                  ) : (
                    <span className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-neutral-900 px-7 py-3 text-sm font-bold text-neutral-500">
                      {dict.common.comingSoon}
                    </span>
                  )}
                  <Link
                    href="/contact"
                    className="inline-flex items-center gap-2 rounded-xl border border-white/5 bg-white/5 px-5 py-3 text-sm font-bold text-neutral-300 hover:bg-white/10"
                  >
                    {isIt ? "Parla con noi" : "Talk to us"}
                  </Link>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-neutral-500">
                  <span>{isIt ? "Funziona con" : "Works with"}</span>
                  <span className="inline-flex flex-wrap gap-1.5">
                    {agent.integrations.map((l) => (
                      <span key={l} className="rounded-full border border-white/10 bg-neutral-900 px-2.5 py-1 text-xs font-bold text-neutral-300">
                        {l}
                      </span>
                    ))}
                  </span>
                </div>
              </div>
              <aside className="lg:sticky lg:top-24 lg:self-start">
                <div className="space-y-4">
                  <div className="rounded-2xl border border-white/5 bg-neutral-900 p-6 shadow-xl shadow-black/30">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/15 text-brand-400">
                          <Rocket size={16} />
                        </span>
                        <div>
                          <p className="text-sm font-bold text-white">{pricingNotes.includes}</p>
                          <p className="text-xs font-semibold text-neutral-500">{pricingNotes.billedMonthly}</p>
                        </div>
                      </div>
                      <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs font-bold text-neutral-400">
                        {pricingNotes.setupLabel}: {agent.setupTime}
                      </span>
                    </div>
                    <div className="mt-4 flex items-baseline gap-2">
                      <p className="text-4xl font-bold tracking-tight text-white">{agent.price}</p>
                      <span className="text-sm font-bold text-neutral-500">{pricingNotes.perMonth}</span>
                      <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-neutral-800 px-3 py-1 text-xs font-bold text-neutral-300">
                        <Timer size={12} /> {agent.setupTime}
                      </span>
                    </div>
                    <p className="mt-1 text-xs font-semibold text-neutral-500">
                      {pricingNotes.support} · {pricingNotes.overage}
                    </p>
                    <div className="mt-4 space-y-2">
                      {agent.tasks.map((task) => (
                        <div key={task} className="flex items-center gap-2 text-sm font-semibold text-neutral-200">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
                            <Check size={12} className="text-emerald-400" />
                          </span>
                          {task}
                        </div>
                      ))}
                    </div>
                    <Link
                      href={!available ? "/contact" : isOwned ? `/chat?agent=${agent.slug}` : `/chat?agent=${agent.slug}`}
                      className={`mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white ${available ? (isOwned ? "bg-emerald-500 hover:bg-emerald-400" : "bg-brand-500 hover:bg-brand-400") : "bg-neutral-800 text-neutral-500"}`}
                    >
                      {available ? (isOwned ? dict.agentDetail.openInChat : dict.agentDetail.openChat) : dict.common.comingSoon} <ArrowRight size={14} />
                    </Link>
                    {available && !isOwned && (
                      <div className="mt-3">
                        <AddToCartButton slug={agent.slug} className="w-full justify-center" />
                      </div>
                    )}
                    {isOwned && <p className="mt-2 text-center text-xs font-bold text-emerald-400">{dict.agentDetail.alreadyPurchased}</p>}
                    <p className="mt-3 text-center text-xs font-semibold text-neutral-500">
                      <Link href="/bundles" className="text-brand-300 hover:text-brand-200">
                        {pricingNotes.bundleSave}
                      </Link>{" "}
                      · <Link href="/privacy" className="underline decoration-white/20 underline-offset-2">GDPR</Link> ·{" "}
                      <Link href="/terms" className="underline decoration-white/20 underline-offset-2">SOC 2</Link>
                    </p>
                  </div>
                  {bundleWithAgent && (
                    <div className="rounded-2xl border border-brand-500/20 bg-neutral-900 p-4">
                      <p className="text-xs font-bold uppercase tracking-widest text-brand-300">{isIt ? "Risparmia con il bundle" : "Save with bundle"}</p>
                      <p className="mt-1 text-sm font-bold text-white">{bundleWithAgent.name}</p>
                      <p className="line-clamp-2 text-xs font-semibold text-neutral-400">{bundleWithAgent.description}</p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {bundleTeaserAgents.map((a) => (
                          <span key={a.slug} className="rounded-full bg-white/5 px-2 py-1 text-xs font-semibold text-neutral-300">
                            {a.shortName}
                          </span>
                        ))}
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-sm font-bold text-white">
                          {formatMonthlyPrice(bundleWithAgent.pricing.monthly)}
                          <span className="text-xs font-semibold text-neutral-500">/mo</span>
                        </span>
                        <Link href={`/bundles/${bundleWithAgent.slug}`} className="rounded-full bg-white px-4 py-2 text-xs font-bold text-neutral-900 hover:bg-neutral-100">
                          {isIt ? "Vedi bundle" : "View bundle"} →
                        </Link>
                      </div>
                    </div>
                  )}
                  <AgentIntegrationsCard
                    integrations={agent.integrations}
                    agentSlug={agent.slug}
                    genericConnected={genericConnected}
                    shopifyConnected={shopifyConnected}
                    googleConnected={googleConnected}
                  />
                  <div className="rounded-2xl border border-white/5 bg-neutral-900 p-5">
                    <div className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                        <ShieldCheck size={16} />
                      </span>
                      <div>
                        <p className="text-sm font-bold text-white">{dict.agentDetail.gdprNote}</p>
                        <p className="mt-1 text-xs font-semibold leading-5 text-neutral-500">{dict.agentDetail.guidedSetupNote}</p>
                        <ul className="mt-2 space-y-1">
                          {enrichment.security.slice(0, 3).map((s) => (
                            <li key={s} className="flex gap-1.5 text-xs font-semibold leading-5 text-neutral-400">
                              <CheckCircle2 size={12} className="mt-0.5 shrink-0 text-emerald-400" />
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </section>
        <section className="px-4 pb-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl 3xl:max-w-[1720px] space-y-6">
            <div className="rounded-2xl border border-white/5 bg-neutral-900 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-xl font-bold text-white">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/15 text-brand-400">
                    <Wand2 size={16} />
                  </span>
                  {dict.agentDetail.whatAutomates}
                </h2>
                <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-bold text-neutral-400">
                  {agent.tasks.length} {isIt ? "capability" : "capabilities"} · {agent.integrations.length} {isIt ? "integrazioni" : "integrations"}
                </span>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {enrichment.capabilities.map((c) => (
                  <div key={c.title} className="rounded-xl border border-white/5 bg-neutral-800/60 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-bold text-white">{c.title}</p>
                      <span className="shrink-0 rounded-full bg-brand-500/10 px-2 py-0.5 text-[10px] font-bold tracking-wide text-brand-300">{c.tools[0]}</span>
                    </div>
                    <p className="mt-1 text-sm leading-5 text-neutral-400">{c.desc}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {c.tools.slice(0, 3).map((tool) => (
                        <span key={tool} className="rounded-full bg-black/30 px-2 py-0.5 font-mono text-[10px] font-semibold text-neutral-400">
                          {tool}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-white/5 bg-neutral-900 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-xl font-bold text-white">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                    <MessagesSquare size={16} />
                  </span>
                  {isIt ? "Come lavora — demo dal vivo" : "How it works — live demo"}
                </h2>
                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-300">{isIt ? "Transcript reale" : "Real transcript"}</span>
              </div>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-neutral-400">
                {t(dict.agentDetail.howItWorksDesc, { name: agent.shortName })} — {isIt ? "ecco uno scambio tipico con strumenti e tempi" : "here’s a typical exchange with tools and timing"}.
              </p>
              <div className="mt-6 overflow-hidden rounded-2xl border border-white/5 bg-neutral-950">
                <div className="flex items-center justify-between border-b border-white/5 bg-neutral-900 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    <span className="text-xs font-bold text-white">{agent.shortName}</span>
                    <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs font-semibold text-neutral-400">{agent.category}</span>
                  </div>
                  <span className="text-xs font-semibold text-neutral-500">{isIt ? "Demo interattiva" : "Interactive demo"}</span>
                </div>
                <div className="space-y-3 p-4">
                  {enrichment.transcript.map((turn, idx) => (
                    <div key={idx} className={`flex gap-3 ${turn.role === "user" ? "justify-end" : ""}`}>
                      {turn.role === "agent" && (
                        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${agent.accent} text-white`}>
                          <AgentIcon icon={agent.icon} brand={agent.brand} size={14} className="text-white" />
                        </span>
                      )}
                      <div
                        className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${turn.role === "user" ? "bg-brand-500 text-white rounded-br-md" : "border border-white/5 bg-neutral-800 text-neutral-100 rounded-bl-md"}`}
                      >
                        {turn.text}
                        {turn.meta && <p className={`mt-2 font-mono text-xs ${turn.role === "user" ? "text-white/70" : "text-neutral-500"}`}>↳ {turn.meta}</p>}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 border-t border-white/5 bg-neutral-900 px-4 py-3">
                  <Link href={`/chat?agent=${agent.slug}`} className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-4 py-2 text-xs font-bold text-white hover:bg-brand-400">
                    {dict.agentDetail.openChat} <ArrowRight size={12} />
                  </Link>
                  <span className="text-xs font-semibold leading-6 text-neutral-500">
                    {isIt ? "Provalo con i tuoi dati — 4 messaggi gratuiti" : "Try with your data — 4 free messages"}
                  </span>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-white/5 bg-neutral-900 p-6">
              <h2 className="flex items-center gap-2 text-xl font-bold text-white">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/15 text-purple-400">
                  <RefreshCw size={16} />
                </span>
                {dict.agentDetail.howItWorks}
              </h2>
              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {agent.workflow.map((step, index) => (
                  <div key={step} className="relative rounded-xl border border-white/5 bg-neutral-800/60 p-4">
                    <p className="mb-3 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-purple-500 text-xs font-bold text-white">
                      {index + 1}
                    </p>
                    <p className="text-sm font-bold text-white">{step}</p>
                    {index < agent.workflow.length - 1 && (
                      <span className="absolute -right-2 top-5 hidden text-neutral-600 lg:block">
                        <ArrowRight size={14} />
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-2xl border border-white/5 bg-neutral-900 p-6">
                <h2 className="flex items-center gap-2 text-xl font-bold text-white">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-pink-500/15 text-pink-400">
                    <Sparkles size={16} />
                  </span>
                  {dict.agentDetail.useCases}
                </h2>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-neutral-400">{t(dict.agentDetail.useCasesDesc, { name: agent.shortName })}</p>
                <div className="mt-4 space-y-2.5">
                  {useCases.map((uc, i) => (
                    <div key={i} className="flex gap-3 rounded-xl border border-white/5 bg-neutral-800/60 px-4 py-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-500/15 text-xs font-bold text-brand-300">
                        {i + 1}
                      </span>
                      <p className="text-sm font-semibold leading-relaxed text-neutral-200">{uc}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-6">
                <div className="rounded-2xl border border-amber-500/15 bg-gradient-to-br from-amber-500/10 to-orange-500/10 p-6">
                  <div className="flex gap-1 text-amber-400">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={14} className="fill-amber-400" />
                    ))}
                  </div>
                  <blockquote className="mt-3 text-sm font-semibold leading-6 text-white">“{enrichment.testimonial.quote}”</blockquote>
                  <p className="mt-3 flex items-center gap-2 text-xs font-bold text-neutral-300">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white">
                      <Quote size={12} />
                    </span>
                    {enrichment.testimonial.author} — {enrichment.testimonial.role}
                  </p>
                  <p className="ml-9 text-xs font-semibold text-neutral-500">{enrichment.testimonial.company}</p>
                </div>
                <div className="rounded-2xl border border-white/5 bg-neutral-900 p-6">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                    <BarChart3 size={14} className="text-brand-400" />
                    {isIt ? "Perché questo agente" : "Why this agent"}
                  </h3>
                  <ul className="mt-3 space-y-2">
                    {(isIt
                      ? [
                          "Chat → azione diretta (carrello, booking, email) senza moduli.",
                          "Strumenti veri su API reali, non mock — auditabile dai log.",
                          "Supporto all'avvio: tono, trigger e workflow ottimizzati sui tuoi dati.",
                        ]
                      : [
                          "Chat → direct action (cart, booking, email) — no forms.",
                          "Real tools on real APIs, not mocks — auditable in logs.",
                          "Onboarding: tone, triggers and workflow tuned on your data.",
                        ]
                    ).map((li) => (
                      <li key={li} className="flex gap-2 text-sm font-semibold leading-5 text-neutral-300">
                        <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-brand-400" />
                        {li}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-white/5 bg-neutral-900 p-6">
              <h2 className="flex items-center gap-2 text-xl font-bold text-white">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                  <Shield size={16} />
                </span>
                {isIt ? "Sicurezza & conformità" : "Security & compliance"}
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {enrichment.security.map((s) => (
                  <div key={s} className="flex gap-2 rounded-xl border border-white/5 bg-neutral-800/60 px-4 py-3">
                    <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-400" />
                    <p className="text-sm font-semibold leading-5 text-neutral-300">{s}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-white/5 bg-neutral-900 p-6">
              <h2 className="text-xl font-bold text-white">{dict.agentDetail.faqTitle}</h2>
              <div className="mt-4 space-y-2">
                {faqs.map(([q, a]) => (
                  <details key={q} className="group rounded-xl border border-white/5 bg-neutral-800/60 px-4 py-3">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold text-white">
                      {q}
                      <span className="text-neutral-500 transition-transform group-open:rotate-45">+</span>
                    </summary>
                    <p className="mt-2 text-sm leading-relaxed text-neutral-400">{a}</p>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </section>
        {relatedAgents.length > 0 && (
          <section className="border-t border-white/5 px-4 py-8 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl 3xl:max-w-[1720px]">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/15 text-brand-400">
                  <Layers size={16} />
                </span>
                <h2 className="text-xl font-bold text-white">{t(dict.agentDetail.moreIn, { category: agent.category })}</h2>
              </div>
              <p className="mt-1 text-sm font-semibold text-neutral-400">{dict.agentDetail.relatedDesc}</p>
              <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {relatedAgents.map((a) => (
                  <AgentCard key={a.slug} agent={a} available={true} />
                ))}
              </div>
            </div>
          </section>
        )}
        <section className="border-t border-white/5 px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{t(dict.agentDetail.readyToDeploy, { name: agent.shortName })}</h2>
            <p className="mt-3 text-base leading-relaxed text-neutral-400">{t(dict.agentDetail.readyToDeployDesc, { category: agent.category })}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {available && !isOwned ? (
                <>
                  <Link href={`/chat?agent=${agent.slug}`} className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-7 py-3 text-sm font-bold text-white hover:bg-brand-400">
                    {dict.agentDetail.openChat} <ArrowRight size={14} />
                  </Link>
                  <AddToCartButton slug={agent.slug} />
                </>
              ) : available && isOwned ? (
                <Link href={`/chat?agent=${agent.slug}`} className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-7 py-3 text-sm font-bold text-white">
                  {dict.agentDetail.openInChat} <ArrowRight size={14} />
                </Link>
              ) : null}
              <Link href="/contact" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-neutral-900 px-7 py-3 text-sm font-bold text-white">
                {isIt ? "Contattaci" : "Contact us"}
              </Link>
            </div>
          </div>
        </section>
        <Footer />
      </main>
    </OwnedProvider>
  );
}
