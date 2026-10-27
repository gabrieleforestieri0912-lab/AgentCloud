import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  executeBackgroundRun,
  finalizeAbandonedRun,
} from "@/lib/agents/background/runner";
import {
  scanSchedules,
  handleScheduleOutcome,
  purgeExpiredRuns,
} from "@/lib/agents/background/scheduler";
import {
  claimJob,
  completeJob,
  failJob,
  requeueJob,
  retryJob,
} from "@/lib/agents/background/store";

/**
 * POST+GET /api/agents/worker — consumatore della coda `agent_jobs` (D1) e
 * schedulatore degli `agent_schedules` (Fase 3).
 *
 * Invocato ogni minuto dal Cron Trigger di Cloudflare (custom-worker.ts →
 * `scheduled()`, header `Authorization: Bearer $CRON_SECRET`) o manualmente
 * con `Bearer $ADMIN_API_TOKEN`. Il worker:
 *
 *  0. (Fase 3) avanza gli schedule dovuti: crea run+job per ogni schedule
 *     attivo con `next_run_at <= now()` (CAS anti-doppio-tick);
 *  1. rivendica fino a `maxJobs` job con `claim_agent_job` (SKIP LOCKED +
 *     lease: un worker morto lascia il job agli altri dopo 180s);
 *  2. esegue il run (`executeBackgroundRun`);
 *  3. mappa l'esito sul job:
 *     - succeeded/noop → job `done`;
 *     - requeue (muraglia di wall time) → job `queued` con tentativi
 *       COMPENSATI (la ripresa non è un tentativo fallito);
 *     - failed retryable → backoff `2^n * 5s` (max 15min); se i tentativi
 *       sono esauriti il run viene chiuso definitivamente;
 *     - failed definitivo → job `failed` (il run è già stato chiuso dal
 *       runner con l'errore nel journal).
 *
 * La deadline interna (80s) sta sotto il wall time del run (90s) e sotto il
 * limite dell'evento `scheduled`: se il batch non entra in tempo, il prossimo
 * trigger riprende dalle righe ancora in coda.
 */

const MAX_JOB_DURATION_MS = 80_000;
const RETRY_BASE_DELAY_MS = 5_000;
const RETRY_MAX_DELAY_MS = 15 * 60_000;

function authorized(request: Request): boolean {
  const cronToken = process.env.CRON_SECRET;
  const adminToken = process.env.ADMIN_API_TOKEN;
  const authHeader = request.headers.get("authorization") || "";
  // Vercel Cron invoca i suoi endpoint con questo header (non con Bearer):
  // accettato SE il valore combacia con CRON_SECRET — stesso segreto, canale
  // diverso (la produzione gira su Vercel, il cron può arrivare da lì).
  const vercelCron = request.headers.get("x-vercel-cron-authorization") || "";
  return (
    (cronToken !== undefined &&
      cronToken !== "" &&
      authHeader === `Bearer ${cronToken}`) ||
    (cronToken !== undefined && cronToken !== "" && vercelCron === cronToken) ||
    (adminToken !== undefined &&
      adminToken !== "" &&
      authHeader === `Bearer ${adminToken}`)
  );
}

function intParam(
  body: Record<string, unknown>,
  url: URL,
  key: string,
  fallback: number,
  min: number,
  max: number,
): number {
  const raw = body[key] ?? url.searchParams.get(key);
  const parsed = typeof raw === "string" ? Number.parseInt(raw, 10) : Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.trunc(parsed), min), max);
}

async function handle(request: Request): Promise<NextResponse> {
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = createAdminClient();
  if (!db) {
    return NextResponse.json({ error: "db_unavailable" }, { status: 500 });
  }

  const url = new URL(request.url);
  let body: Record<string, unknown> = {};
  if (request.method === "POST") {
    try {
      const parsed: unknown = await request.json();
      if (parsed && typeof parsed === "object") body = parsed as Record<string, unknown>;
    } catch {
      body = {};
    }
  }
  const maxJobs = intParam(body, url, "maxJobs", 3, 1, 10);
  const leaseSeconds = intParam(body, url, "leaseSeconds", 180, 30, 900);
  const workerId =
    typeof body.workerId === "string" && body.workerId
      ? body.workerId.slice(0, 128)
      : `wrk_${crypto.randomUUID()}`;

  const deadline = Date.now() + MAX_JOB_DURATION_MS;
  const outcomes: Array<{
    runId: string;
    outcome: string;
    error?: string;
  }> = [];
  let claimed = 0;

  // Fase 3: prima di consumare la coda, gli schedule dovuti generano i loro
  // run. Fallito o vuoto, il worker prosegue comunque sui job esistenti.
  const scan = await scanSchedules();

  // Fase 7 (D9): retention dei payload vecchi, a spizzico (≈1 tick su 20).
  if (Math.random() < 0.05) void purgeExpiredRuns();

  while (claimed < maxJobs && Date.now() < deadline) {
    const job = await claimJob(workerId, leaseSeconds);
    if (!job) break;
    claimed++;

    // Il claim ha trovato i tentativi già esauriti: chiude il run appeso.
    if (job.stato === "failed") {
      await finalizeAbandonedRun(job.run_id, job.ultimo_errore ?? "tentativi esauriti");
      void handleScheduleOutcome(job.run_id, "failed", job.ultimo_errore);
      outcomes.push({ runId: job.run_id, outcome: "failed", error: job.ultimo_errore ?? undefined });
      continue;
    }

    const result = await executeBackgroundRun(job.run_id);

    if (result.outcome === "succeeded" || result.outcome === "noop") {
      await completeJob(job.id);
    } else if (result.outcome === "waiting_approval") {
      // Fase 4: il run attende una decisione umana. Il job si chiude SENZA
      // bruciare tentativi: la decisione dell'utente creerà un job nuovo.
      await completeJob(job.id);
    } else if (result.outcome === "requeue") {
      await requeueJob(
        job.id,
        new Date().toISOString(),
        result.error ?? "ripresa programmata",
        job.tentativi,
      );
    } else if (result.retryable && job.tentativi < job.max_tentativi) {
      const delay = Math.min(
        RETRY_BASE_DELAY_MS * 2 ** Math.max(job.tentativi - 1, 0),
        RETRY_MAX_DELAY_MS,
      );
      await retryJob(
        job.id,
        new Date(Date.now() + delay).toISOString(),
        result.error ?? "errore transitorio",
      );
    } else {
      await failJob(job.id, result.error ?? "run fallito");
      if (result.retryable) {
        // Il runner non ha chiuso il run (errore transitorio): adesso è
        // definitivo perché i tentativi sono finiti.
        await finalizeAbandonedRun(job.run_id, result.error ?? "tentativi esauriti");
      }
    }

    // Fase 7: contabilità dei fallimenti degli schedule (pausa automatica a
    // 3 fallimenti di fila + email). Sui manuali non ha effetto (no schedule);
    // waiting/requeue non toccano il contatore: il run è ancora vivo.
    if (result.outcome === "succeeded" || result.outcome === "noop") {
      void handleScheduleOutcome(job.run_id, "succeeded");
    } else if (result.outcome === "failed") {
      void handleScheduleOutcome(job.run_id, "failed", result.error);
    };

    outcomes.push({
      runId: job.run_id,
      outcome: result.outcome,
      ...(result.error ? { error: result.error } : {}),
    });
  }

  return NextResponse.json({ ok: true, workerId, claimed, outcomes, scan });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
