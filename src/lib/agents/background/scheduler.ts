/**
 * Scheduler degli `agent_schedules` (Fase 3).
 *
 * Chiamata a ogni tick del worker (cron di Cloudflare ogni minuto): trova gli
 * schedule `active` con `next_run_at <= now()`, crea run + job (Fase 2 già
 * fornisce `createBackgroundRun`) e avanza `next_run_at`.
 *
 * Anti-doppio-tick: l'avanzamento di `next_run_at` è un CAS — l'UPDATE porta
 * `where next_run_at = <valore letto>`, quindi due tick che leggono lo stesso
 * valore vedono `0 righe aggiornate` uno dei due e lo schedule non genera due
 * run per lo stesso scatto. Un solo job attivo per run arriva anche dal
 * vincolo `uq_agent_jobs_active_run` (Fase 1).
 *
 * Un fallimento di `createBackgroundRun` NON blocca l'avanzamento: lo
 * schedule sale al suo prossimo scatto e la perdita resta nei log. L'uni-
 * ca eccezione è il cron diventato illeggibile (dato corrotto a mano): lo
 * schedule viene messo in `paused` invece di girare agli infiniti tick.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import type { AgentScheduleRow } from "@/types/agents-db";
import { nextRuns } from "@/lib/agents/cron";
import { createBackgroundRun } from "./enqueue";
import { maskSecrets } from "./mask";
import { sendSchedulePausedEmail } from "./schedule-email";

export type SchedulerScanResult = {
  /** Schedule esaminati (dove next_run_at era scaduto). */
  considered: number;
  /** Run creati con successo. */
  scheduled: number;
  /** Schedule avviati ma con creazione run fallita. */
  errors: number;
  /** Prima occorrenza futura più vicina tra gli schedule avviati (debug). */
  msToNextTickHint: number | null;
};

export async function scanSchedules(
  now: Date = new Date(),
): Promise<SchedulerScanResult> {
  const client = createAdminClient();
  const result: SchedulerScanResult = {
    considered: 0,
    scheduled: 0,
    errors: 0,
    msToNextTickHint: null,
  };
  if (!client) return result;

  let schedules: (AgentScheduleRow & { next_run_at: string | null })[];
  try {
    const { data, error } = await client
      .from("agent_schedules")
      .select("*")
      .eq("status", "active")
      .lte("next_run_at", now.toISOString())
      .order("next_run_at")
      .limit(50); // tetto difensivo: un tick smaltisce al più 50 spawn
    if (error) {
      console.error("scheduler: lettura schedules fallita", error.message);
      return result;
    }
    schedules = (data ?? []) as AgentScheduleRow[];
  } catch (err) {
    console.error("scheduler: lettura schedules eccezione", String(err));
    return result;
  }

  for (const schedule of schedules) {
    result.considered += 1;

    // Prossima occorrenza DOPO lo scatto appena avvenuto (non dopo "ora",
    // altrimenti un tick in ritardo salterebbe una finestra). Con
    // currentDate = scatto, la prima occorrenza ritornata è ≥ scatto.
    let upcoming: string[];
    try {
      upcoming = nextRuns(schedule.cron, schedule.timezone, 2, now);
    } catch {
      // Cron non più interpretabile (dato corrotto a mano): pausa lo
      // schedule invece di girare agli infiniti tick con lo stesso errore.
      await client
        .from("agent_schedules")
        .update({ status: "paused" })
        .eq("id", schedule.id);
      result.errors += 1;
      continue;
    }

    // CAS di rivendicazione: scala lo schedule solo se `next_run_at` è
    // ancora il valore letto (nessuno scatto doppio tra tick paralleli).
    let claimed = false;
    try {
      const { data, error } = await client
        .from("agent_schedules")
        .update({
          next_run_at: upcoming[0],
          last_run_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq("id", schedule.id)
        .eq("status", "active")
        .eq("next_run_at", schedule.next_run_at as string)
        .select("id");
      claimed = !error && (data?.length ?? 0) > 0;
    } catch {
      claimed = false;
    }
    if (!claimed) continue;

    // Spawn del run (le istruzioni viaggiano copiate nel run: modificare lo
    // schedule NON cambia i run già accodati, e il Replay resta fedele).
    const created = await createBackgroundRun({
      tenantId: schedule.tenant_id,
      agentSlug: schedule.agent_slug,
      istruzioni: schedule.instructions,
      trigger: "schedule",
      scheduleId: schedule.id,
    });
    if (created.ok) {
      result.scheduled += 1;
    } else {
      result.errors += 1;
      console.error(
        `scheduler: spawn run fallito schedule=${schedule.id}:`,
        maskSecrets(created.message),
      );
    }
  }
  return result;
}

/** Fail-uri consecutivi di uno schedule prima della pausa automatica (Fase 7). */
export const SCHEDULE_PAUSED_AFTER_FAILURES = 3;

/**
 * Aggiorna `consecutive_failures` dello schedule che ha prodotto il run.
 * Successo → reset; fallimento → incremento e, alla soglia, AUTO-PAUSA
 * dello schedule + email Resend best-effort (D2 visione: pausa pulita,
 * l'utente la riattiva dopo aver letto l'errore nel Replay).
 */
export async function handleScheduleOutcome(
  runId: string,
  outcome: "succeeded" | "failed",
  errore?: string | null,
): Promise<void> {
  const client = createAdminClient();
  if (!client) return;
  try {
    const { data: run } = (await client
      .from("agent_runs")
      .select("schedule_id, user_id, agent_slug")
      .eq("id", runId)
      .maybeSingle()) as {
      data: {
        schedule_id: string | null;
        user_id: string;
        agent_slug: string;
      } | null;
    };
    if (!run?.schedule_id) return;

    if (outcome === "succeeded") {
      await client
        .from("agent_schedules")
        .update({ consecutive_failures: 0 })
        .eq("id", run.schedule_id);
      return;
    }

    const { data: schedule } = (await client
      .from("agent_schedules")
      .select("consecutive_failures, name")
      .eq("id", run.schedule_id)
      .maybeSingle()) as {
      data: { consecutive_failures: number; name: string } | null
    };
    const failures = (schedule?.consecutive_failures ?? 0) + 1;
    const pause = failures >= SCHEDULE_PAUSED_AFTER_FAILURES;
    await client
      .from("agent_schedules")
      .update({
        consecutive_failures: failures,
        ...(pause ? { status: "paused" as const } : {}),
      })
      .eq("id", run.schedule_id);
    if (pause) {
      await sendSchedulePausedEmail({
        userId: run.user_id,
        scheduleName: schedule?.name ?? "Elemento pianificato",
        agentSlug: run.agent_slug,
        failures,
        errore: errore ?? null,
      });
    }
  } catch {
    // best-effort: la contabilità dei fallimenti non deve mai far fallire il run
  }
}

/**
 * Retention (D9): pulizia dei payload vecchi. `agent_run_steps` si cancella
 * a 30 giorni; i run terminali oltre 90 giorni scompaiono del tutto (buffer
 * extra di 2 mesi rispetto alla somma billing, che per costruzione guarda
 * solo il periodo in corso).
 *
 * Chiamata a spizzico dal worker tick (~5% dei tick) per non moltiplicare
 * i costi di query su un cron che scatta ogni minuto.
 */
export async function purgeExpiredRuns(): Promise<void> {
  const client = createAdminClient();
  if (!client) return;
  try {
    const stepsCutoff = new Date(
      Date.now() - 30 * 24 * 3_600_000,
    ).toISOString();
    await client
      .from("agent_run_steps")
      .delete()
      .lt("created_at", stepsCutoff);

    const runsCutoff = new Date(
      Date.now() - 90 * 24 * 3_600_000,
    ).toISOString();
    await client
      .from("agent_runs")
      .delete()
      .in("status", ["succeeded", "failed", "cancelled", "completed"])
      .lt("finished_at", runsCutoff);
  } catch {
    // best-effort
  }
}
