import Link from "next/link";
import { Activity, CheckCircle2, Clock3, Loader2, XCircle } from "lucide-react";
import AgentIcon from "./AgentIcon";
import { localizeAgent, getAgentBySlug, type Agent } from "@/lib/agents";
import type { Locale } from "@/lib/i18n/constants";
import { getDictionary, t } from "@/lib/i18n/dictionaries";

/**
 * "Attività recente" della dashboard.
 *
 * Dati REALI, non mock: una riga per ogni voce di `agent_runs` dell'utente,
 * letta con la service-role lato server (vedi `dashboard/page.tsx`). Ogni riga
 * porta agente, stato, durata, token e quando è successo.
 */

export type RecentRun = {
  id: string;
  slug: string;
  status: string | null;
  inputTokens: number;
  outputTokens: number;
  startedAt: string | null;
  finishedAt: string | null;
};

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

/** Durata compatta e neutrale rispetto alla lingua: "8s", "1m 05s". */
function formatDuration(startedAt: string | null, finishedAt: string | null): string | null {
  if (!startedAt || !finishedAt) return null;
  const ms = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${String(seconds % 60).padStart(2, "0")}s`;
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

type StatusView = {
  label: string;
  className: string;
  Icon: typeof CheckCircle2;
};

export default function RecentActivity({
  runs,
  locale,
}: {
  runs: RecentRun[];
  locale: Locale;
}) {
  const dict = getDictionary(locale);
  const { dashboard } = dict;

  const statusOf = (status: string | null): StatusView => {
    const key = (status ?? "").toLowerCase();
    if (key === "error" || key === "failed") {
      return { label: dashboard.statusFailed, className: "bg-red-500/15 text-red-300", Icon: XCircle };
    }
    if (key === "running" || key === "pending") {
      return { label: dashboard.statusRunning, className: "bg-amber-500/15 text-amber-300", Icon: Loader2 };
    }
    return { label: dashboard.statusCompleted, className: "bg-emerald-500/15 text-emerald-300", Icon: CheckCircle2 };
  };

  return (
    <section
      data-onboard="dashboard-recent-activity"
      className="mt-6 rounded-lg border border-white/5 bg-neutral-900 shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 p-5">
        <div>
          <div className="mb-1.5 flex items-center gap-2">
            <Activity size={13} className="text-brand-400" />
            <h2 className="text-xl font-bold text-white">{dashboard.recentActivity}</h2>
          </div>
          <p className="text-sm text-neutral-500">{dashboard.recentActivitySubtitle}</p>
        </div>
        {runs.length > 0 && (
          <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-bold text-neutral-400">
            {t(dashboard.runs, { count: runs.length })}
          </span>
        )}
      </div>

      {runs.length === 0 ? (
        <div className="p-10 text-center">
          <p className="text-base font-bold text-white">{dashboard.noActivityTitle}</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-neutral-400">
            {dashboard.noActivitySubtitle}
          </p>
          <Link
            href="/agents"
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-400"
          >
            {dashboard.browseAgents}
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-white/5 max-md:space-y-3 max-md:divide-none max-md:p-3">
          {runs.map((run) => {
            const catalog = getAgentBySlug(run.slug);
            const agent: Agent | null = catalog ? localizeAgent(catalog, locale) : null;
            const displayName = agent?.shortName ?? run.slug;
            const accent = agent?.accent ?? "bg-neutral-700";
            const { label, className, Icon } = statusOf(run.status);
            const duration = formatDuration(run.startedAt, run.finishedAt);
            const tokens = run.inputTokens + run.outputTokens;

            return (
              <div
                key={run.id}
                className="grid gap-3 p-5 lg:grid-cols-[1fr_130px_110px_110px_150px] lg:items-center max-md:rounded-lg max-md:border max-md:border-white/5 max-md:bg-neutral-900/50"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${accent}`}
                  >
                    {agent ? (
                      <AgentIcon
                        icon={agent.icon}
                        brand={agent.brand}
                        size={19}
                        className="text-white"
                      />
                    ) : (
                      <span className="text-sm font-bold text-white">
                        {run.slug.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <Link
                      href={`/agents/${run.slug}`}
                      className="truncate font-bold text-white transition-colors hover:text-brand-400"
                    >
                      {displayName}
                    </Link>
                    <p className="truncate text-sm text-neutral-500">{run.slug}</p>
                  </div>
                </div>

                <span
                  className={`w-fit rounded-full px-2.5 py-1 text-xs font-bold ${className}`}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Icon size={12} className={label === dashboard.statusRunning ? "animate-spin" : undefined} />
                    {label}
                  </span>
                </span>

                <p className="text-sm font-bold text-white">
                  {t(dashboard.tokens, { count: formatTokens(tokens) })}
                </p>

                <p className="text-sm text-neutral-400">{duration ?? "—"}</p>

                <div className="flex items-center gap-2 text-sm text-neutral-400">
                  <Clock3 size={15} />
                  {timeAgo(run.startedAt, dict)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}