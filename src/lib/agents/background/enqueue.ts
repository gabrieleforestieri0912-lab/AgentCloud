/**
 * Coda di creazione per i run in background (Fase 2).
 *
 * Un run background nasce completo: riga `agent_runs` (status queued, con
 * budget e istruzioni) + un `agent_jobs` agganciato. L'unico stato che il
 * chiamante deve conoscere è `runId`: a da lì in poi il worker fa tutto
 * (claim, esecuzione, riprese). Se il job non può essere creato (c'è già un
 * job attivo per lo stesso run), la riga run appena creata viene rimossa:
 * nessun run orfano che nessuno eseguirà mai.
 */

import type { AgentRunRow } from "@/types/agents-db";
import { getAgentRuntimeConfig } from "@/lib/agents/registry";
import * as store from "./store";

export const INSTRUCTIONS_MAX_CHARS = 8_000;

export type CreateBackgroundRunOptions = {
  tenantId: string;
  agentSlug: string;
  istruzioni: string;
  trigger?: AgentRunRow["trigger"];
  scheduleId?: string | null;
  parentRunId?: string | null;
  budgetMaxStep?: number;
  budgetMaxCrediti?: number;
  /** Momento di attivazione del job (default: subito). */
  scheduledFor?: Date;
};

export type CreateBackgroundRunResult =
  | { ok: true; runId: string }
  | { ok: false; code: string; message: string };

function clamp(value: number | undefined, fallback: number, min: number, max: number): number {
  if (value === undefined || !Number.isFinite(value)) return fallback;
  return Math.min(Math.max(Math.trunc(value), min), max);
}

export async function createBackgroundRun(
  opts: CreateBackgroundRunOptions,
): Promise<CreateBackgroundRunResult> {
  const tenantId = opts.tenantId.trim();
  const agentSlug = opts.agentSlug.trim();
  const istruzioni = opts.istruzioni.trim();

  if (!tenantId || tenantId === "anonymous") {
    return {
      ok: false,
      code: "tenant_required",
      message: "I run in background richiedono un tenant autenticato.",
    };
  }
  if (!getAgentRuntimeConfig(agentSlug)) {
    return { ok: false, code: "unknown_agent", message: "Agente inesistente." };
  }
  if (!istruzioni) {
    return {
      ok: false,
      code: "instructions_required",
      message: "Le istruzioni del run non possono essere vuote.",
    };
  }
  if (istruzioni.length > INSTRUCTIONS_MAX_CHARS) {
    return {
      ok: false,
      code: "instructions_too_long",
      message: `Le istruzioni superano i ${INSTRUCTIONS_MAX_CHARS} caratteri.`,
    };
  }

  const inserted = await store.insertRun({
    tenantId,
    agentSlug,
    userAgentId: await store.findUserAgentId(tenantId, agentSlug),
    istruzioni,
    trigger: opts.trigger ?? "manual",
    scheduleId: opts.scheduleId ?? null,
    parentRunId: opts.parentRunId ?? null,
    budgetMaxStep: clamp(opts.budgetMaxStep, 20, 1, 100),
    budgetMaxCrediti: clamp(opts.budgetMaxCrediti, 50, 1, 5_000),
  });
  if (!inserted.ok) {
    return { ok: false, code: "db_unavailable", message: `Creazione run fallita: ${inserted.reason}` };
  }

  const scheduledFor = (opts.scheduledFor ?? new Date()).toISOString();
  const job = await store.enqueueJob(inserted.run.id, tenantId, scheduledFor);
  if (!job.ok) {
    await store.deleteRun(inserted.run.id);
    if (job.reason === "job_already_active") {
      return {
        ok: false,
        code: "job_already_active",
        message: "C'è già un job attivo per questo run.",
      };
    }
    return { ok: false, code: "db_unavailable", message: `Creazione job fallita: ${job.reason}` };
  }

  return { ok: true, runId: inserted.run.id };
}

/**
 * Accoda un job per un run ESISTENTE (riprese, decisioni di approvazione,
 * nuovi tentativi dello scheduler). Usato dalla Fase 3/4.
 */
export async function requeueExistingRun(
  runId: string,
  tenantId: string,
  scheduledFor: Date = new Date(),
): Promise<CreateBackgroundRunResult> {
  const job = await store.enqueueJob(runId, tenantId, scheduledFor.toISOString());
  if (!job.ok) {
    const code = job.reason === "job_already_active" ? "job_already_active" : "db_unavailable";
    return { ok: false, code, message: job.reason };
  }
  return { ok: true, runId };
}
