import { redirect } from "next/navigation";
import { getSessionUser, createClient } from "@/lib/supabase/server";
import DashboardShell from "@/components/DashboardShell";
import RunsLiveRefresher from "@/components/RunsLiveRefresher";
import RunsStatusBadge, { runStatusLabel } from "@/components/RunsStatusBadge";
import { accountIdentityFromUser } from "@/lib/account-identity";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { AgentRunRow } from "@/types/agents-db";
import Link from "next/link";

/**
 * Mission Control (Fase 5): la lista dei run in background del tenant, con
 * stato in diretta (realtime → refresher), token/crediti e accesso al Replay
 * passo-passo. Server component: una sola query, 50 run recenti.
 */
export default async function RunsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const t = dict.agentRuns;
  const client = await createClient();
  const { data } = await client
    .from("agent_runs")
    .select(
      "id, agent_slug, status, trigger, input_tokens, output_tokens, tool_calls, crediti_usati, started_at, finished_at, errore, istruzioni"
    )
    .eq("user_id", user.id)
    .order("started_at", { ascending: false, nullsFirst: false })
    .limit(50);

  const runs = (data ?? []) as AgentRunRow[];

  return (
    <DashboardShell email={user?.email ?? ""} account={accountIdentityFromUser(user)}>
      <RunsLiveRefresher />
      <div className="mx-auto w-full max-w-5xl px-4 pb-24 sm:px-6 lg:px-8">
        <header className="pt-10 pb-8 sm:pt-14">
          <h1 className="text-2xl font-bold tracking-tight text-white">{t.title}</h1>
          <p className="mt-1 max-w-xl text-sm text-neutral-400">{t.subtitle}</p>
        </header>

        {runs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.02] px-6 py-14 text-center">
            <p className="text-sm font-semibold text-neutral-300">{t.empty}</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-neutral-500">{t.emptyHint}</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {runs.map((run) => (
              <li
                key={run.id}
                className="rounded-2xl border border-white/[0.08] bg-neutral-900/50 p-5 transition-all hover:border-white/[0.14]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <RunsStatusBadge status={run.status} label={runStatusLabel(t, run.status)} />
                      <span className="text-sm font-semibold text-white">{run.agent_slug}</span>
                      <span className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-[11px] font-semibold text-neutral-400">
                        {run.trigger === "manual"
                          ? t.triggerManual
                          : run.trigger === "schedule"
                            ? t.triggerSchedule
                            : run.trigger === "delegation"
                              ? t.triggerDelegation
                              : run.trigger}
                      </span>
                    </div>
                    {run.istruzioni && (
                      <p className="mt-1.5 max-w-xl truncate text-xs text-neutral-500">
                        {run.istruzioni}
                      </p>
                    )}
                    {run.errore && (
                      <p className="mt-1.5 max-w-xl truncate text-xs text-red-300">{run.errore}</p>
                    )}
                    <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-neutral-400">
                      <div className="flex gap-1.5">
                        <dt className="text-neutral-500">{t.tokens}:</dt>
                        <dd className="text-neutral-300">
                          {run.input_tokens ?? 0} ▲ {run.output_tokens ?? 0} ▼
                        </dd>
                      </div>
                      <div className="flex gap-1.5">
                        <dt className="text-neutral-500">{t.credits}:</dt>
                        <dd className="text-neutral-300">{run.crediti_usati}</dd>
                      </div>
                      <div className="flex gap-1.5">
                        <dt className="text-neutral-500">{t.toolCalls}:</dt>
                        <dd className="text-neutral-300">{run.tool_calls ?? 0}</dd>
                      </div>
                      {run.started_at && (
                        <div className="flex gap-1.5">
                          <dt className="text-neutral-500">{t.started}:</dt>
                          <dd className="text-neutral-300">
                            {new Date(run.started_at).toLocaleString(locale)}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>
                  <Link
                    href={`/dashboard/runs/${run.id}`}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-brand-400"
                  >
                    {t.open}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DashboardShell>
  );
}
