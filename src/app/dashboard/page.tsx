import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/supabase/server";
import ShopifyConnect from "@/components/ShopifyConnect";
import GoogleConnect from "@/components/GoogleConnect";
import { TENANT_SHOPIFY_ID, listShopifyConnections } from "@/lib/shopify/connections";
import { TENANT_GOOGLE_ID, getGoogleConnectionSummary } from "@/lib/google/connections";
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
import DashboardShell from "@/components/DashboardShell";
import DashboardCharts from "@/components/DashboardCharts";
import DashboardExportBar from "@/components/DashboardExportBar";
import Footer from "@/components/Footer";
import AgentIcon from "@/components/AgentIcon";
import { AGENTS, localizeAgent } from "@/lib/agents";
import { getAgentRuntimeConfig } from "@/lib/agents/registry";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary, t } from "@/lib/i18n/dictionaries";

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

// Timestamp ISO di `days` giorni fa. La lettura dell'orologio vive qui, fuori
// dal render del server component: `Date.now()` in un componente è impuro
// (react-hooks/purity), in un helper a livello modulo è una normale utility.
function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

// Dashboard: server component che legge i dati reali dell'utente (agenti
// installati, run e token del mese) con Supabase service-role e li mostra in
// card e grafici. Gli admin via codice (false) vedono la pagina ma senza
// letture/scritture sul DB.
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

  // Sessione Supabase: l'utente viene risolto lato server dai cookie.
  // L'admin via codice (hasPlatformAccess) ora si comporta come utente reale
  // con identità condivisa __tenant__, così dashboard, grafici e usage sono
  // testabili senza differenze.
  const user = await getSessionUser();
  const effectiveUserId = user?.id ?? null;
  const userId = effectiveUserId;

  // ── Dati reali (service-role, lato server) — anche per il mock admin
  const db = createAdminClient();
  let installed: InstalledAgent[] = [];
  let totalRuns = 0;
  let totalTokens = 0;
  let dbAvailable = false;

  if (db && userId) {
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

  const fullName = false
    ? "Admin"
    : typeof user?.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : "";
  const firstName = false
    ? "Admin"
    : fullName.split(" ")[0] || (user?.email ?? "").split("@")[0];
  const greeting = firstName
    ? t(dict.dashboard.welcomeBack, { name: firstName })
    : dict.dashboard.welcomeBackGeneric;
  const email = user?.email ?? "";

  const shopifyOwnerForConnections = false ? user?.id ?? null : user?.id ?? null;
  const googleOwnerForConnections = false ? user?.id ?? null : user?.id ?? null;
  const shopifyConnections = shopifyOwnerForConnections
    ? await listShopifyConnections(shopifyOwnerForConnections).catch(() => [])
    : [];
  const googleConnection = googleOwnerForConnections
    ? await getGoogleConnectionSummary(googleOwnerForConnections).catch(() => null)
    : null;
  const googleConfigured = Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
  );

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

  // ── Grafici: bucket giornalieri degli ultimi 7 giorni + costi ─────────
  // Costruisce i bucket giornalieri (7 giorni) a partire dalle run del mese
  // (se il DB è disponibile), con una leggera aggregazione in memoria; se non
  // ci sono run il grafico mostra lo stato vuoto.
  let dailyBuckets: Array<{ label: string; date: string; runs: number; tokens: number }> = [];
  let overageCentsTotal = 0;
  if (dbAvailable) {
    // Verrà popolato dopo il fetch delle run qui sopra; segnaposto così
    // TypeScript conosce la forma. I dailyBuckets reali sono calcolati sotto
    // con una seconda query sugli ultimi 7 giorni esatti.
  }

  // Fetch delle run degli ultimi 7 giorni per i grafici (indipendente dalle
  // statistiche mensili)
  let chartRuns: Array<{ started_at: string | null; input_tokens: number | null; output_tokens: number | null }> = [];
  if (db && userId) {
    const sevenDaysAgo = isoDaysAgo(7);
    const { data } = await db
      .from("agent_runs")
      .select("started_at, input_tokens, output_tokens")
      .eq("user_id", userId)
      .gte("started_at", sevenDaysAgo);
    chartRuns = (data ?? []) as typeof chartRuns;
  }

  const dayLabels = locale === "it"
    ? ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"]
    : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Costruisce la mappa YYYY-MM-DD -> {runs, tokens}
  const byDay = new Map<string, { runs: number; tokens: number }>();
  for (const r of chartRuns) {
    if (!r.started_at) continue;
    const key = new Date(r.started_at).toISOString().slice(0, 10);
    const cur = byDay.get(key) ?? { runs: 0, tokens: 0 };
    cur.runs += 1;
    cur.tokens += (r.input_tokens || 0) + (r.output_tokens || 0);
    byDay.set(key, cur);
  }
  dailyBuckets = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    const agg = byDay.get(key) ?? { runs: 0, tokens: 0 };
    return {
      date: key,
      label: dayLabels[d.getDay()],
      runs: agg.runs,
      tokens: agg.tokens,
    };
  });



  // ── Preview con dati falsi ──────────────────────────────────────────
  // Quando non ci sono dati reali (nuovo utente / mock admin appena creato),
  const displayInstalled = installed;
  const displayTotalRuns = totalRuns;
  const displayTotalTokens = totalTokens;
  const displayDailyBuckets = dailyBuckets;
  const displayOverageCents = overageCentsTotal;
  const previewBanner = false;

  const displayStatCards: Array<[string, string, typeof Zap]> = [
        [String(displayInstalled.length), dict.dashboard.statInstalledAgents, Zap],
        [formatCount(displayTotalRuns), dict.dashboard.statRunsThisMonth, Activity],
        [formatCount(displayTotalTokens), dict.dashboard.statTokensUsed, CheckCircle2],
        [String(displayInstalled.filter((a) => a.status === "active").length), dict.dashboard.statActiveAgents, AlertCircle],
      ];

  return (
    <DashboardShell email={email}>
      <section className="px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl 3xl:max-w-[1720px]">
          <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-4 flex items-center gap-2">
                <Activity size={13} className="text-brand-400" />
                <span className="text-xs font-bold uppercase tracking-[0.08em] text-brand-400">
                  {dict.dashboard.myAgents}
                </span>
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
                {greeting}
              </h1>
              <p className="mt-2 text-sm text-neutral-500">{email}</p>
              <p className="mt-2 max-w-2xl text-lg leading-8 text-neutral-400">
                {dict.dashboard.tagline}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/agents"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-500 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-400"
              >
                <Plus size={16} />
                {dict.dashboard.installAgent}
              </Link>
            </div>
          </div>

          {billing === "error" && (
            <div className="mb-8 flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-300">
              <AlertCircle size={16} className="shrink-0" />
              {dict.dashboard.billingError}
            </div>
          )}

          {previewBanner && (
            <div className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3">
              <p className="text-sm font-semibold text-amber-200">
                {locale === "it"
                  ? "Anteprima con dati di esempio — così apparirà la tua dashboard con agenti attivi. I dati reali sostituiranno questa preview al primo utilizzo."
                  : "Preview with sample data — this is how your dashboard will look with active agents. Real data will replace this preview after first use."}
              </p>
              <span className="shrink-0 rounded-full bg-amber-500/20 px-2.5 py-1 text-xs font-bold text-amber-300">Preview</span>
            </div>
          )}

          <div className="mb-8 grid gap-4 md:grid-cols-4">
            {displayStatCards.map(([value, label, Icon]) => (
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

          <ShopifyConnect
            connected={shopifyConnections.map((c) => ({
              shopDomain: c.shopDomain,
              connected: c.connected,
            }))}
          />

          <GoogleConnect
            connected={googleConnection}
            s={dict.dashboard}
            locale={locale}
            configured={googleConfigured}
          />

          {/* Grafici e costi — in preview mostra dati falsi realistici */}
          <div className="mb-8">
            <DashboardCharts
              daily={displayDailyBuckets}
              totalTokens={displayTotalTokens}
              totalRuns={displayTotalRuns}
              estimatedCostCents={displayOverageCents}
              overageCents={displayOverageCents}
              locale={locale}
            />
            <div className="mt-4">
              <DashboardExportBar
                agentName={displayInstalled[0]?.slug || "AgentCloud"}
                agentSlug={displayInstalled[0]?.slug || "agent"}
                totalRuns={displayTotalRuns}
                totalTokens={displayTotalTokens}
                estimatedCostCents={displayOverageCents}
                daily={displayDailyBuckets}
              />
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="rounded-lg border border-white/5 bg-neutral-900 shadow-sm">
              <div className="border-b border-white/5 p-5">
                <h2 className="text-xl font-bold text-white">
                  {dict.dashboard.installedAgents}
                </h2>
              </div>

              {displayInstalled.length === 0 ? (
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
                <div className="divide-y divide-white/5 max-md:space-y-3 max-md:divide-none max-md:p-3">
                  {displayInstalled.map(({ agent, slug, status, runs, tokens, lastRun, runtimeName, config }) => {
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
                        className="grid gap-4 p-5 lg:grid-cols-[1fr_120px_120px_120px_110px] lg:items-center max-md:rounded-lg max-md:border max-md:border-white/5 max-md:bg-neutral-900/50"
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
                {displayInstalled.length === 0 ? (
                  <p className="mt-4 text-sm leading-6 text-neutral-400">
                    {dbAvailable
                      ? dict.dashboard.usageEmpty
                      : dict.dashboard.usageEmptyDesc}
                  </p>
                ) : (
                  <div className="mt-4 space-y-4">
                    {(() => {
                      const maxTokens = Math.max(1, ...displayInstalled.map((a) => a.tokens));
                      return displayInstalled.map(({ agent, slug, tokens, runs, runtimeName }) => {
                        const displayName = agent?.shortName ?? runtimeName ?? slug;
                        const pct = Math.min(100, (tokens / maxTokens) * 100);
                        return (
                          <div key={slug}>
                            <div className="mb-1.5 flex items-center justify-between text-sm">
                              <span className="font-semibold text-neutral-300">{displayName}</span>
                              <span className="text-neutral-500">{formatTokens(tokens)} tok · {runs} run</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-neutral-800">
                              <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-white/5 bg-linear-to-br from-neutral-900 to-neutral-950 p-5 text-white shadow-sm">
                <Power size={20} className="mb-4 text-purple-400" />
                <h2 className="text-xl font-bold">{dict.dashboard.controlCenter}</h2>
                <p className="mt-2 text-sm leading-6 text-neutral-400">
                  {dict.dashboard.controlCenterDesc}
                </p>

                <p className="mt-3 text-sm leading-6 text-neutral-400">
                  {dict.dashboard.gettingStartedIntro}
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
    </DashboardShell>
  );
}
