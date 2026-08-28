import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin-access";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock3,
  CreditCard,
  Plus,
  Power,
  Zap,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AgentIcon from "@/components/AgentIcon";
import { AGENTS, localizeAgent } from "@/lib/agents";
import { getAgentRuntimeConfig } from "@/lib/agents/registry";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveTokenLimit } from "@/lib/billing/usage-tracking";
import { OVERAGE_RATE_PER_1000_TOKENS } from "@/lib/billing/pricing";
import { calculateOverageAmountCents } from "@/lib/stripe/overage";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary, t } from "@/lib/i18n/dictionaries";

const overageRateDisplay = `€${(OVERAGE_RATE_PER_1000_TOKENS / 100)
  .toFixed(2)
  .replace(".", ",")}`;

type InstalledAgent = {
  slug: string;
  status: string;
  runs: number;
  tokens: number;
  lastRun: string | null;
  agent: (typeof AGENTS)[number] | null;
  runtimeName?: string;
  config?: Record<string, unknown>;
};

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function timeAgo(iso: string | null, dict: ReturnType<typeof getDictionary>): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return dict.dashboard.justNow;
  if (minutes < 60) return t(dict.dashboard.minutesAgo, { n: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t(dict.dashboard.hoursAgo, { n: hours });
  return t(dict.dashboard.daysAgo, { n: Math.floor(hours / 24) });
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ billing?: string }>;
}) {
  const { billing } = await searchParams;
  const locale = await getLocale();
  const dict = getDictionary(locale);

  // Supabase session: resolve the user server-side from the cookies.
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const userId = user.id;

  // ── Real data (service-role, server-side) with graceful fallbacks ──────
  const db = createAdminClient();
  let installed: InstalledAgent[] = [];
  let totalRuns = 0;
  let totalTokens = 0;
  let dbAvailable = false;

  if (db) {
    dbAvailable = true;
    const now = new Date();
    const periodStart = new Date(
      Date.UTC(now.getFullYear(), now.getMonth(), 1),
    ).toISOString();

    const [{ data: userAgents }, { data: runs }] = await Promise.all([
      db
        .from("user_agents")
        .select("*")
        .eq("user_id", userId)
        .order("activated_at", { ascending: false }),
      db
        .from("agent_runs")
        .select("agent_slug, input_tokens, output_tokens, started_at, finished_at")
        .eq("user_id", userId)
        .gte("started_at", periodStart),
    ]);

    const runsByAgent = new Map<
      string,
      { runs: number; tokens: number; lastRun: string | null }
    >();
    for (const run of runs ?? []) {
      const bucket = runsByAgent.get(run.agent_slug) ?? {
        runs: 0,
        tokens: 0,
        lastRun: null,
      };
      bucket.runs += 1;
      bucket.tokens += (run.input_tokens || 0) + (run.output_tokens || 0);
      if (run.started_at && (!bucket.lastRun || run.started_at > bucket.lastRun)) {
        bucket.lastRun = run.started_at;
      }
      runsByAgent.set(run.agent_slug, bucket);
      totalRuns += 1;
      totalTokens += (run.input_tokens || 0) + (run.output_tokens || 0);
    }

    installed = (userAgents ?? []).map((ua) => {
      const catalog = AGENTS.find((a) => a.slug === ua.agent_slug);
      const runtime = getAgentRuntimeConfig(ua.agent_slug);
      const stats = runsByAgent.get(ua.agent_slug) ?? {
        runs: 0,
        tokens: 0,
        lastRun: null,
      };
      return {
        slug: ua.agent_slug,
        status: ua.status ?? "inactive",
        runs: stats.runs,
        tokens: stats.tokens,
        lastRun: stats.lastRun,
        agent: catalog ? localizeAgent(catalog, locale) : null,
        runtimeName: runtime?.name,
        config: (ua.config ?? {}) as Record<string, unknown>,
      };
    });
  }

  const fullName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : "";
  const firstName =
    fullName.split(" ")[0] || (user.email ?? "").split("@")[0];
  const greeting = firstName
    ? t(dict.dashboard.welcomeBack, { name: firstName })
    : dict.dashboard.welcomeBackGeneric;
  const email = user.email ?? "";
  const isAdmin = isAdminEmail(user.email);

  const statCards: Array<[string, string, typeof Zap]> = [
    [String(installed.length), dict.dashboard.statInstalledAgents, Zap],
    [formatCount(totalRuns), dict.dashboard.statRunsThisMonth, Activity],
    [formatCount(totalTokens), dict.dashboard.statTokensUsed, CheckCircle2],
    [
      String(installed.filter((a) => a.status === "active").length),
      dict.dashboard.statActiveAgents,
      AlertCircle,
    ],
  ];

  return (
    <main className="min-h-screen bg-neutral-950">
      <Navbar />

      <section className="px-4 pb-16 pt-28 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-4 flex items-center gap-2">
                <Activity size={13} className="text-brand-400" />
                <span className="text-xs font-bold uppercase tracking-[0.08em] text-brand-400">
                  {dict.dashboard.myAgents}
                </span>
              </div>
              <h1 className="flex flex-wrap items-center gap-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">
                {greeting}
                {isAdmin && (
                  <span className="rounded-full border border-brand-500/40 bg-brand-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-300">
                    Admin
                  </span>
                )}
              </h1>
              <p className="mt-2 text-sm text-neutral-500">{email}</p>
              <p className="mt-2 max-w-2xl text-lg leading-8 text-neutral-400">
                {dict.dashboard.tagline}
              </p>
            </div>

            <Link
              href="/agents"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-500 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-400"
            >
              <Plus size={16} />
              {dict.dashboard.installAgent}
            </Link>
          </div>

          {billing === "error" && (
            <div className="mb-8 flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-300">
              <AlertCircle size={16} className="shrink-0" />
              {dict.dashboard.billingError}
            </div>
          )}

          <div className="mb-8 grid gap-4 md:grid-cols-4">
            {statCards.map(([value, label, Icon]) => (
              <div
                key={label}
                className="rounded-lg border border-white/5 bg-neutral-900 p-5 shadow-sm"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500 text-white">
                  <Icon size={19} />
                </div>
                <p className="text-3xl font-bold text-white">{value}</p>
                <p className="text-sm text-neutral-400">{label}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="rounded-lg border border-white/5 bg-neutral-900 shadow-sm">
              <div className="border-b border-white/5 p-5">
                <h2 className="text-xl font-bold text-white">
                  {dict.dashboard.installedAgents}
                </h2>
              </div>

              {installed.length === 0 ? (
                <div className="p-10 text-center">
                  {dbAvailable ? (
                    <>
                      <p className="text-base font-bold text-white">
                        {dict.dashboard.noAgentsTitle}
                      </p>
                      <p className="mx-auto mt-2 max-w-sm text-sm text-neutral-400">
                        {dict.dashboard.noAgentsSubtitle}
                      </p>
                      <Link
                        href="/agents"
                        className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-400"
                      >
                        <Plus size={16} />
                        {dict.dashboard.browseAgents}
                      </Link>
                    </>
                  ) : (
                    <>
                      <p className="text-base font-bold text-white">
                        {dict.dashboard.dashboardUnavailable}
                      </p>
                      <p className="mx-auto mt-2 max-w-sm text-sm text-neutral-400">
                        {dict.dashboard.dashboardUnavailableDesc}
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {installed.map(({ agent, slug, status, runs, tokens, lastRun, runtimeName, config }) => {
                    const displayName =
                      agent?.shortName ?? runtimeName ?? slug;
                    const category = agent?.category ?? "Agent";
                    const accent = agent?.accent ?? "bg-neutral-700";
                    const active = status === "active";
                    const cancelsAtPeriodEnd =
                      (config as Record<string, unknown> | undefined)
                        ?.cancelAtPeriodEnd === true;
                    return (
                      <div
                        key={slug}
                        className="grid gap-4 p-5 lg:grid-cols-[1fr_120px_120px_120px_110px] lg:items-center"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-11 w-11 items-center justify-center rounded-lg ${accent}`}
                          >
                            {agent ? (
                              <AgentIcon
                                icon={agent.icon}
                                brand={agent.brand}
                                size={21}
                                className="text-white"
                              />
                            ) : (
                              <span className="text-white text-sm font-bold">
                                {slug.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div>
                            <Link
                              href={`/agents/${slug}`}
                              className="font-bold text-white transition-colors hover:text-brand-400"
                            >
                              {displayName}
                            </Link>
                            <p className="text-sm text-neutral-500">
                              {category}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`w-fit rounded-full px-2.5 py-1 text-xs font-bold ${
                            cancelsAtPeriodEnd
                              ? "bg-amber-500/20 text-amber-300"
                              : active
                                ? "bg-purple-500/20 text-purple-300"
                                : "bg-neutral-800 text-neutral-400"
                          }`}
                        >
                          {cancelsAtPeriodEnd
                            ? dict.dashboard.cancelsAtPeriodEnd
                            : active
                              ? dict.dashboard.active
                              : status}
                        </span>
                        <p className="text-sm font-bold text-white">
                          {t(dict.dashboard.runs, { count: runs })}
                        </p>
                        <p className="text-sm font-bold text-white">
                          {t(dict.dashboard.tokens, { count: formatTokens(tokens) })}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-neutral-400">
                          <Clock3 size={15} />
                          {timeAgo(lastRun, dict)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <aside className="space-y-6">
              <div className="rounded-lg border border-white/5 bg-neutral-900 p-5 shadow-sm">
                <h2 className="text-xl font-bold text-white">
                  {dict.dashboard.monthlyUsage}
                </h2>
                {installed.length === 0 ? (
                  <p className="mt-4 text-sm leading-6 text-neutral-400">
                    {dbAvailable
                      ? dict.dashboard.usageEmpty
                      : dict.dashboard.usageEmptyDesc}
                  </p>
                ) : (
                  <div className="mt-4 space-y-4">
                    {installed.map(
                      ({ agent, slug, tokens, status, runtimeName, config }) => {
                        const displayName =
                          agent?.shortName ?? runtimeName ?? slug;
                        const limit = resolveTokenLimit(
                          (config ?? {}) as Record<string, unknown>,
                        );
                        const overageTokens = Math.max(0, tokens - limit);
                        const overage = overageTokens > 0;
                        const pct = Math.min(100, (tokens / limit) * 100);
                        return (
                          <div key={slug}>
                            <div className="mb-1.5 flex items-center justify-between text-sm">
                              <span className="font-semibold text-neutral-300">
                                {displayName}
                              </span>
                              <span
                                className={overage ? "text-red-400" : "text-neutral-500"}
                              >
                                {formatTokens(tokens)}/{status === "active" ? formatTokens(limit) : "—"} tok
                                {overage && t(dict.dashboard.overageAmount, { count: formatTokens(overageTokens) })}
                              </span>
                            </div>
                          <div className="h-2 overflow-hidden rounded-full bg-neutral-800">
                            <div
                              className={`h-full rounded-full ${
                                overage
                                  ? "bg-red-500"
                                  : pct >= 80
                                    ? "bg-amber-500"
                                    : "bg-brand-500"
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          {overage && (
                            <p className="mt-1 text-xs text-red-400">
                              {t(dict.dashboard.aboveAllowance, { rate: overageRateDisplay })}{" "}
                              {t(dict.dashboard.overageThisMonth, {
                                amount: (calculateOverageAmountCents(overageTokens) / 100)
                                  .toFixed(2)
                                  .replace(".", ","),
                              })}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-white/5 bg-linear-to-br from-neutral-900 to-neutral-950 p-5 text-white shadow-sm">
                <Power size={20} className="mb-4 text-purple-400" />
                <h2 className="text-xl font-bold">{dict.dashboard.controlCenter}</h2>
                <p className="mt-2 text-sm leading-6 text-neutral-400">
                  {t(dict.dashboard.controlCenterDesc, { rate: overageRateDisplay })}
                </p>

                <div className="mt-5 space-y-3 border-t border-white/5 pt-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                    {dict.dashboard.gettingStarted}
                  </p>
                  {dict.dashboard.gettingStartedSteps.map((label, i) => (
                    <Link
                      key={label}
                      href={i < 3 ? "/agents" : "/dashboard"}
                      className="flex items-center gap-3 rounded-lg bg-white/5 px-3.5 py-3 text-sm transition-colors hover:bg-white/10"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-xs font-bold text-purple-400">
                        {i + 1}
                      </span>
                      <span className="text-neutral-300">{label}</span>
                    </Link>
                  ))}
                </div>

                <Link
                  href="/api/billing/portal"
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-white/5 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white/10"
                >
                  <CreditCard size={15} />
                  {dict.dashboard.manageSubscription}
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
