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
