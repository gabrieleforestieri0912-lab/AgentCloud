import { redirect } from "next/navigation";
import { getSessionUser, createClient } from "@/lib/supabase/server";
import DashboardShell from "@/components/DashboardShell";
import RunsLiveRefresher from "@/components/RunsLiveRefresher";
import RunsStatusBadge, { runStatusLabel } from "@/components/RunsStatusBadge";
import RunReplay from "@/components/RunReplay";
import { accountIdentityFromUser } from "@/lib/account-identity";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { maskJson, maskSecrets } from "@/lib/agents/background/mask";
import type { AgentRunRow, AgentRunStepRow } from "@/types/agents-db";
import Link from "next/link";

/**
 * Run Replay (Fase 5): il dettaglio di un run — stato, budget, esito, la
 * catena multi-run (parent/figli) e la timeline dei passi navigabile. La
 * pagina è server: la mascheratura dei payload è ricontrollata qui (già
 * applicata alla scrittura in mask.ts — doppia difesa) e la realtime
 * aggiorna solo tramite RunsLiveRefresher.
 */
export default async function RunDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    redirect("/dashboard/runs");
  }

  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const t = dict.agentRuns;
  const client = await createClient();

  const [{ data: run }, { data: steps }, { data: children }] = await Promise.all([
    client.from("agent_runs").select("*").eq("id", id).eq("user_id", user.id).maybeSingle(),
    client
      .from("agent_run_steps")
      .select("*")
      .eq("run_id", id)
      .eq("tenant_id", user.id)
      .order("indice"),
    client
      .from("agent_runs")
      .select("id, agent_slug, status, trigger, started_at")
      .eq("parent_run_id", id)
      .eq("user_id", user.id)
      .order("started_at"),
  ]);

  if (!run) redirect("/dashboard/runs");

  const runRow = run as AgentRunRow;
  const stepRows = (steps ?? []).map((s) => {
    const row = s as AgentRunStepRow;
    // Doppia difesa: anche se un dato legacy fosse uscito non mascherato,
    // niente payload sensibile arriva nel markup.
    return {
      ...row,
      input: row.input ? (maskJson(row.input) as Record<string, unknown>) : null,
      output: row.output ? maskSecrets(row.output) : null,
    };
  });
  const childRows = (children ?? []) as Array<Pick<AgentRunRow, "id" | "agent_slug" | "status" | "trigger" | "started_at">>;

  const duration =
    runRow.started_at && runRow.finished_at
      ? Math.max(0, new Date(runRow.finished_at).getTime() - new Date(runRow.started_at).getTime())
      : null;
  const durationText = duration
    ? duration < 1000
      ? `${duration} ms`
      : `${(duration / 1000).toFixed(1)} s`
    : "—";

  return (
    <DashboardShell email={user?.email ?? ""} account={accountIdentityFromUser(user)}>
      <RunsLiveRefresher runId={id} />
      <div className="mx-auto w-full max-w-5xl px-4 pb-24 sm:px-6 lg:px-8">
        <header className="pt-10 pb-6 sm:pt-14">
          <Link
            href="/dashboard/runs"
            className="text-xs font-semibold text-neutral-500 hover:text-neutral-300"
          >
            ← {t.title}
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <RunsStatusBadge status={runRow.status} label={runStatusLabel(t, runRow.status)} />
            <h1 className="text-xl font-bold tracking-tight text-white">{runRow.agent_slug}</h1>
            <span className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-[11px] font-semibold text-neutral-400">
              {runRow.trigger === "manual"
                ? t.triggerManual
                : runRow.trigger === "schedule"
                  ? t.triggerSchedule
                  : t.triggerDelegation}
            </span>
          </div>

          {/* istruzioni */}
          {runRow.istruzioni && (
            <div className="mt-4 rounded-2xl border border-white/[0.08] bg-neutral-900/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                {t.instructions}
              </p>
              <p className="mt-1.5 whitespace-pre-wrap text-sm text-neutral-300">
                {runRow.istruzioni}
              </p>
            </div>
          )}

          {/* metriche */}
          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              [t.tokens, `${runRow.input_tokens ?? 0} ▲ ${runRow.output_tokens ?? 0} ▼`],
              [t.credits, String(runRow.crediti_usati)],
              [t.toolCalls, String(runRow.tool_calls ?? 0)],
              [t.duration, durationText],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3"
              >
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                  {label}
                </dt>
                <dd className="mt-0.5 text-sm font-bold text-white">{value}</dd>
              </div>
            ))}
          </dl>

          {/* errore */}
          {runRow.errore && (
            <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              <span className="font-semibold">{t.errore}:</span> {maskSecrets(runRow.errore)}
            </p>
          )}

          {/* parent */}
          {runRow.parent_run_id && (
            <p className="mt-3 text-xs text-neutral-500">
              {t.parent}:{" "}
              <Link
                href={`/dashboard/runs/${runRow.parent_run_id}`}
                className="text-brand-300 underline hover:text-brand-200"
              >
                {runRow.parent_run_id.slice(0, 8)}…
              </Link>
            </p>
          )}

          {/* figli (catena multi-run, Fase 6 li popolerà) */}
          {childRows.length > 0 && (
            <section className="mt-4">
              <h2 className="text-sm font-bold text-white">{t.children}</h2>
              <ul className="mt-2 space-y-1.5">
                {childRows.map((child) => (
                  <li key={child.id} className="flex flex-wrap items-center gap-2 text-xs">
                    <RunsStatusBadge status={child.status} label={runStatusLabel(t, child.status)} />
                    <span className="font-semibold text-neutral-300">{child.agent_slug}</span>
                    <Link
                      href={`/dashboard/runs/${child.id}`}
                      className="text-brand-300 underline hover:text-brand-200"
                    >
                      {child.id.slice(0, 8)}…
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </header>

        <RunReplay steps={stepRows} />
      </div>
    </DashboardShell>
  );
}
