/**
 * Accesso ai dati dei run background (Fase 2) con il client service-role.
 *
 * Regole del modulo: nessuna funzione lancia eccezioni — ogni chiamata
 * restituisce un esito tipizzato, perché il worker deve poter mappare ogni
 * fallimento su uno stato del job senza mai perdere il thread. Le scritture
 * sensibili sono "guardate": `finishRun` e `setRunQueued` partono solo dallo
 * stato atteso, così due worker che si incrociano non sovrascrivono un run
 * già terminato.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import type {
  AgentJobRow,
  AgentRunRow,
  AgentRunStepRow,
  AgentRunStepType,
} from "@/types/agents-db";

/** Stati di run da cui NON si torna indietro. */
export const TERMINAL_RUN_STATUSES = new Set([
  "succeeded",
  "failed",
  "cancelled",
  // 'completed' è lo stato legacy della chat live (D13).
  "completed",
]);

export type RunTotals = {
  input_tokens: number;
  output_tokens: number;
  tool_calls: number;
  crediti_usati: number;
};

export type NewStep = {
  runId: string;
  tenantId: string;
  indice: number;
  tipo: AgentRunStepType;
  input?: Record<string, unknown> | null;
  output?: string | null;
  toolName?: string | null;
  durataMs?: number | null;
  crediti?: number;
};

export type InsertStepResult =
  | { ok: true; row: AgentRunStepRow }
  | { ok: false; reason: "duplicate" | "db_unavailable" | string };

function db() {
  return createAdminClient();
}

// ── run ─────────────────────────────────────────────────────────────────

export async function loadRun(runId: string): Promise<AgentRunRow | null> {
  const client = db();
  if (!client) return null;
  try {
    const { data } = await client
      .from("agent_runs")
      .select("*")
      .eq("id", runId)
      .maybeSingle();
    return (data as AgentRunRow | null) ?? null;
  } catch {
    return null;
  }
}

/**
 * Reclama il run per l'esecuzione: CAS `queued|running → running`.
 * `running` è ammesso perché copre la ripresa dopo un crash del worker
 * (il lease del job è scaduto, il run era a metà).
 */
export async function markRunRunning(
  runId: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const client = db();
  if (!client) return { ok: false, reason: "db_unavailable" };
  try {
    const { data, error } = await client
      .from("agent_runs")
      .update({ status: "running" })
      .eq("id", runId)
      .in("status", ["queued", "running"])
      .select("id");
    if (error) return { ok: false, reason: `db: ${error.message}` };
    if (data && data.length > 0) return { ok: true };
    const { data: run } = await client
      .from("agent_runs")
      .select("status")
      .eq("id", runId)
      .maybeSingle();
    const status = String(run?.status ?? "");
    if (TERMINAL_RUN_STATUSES.has(status)) return { ok: false, reason: "terminal" };
    return { ok: false, reason: `not_claimable: ${status}` };
  } catch (err) {
    return { ok: false, reason: `db: ${String(err)}` };
  }
}

/** Scrive i totali parziali (checkpoint) senza toccare lo stato. */
export async function checkpointTotals(
  runId: string,
  totals: RunTotals,
): Promise<boolean> {
  const client = db();
  if (!client) return false;
  try {
    const { data, error } = await client
      .from("agent_runs")
      .update(totals)
      .eq("id", runId)
      .in("status", ["queued", "running"])
      .select("id");
    if (error) {
      console.error("agents: checkpointTotals fallito", error.message);
      return false;
    }
    return Boolean(data && data.length > 0);
  } catch {
    return false;
  }
}

/** Chiude il run in stato terminale con i totali finali. Guardato sullo stato. */
export async function finishRun(
  runId: string,
  patch: {
    status: "succeeded" | "failed" | "cancelled";
    errore?: string | null;
    finishedAt: string;
    totals: RunTotals;
  },
): Promise<boolean> {
  const client = db();
  if (!client) return false;
  try {
    const { data, error } = await client
      .from("agent_runs")
      .update({
        status: patch.status,
        errore: patch.errore ?? null,
        finished_at: patch.finishedAt,
        ...patch.totals,
      })
      .eq("id", runId)
      .in("status", ["queued", "running"])
      .select("id");
    if (error) {
      console.error("agents: finishRun fallito", error.message);
      return false;
    }
    return Boolean(data && data.length > 0);
  } catch {
    return false;
  }
}

/** Rimette il run in coda (ripresa dopo muraglia di wall time o errore transitorio). */
export async function setRunQueued(
  runId: string,
  totals: RunTotals,
): Promise<boolean> {
  const client = db();
  if (!client) return false;
  try {
    const { data, error } = await client
      .from("agent_runs")
      .update({ status: "queued", errore: null, ...totals })
      .eq("id", runId)
      .eq("status", "running")
      .select("id");
    if (error) {
      console.error("agents: setRunQueued fallito", error.message);
      return false;
    }
    return Boolean(data && data.length > 0);
  } catch {
    return false;
  }
}

/**
 * Run in attesa di una decisione umana (Fase 4): tocca i soli stati vivi e
 * totali; il job viene chiuso dal worker (nessun retry da bruciare), la
 * decisione dell'utente rimette il run in coda con un nuovo job.
 */
export async function setRunWaitingApproval(
  runId: string,
  totals: RunTotals,
): Promise<boolean> {
  const client = db();
  if (!client) return false;
  try {
    const { data, error } = await client
      .from("agent_runs")
      .update({ status: "waiting_approval", ...totals })
      .eq("id", runId)
      .in("status", ["queued", "running"])
      .select("id");
    if (error) {
      console.error("agents: setRunWaitingApproval fallito", error.message);
      return false;
    }
    return Boolean(data && data.length > 0);
  } catch {
    return false;
  }
}

// ── journal dei passi ───────────────────────────────────────────────────

export async function listSteps(runId: string): Promise<AgentRunStepRow[]> {
  const client = db();
  if (!client) return [];
  try {
    const { data } = await client
      .from("agent_run_steps")
      .select("*")
      .eq("run_id", runId)
      .order("indice", { ascending: true });
    return (data as AgentRunStepRow[] | null) ?? [];
  } catch {
    return [];
  }
}

/**
 * Inserisce un passo. `duplicate` = violazione di `unique(run_id, indice)`:
 * un altro writer ha già rivendicato quell'indice (doppio worker o replay).
 */
export async function insertStep(step: NewStep): Promise<InsertStepResult> {
  const client = db();
  if (!client) return { ok: false, reason: "db_unavailable" };
  try {
    const { data, error } = await client
      .from("agent_run_steps")
      .insert({
        run_id: step.runId,
        tenant_id: step.tenantId,
        indice: step.indice,
        tipo: step.tipo,
        input: step.input ?? null,
        output: step.output ?? null,
        tool_name: step.toolName ?? null,
        durata_ms: step.durataMs ?? null,
        crediti: step.crediti ?? 0,
      })
      .select("*")
      .single();
    if (error) {
      if (error.code === "23505") return { ok: false, reason: "duplicate" };
      return { ok: false, reason: `db: ${error.message}` };
    }
    return { ok: true, row: data as AgentRunStepRow };
  } catch (err) {
    return { ok: false, reason: `db: ${String(err)}` };
  }
}

/**
 * Compila UNA volta output/durata/crediti di un passo pre-inserito (claim di
 * idempotenza). Ritorna false se lo step non esiste, se l'output è già stato
 * scritto (fill-once) o se il DB non risponde.
 */
export async function fillStepOutput(
  stepId: string,
  patch: { output: string; durataMs?: number | null; crediti?: number },
): Promise<boolean> {
  const client = db();
  if (!client) return false;
  try {
    const { data, error } = await client
      .from("agent_run_steps")
      .update({
        output: patch.output,
        ...(patch.durataMs !== undefined ? { durata_ms: patch.durataMs } : {}),
        ...(patch.crediti !== undefined ? { crediti: patch.crediti } : {}),
      })
      .eq("id", stepId)
      .is("output", null)
      .select("id");
    if (error) {
      console.error("agents: fillStepOutput fallito", error.message);
      return false;
    }
    return Boolean(data && data.length > 0);
  } catch {
    return false;
  }
}

// ── coda dei job ────────────────────────────────────────────────────────

/** Rivendica il prossimo job disponibile via RPC `claim_agent_job` (SKIP LOCKED). */
export async function claimJob(
  worker: string,
  leaseSeconds: number,
): Promise<AgentJobRow | null> {
  const client = db();
  if (!client) return null;
  try {
    const { data, error } = await client.rpc("claim_agent_job", {
      p_worker: worker,
      p_lease_seconds: leaseSeconds,
    });
    if (error) {
      console.error("agents: claimJob fallito", error.message);
      return null;
    }
    const rows = (data as AgentJobRow[] | null) ?? [];
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

async function updateJob(
  jobId: string,
  patch: Record<string, unknown>,
): Promise<boolean> {
  const client = db();
  if (!client) return false;
  try {
    const { data, error } = await client
      .from("agent_jobs")
      .update({ updated_at: new Date().toISOString(), locked_at: null, locked_by: null, ...patch })
      .eq("id", jobId)
      .select("id");
    if (error) {
      console.error("agents: aggiornamento job fallito", error.message);
      return false;
    }
    return Boolean(data && data.length > 0);
  } catch {
    return false;
  }
}

export async function completeJob(jobId: string): Promise<boolean> {
  return updateJob(jobId, { stato: "done", ultimo_errore: null });
}

export async function failJob(jobId: string, error: string): Promise<boolean> {
  return updateJob(jobId, { stato: "failed", ultimo_errore: error.slice(0, 2000) });
}

/**
 * Rimette in coda il job appena rivendicato per una ripresa pulita
 * (muraglia di wall time). `tentativi` va COMPENSATO: il claim incrementa il
 * contatore, ma una ripresa programmativa non è un tentativo fallito, altrimenti
 * qualche requeue consumerebbe tutto il budget dei retry.
 */
export async function requeueJob(
  jobId: string,
  scheduledForIso: string,
  error: string,
  tentativiAfterClaim: number,
): Promise<boolean> {
  return updateJob(jobId, {
    stato: "queued",
    scheduled_for: scheduledForIso,
    tentativi: Math.max(tentativiAfterClaim - 1, 0),
    ultimo_errore: error.slice(0, 2000),
  });
}

/** Fallimento transitorio: il job resta queued con backoff (tentativi già incrementati dal claim). */
export async function retryJob(
  jobId: string,
  scheduledForIso: string,
  error: string,
): Promise<boolean> {
  return updateJob(jobId, {
    stato: "queued",
    scheduled_for: scheduledForIso,
    ultimo_errore: error.slice(0, 2000),
  });
}

/** Accoda un job per un run (unique parziale: un solo job attivo per run). */
export async function enqueueJob(
  runId: string,
  tenantId: string,
  scheduledForIso: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const client = db();
  if (!client) return { ok: false, reason: "db_unavailable" };
  try {
    const { error } = await client.from("agent_jobs").insert({
      run_id: runId,
      tenant_id: tenantId,
      scheduled_for: scheduledForIso,
      stato: "queued",
    });
    if (error) {
      if (error.code === "23505") return { ok: false, reason: "job_already_active" };
      return { ok: false, reason: `db: ${error.message}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: `db: ${String(err)}` };
  }
}

// ── creazione run (usata dall'enqueue, riusata dallo scheduler Fase 3) ───

export async function findUserAgentId(
  userId: string,
  agentSlug: string,
): Promise<string | null> {
  const client = db();
  if (!client) return null;
  try {
    const { data } = await client
      .from("user_agents")
      .select("id")
      .eq("user_id", userId)
      .eq("agent_slug", agentSlug)
      .maybeSingle();
    return (data as { id: string } | null)?.id ?? null;
  } catch {
    return null;
  }
}

export async function insertRun(opts: {
  tenantId: string;
  agentSlug: string;
  userAgentId: string | null;
  istruzioni: string;
  trigger: "manual" | "schedule" | "delegation";
  scheduleId?: string | null;
  parentRunId?: string | null;
  budgetMaxStep: number;
  budgetMaxCrediti: number;
}): Promise<{ ok: true; run: AgentRunRow } | { ok: false; reason: string }> {
  const client = db();
  if (!client) return { ok: false, reason: "db_unavailable" };
  try {
    const { data, error } = await client
      .from("agent_runs")
      .insert({
        user_id: opts.tenantId,
        user_agent_id: opts.userAgentId,
        agent_slug: opts.agentSlug,
        status: "queued",
        trigger: opts.trigger,
        schedule_id: opts.scheduleId ?? null,
        parent_run_id: opts.parentRunId ?? null,
        budget_max_step: opts.budgetMaxStep,
        budget_max_crediti: opts.budgetMaxCrediti,
        crediti_usati: 0,
        istruzioni: opts.istruzioni,
        started_at: new Date().toISOString(),
      })
      .select("*")
      .single();
    if (error) return { ok: false, reason: `db: ${error.message}` };
    return { ok: true, run: data as AgentRunRow };
  } catch (err) {
    return { ok: false, reason: `db: ${String(err)}` };
  }
}

export async function deleteRun(runId: string): Promise<void> {
  const client = db();
  if (!client) return;
  try {
    await client.from("agent_runs").delete().eq("id", runId);
  } catch {
    // migliori sforzi: un run orfano senza job non viene mai eseguito.
  }
}
