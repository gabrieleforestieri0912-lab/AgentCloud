/**
 * Esecutore dei run in background (Fase 2).
 *
 * Come funziona: il worker rivendica un job (`claim_agent_job`, SKIP LOCKED),
 * poi chiama `executeBackgroundRun(runId)`. Il runner:
 *
 *  1. fa il CAS sullo stato del run (queued|running → running) e apre i gate:
 *     allowance di fatturazione (`assertRunAllowed`) ed esistenza dell'agente;
 *  2. ricostruisce la conversazione dal journal `agent_run_steps`, così una
 *     ripresa CONTINUA dal checkpoint e non riparte da zero;
 *  3. esegue il ciclo LLM → tool → LLM già usato dalla route `/api/agent/run`,
 *     ma ogni chiamata LLM e ogni tool diventano un passo nel journal con
 *     budget (default 20 step / 50 crediti) e muraglia di wall time (90s):
 *     al limite il run viene RI-ACCODATO dal checkpoint, non bloccato;
 *  4. un tool caduto a metà NON viene mai rieseguito (effetti duplicati:
 *     due email, due ordini): il passo resta senza output, viene marcato
 *     `[interrotto]` e il run fallisce con messaggio esplicito.
 *
 * Differenze rispetto alla route live: niente stream/SSE, niente memoria a
 * lungo termine e niente indice skill nel system prompt (non erano nei
 * requisiti della fase e la route le monta a inizio conversazione). I token
 * vengono aggiornati sulla RIGA del run (D13: la riga è anche il record di
 * consumo) — nessun doppio inserimento in `agent_runs`.
 */

import { logAudit } from "@/lib/audit";
import { DEFAULT_LOCALE } from "@/lib/i18n/constants";
import { getLLMProvider } from "@/lib/llm";
import type {
  LLMMessage,
  LLMProvider,
  LLMResponse,
  LLMTool,
  LLMToolResult,
  LLMToolUse,
} from "@/lib/llm";
import { replyLanguage } from "@/lib/agents/language";
import { getEnabledToolsForAgent } from "@/lib/agents/feature-flags";
import { getAgentRuntimeConfig } from "@/lib/agents/registry";
import { buildAgentSystemPrompt } from "@/lib/agents/system-prompt";
import { TOOL_DEFINITIONS, executeTool } from "@/lib/agents/tools";
import { isMicrosoftTool } from "@/lib/agents/microsoft-tools";
import { isOutlookTool } from "@/lib/agents/outlook-tools";
import {
  buildActionNotification,
  createAgentNotification,
} from "@/lib/agents/notifications";
import {
  assertRunAllowed,
  reportOverageForExistingRun,
} from "@/lib/billing/usage-tracking";
import {
  isMicrosoftConnected,
  isOutlookConnected,
} from "@/lib/integrations/microsoft/tenant";
import type { AgentRunRow, AgentRunStepRow } from "@/types/agents-db";
import { maskJson, maskSecrets, truncateForStep } from "./mask";
import * as store from "./store";

export const BUDGET_DEFAULT_MAX_STEP = 20;
export const BUDGET_DEFAULT_MAX_CREDITS = 50;
export const DEFAULT_WALL_BUDGET_MS = 90_000;

const TOKENS_PER_CREDIT = 1_000;
const DEFAULT_MAX_TOKENS = 4_096;
const STEP_TEXT_MAX_CHARS = 16_000;
const DEFAULT_INSTRUCTIONS =
  "Complete the task attached to this run and deliver the result.";

export const INTERRUPTED_TOOL_TEXT =
  "[interrotto: il worker è caduto durante l'esecuzione del tool. " +
  "Il tool non viene rieseguito per evitare effetti duplicati: " +
  "controlla l'esito manualmente prima di riprovare.]";

export type RunResult = {
  outcome: "succeeded" | "failed" | "requeue" | "noop";
  /** true → il job può essere riprovato con backoff dal worker. */
  retryable?: boolean;
  error?: string;
};

export type RunDeps = {
  /** Provider iniettabile per i test (default: provider da env). */
  provider?: LLMProvider;
  /** Clock iniettabile per i test. */
  now?: () => number;
  /** Muraglia di wall time (default 90s): oltre, ripresa dal checkpoint. */
  wallBudgetMs?: number;
};

function errText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Tool richiesti dal modello in questa risposta, letti dal journal (passo llm). */
function extractToolUses(input: Record<string, unknown> | null): LLMToolUse[] {
  const raw = input?.toolUses;
  if (!Array.isArray(raw)) return [];
  const uses: LLMToolUse[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const candidate = item as Record<string, unknown>;
    if (typeof candidate.id !== "string" || typeof candidate.name !== "string") continue;
    uses.push({
      id: candidate.id,
      name: candidate.name,
      input:
        candidate.input && typeof candidate.input === "object"
          ? (candidate.input as Record<string, unknown>)
          : {},
    });
  }
  return uses;
}

/**
 * Ricostruisce la conversazione dal journal. Ogni passo `llm` diventa un
 * messaggio assistant (testo, oppure i tool_use con i risultati che
 * seguono come messaggio user) — stesso schema della route live, così il
 * provider riceve una storia valida anche a metà run.
 */
function rebuildConversation(
  steps: AgentRunStepRow[],
  instructions: string,
): LLMMessage[] {
  const messages: LLMMessage[] = [{ role: "user", content: instructions }];
  let i = 0;
  while (i < steps.length) {
    const step = steps[i];
    if (step.tipo !== "llm") {
      i++;
      continue;
    }
    const toolUses = extractToolUses(step.input);
    if (toolUses.length === 0) {
      messages.push({ role: "assistant", content: step.output ?? "" });
      i++;
      continue;
    }
    const results: LLMToolResult[] = [];
    let j = i + 1;
    while (j < steps.length && steps[j].tipo === "tool" && results.length < toolUses.length) {
      const toolStep = steps[j];
      results.push({
        id: String(toolStep.input?.toolUseId ?? ""),
        content: toolStep.output ?? "",
      });
      j++;
    }
    messages.push({ role: "assistant", content: toolUses });
    if (results.length > 0) messages.push({ role: "user", content: results });
    i = j;
  }
  return messages;
}

/** Tool mai eseguiti: il run è caduto tra il passo LLM e il claim del tool. */
function findDeferredUses(steps: AgentRunStepRow[]): LLMToolUse[] {
  const executedIds = new Set(
    steps
      .filter((s) => s.tipo === "tool")
      .map((s) => String(s.input?.toolUseId ?? "")),
  );
  const deferred: LLMToolUse[] = [];
  for (const s of steps) {
    if (s.tipo !== "llm") continue;
    for (const use of extractToolUses(s.input)) {
      if (!executedIds.has(use.id)) deferred.push(use);
    }
  }
  return deferred;
}

function totalsOf(run: AgentRunRow): store.RunTotals {
  return {
    input_tokens: run.input_tokens ?? 0,
    output_tokens: run.output_tokens ?? 0,
    tool_calls: run.tool_calls ?? 0,
    crediti_usati: run.crediti_usati ?? 0,
  };
}

/**
 * Chiude definitivamente un run rimasto appeso (job con tentativi esauriti).
 * Chiamata dal worker, non dal runner.
 */
export async function finalizeAbandonedRun(
  runId: string,
  error: string,
): Promise<void> {
  const run = await store.loadRun(runId);
  if (!run || store.TERMINAL_RUN_STATUSES.has(run.status)) return;
  const steps = await store.listSteps(runId);
  const lastIndice = steps.reduce((max, s) => Math.max(max, s.indice), -1);
  await store.insertStep({
    runId,
    tenantId: run.user_id,
    indice: lastIndice + 1,
    tipo: "system",
    output: truncateForStep(`ERRORE: ${error}`, STEP_TEXT_MAX_CHARS),
    crediti: 0,
  });
  await store.finishRun(runId, {
    status: "failed",
    errore: error.slice(0, 2000),
    finishedAt: new Date().toISOString(),
    totals: totalsOf(run),
  });
  try {
    await reportOverageForExistingRun({
      user_id: run.user_id,
      agent_slug: run.agent_slug,
      run_id: run.id,
      tokens_input: run.input_tokens ?? 0,
      tokens_output: run.output_tokens ?? 0,
    });
  } catch {
    // la fatturazione non deve mai far fallire la chiusura del run
  }
}

export async function executeBackgroundRun(
  runId: string,
  deps: RunDeps = {},
): Promise<RunResult> {
  const now = deps.now ?? Date.now;
  const wallBudgetMs = deps.wallBudgetMs ?? DEFAULT_WALL_BUDGET_MS;
  const startedAt = now();

  const run = await store.loadRun(runId);
  if (!run) return { outcome: "failed", error: "run_not_found" };
  if (store.TERMINAL_RUN_STATUSES.has(run.status)) return { outcome: "noop" };

  const claim = await store.markRunRunning(runId);
  if (!claim.ok) {
    // Stato non rivendicabile (es. waiting_approval, Fase 4) o già terminato:
    // il job si chiude senza errori, la ripresa la gestisce chi lo produce.
    if (claim.reason === "terminal" || claim.reason.startsWith("not_claimable")) {
      return { outcome: "noop" };
    }
    return { outcome: "failed", retryable: true, error: claim.reason };
  }

  // ── stato locale ──────────────────────────────────────────────────────
  const tenantId = run.user_id;
  let steps = await store.listSteps(runId);
  let lastIndice = steps.reduce((max, s) => Math.max(max, s.indice), -1);
  const takeIndice = (): number => ++lastIndice;
  let inputTokens = run.input_tokens ?? 0;
  let outputTokens = run.output_tokens ?? 0;
  let toolCalls = run.tool_calls ?? 0;
  let creditsUsed = run.crediti_usati ?? 0;
  const totals = (): store.RunTotals => ({
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    tool_calls: toolCalls,
    crediti_usati: creditsUsed,
  });

  const writeSystemStep = async (output: string): Promise<void> => {
    await store.insertStep({
      runId,
      tenantId,
      indice: takeIndice(),
      tipo: "system",
      output: truncateForStep(maskSecrets(output), STEP_TEXT_MAX_CHARS),
      crediti: 0,
    });
  };

  const reportUsage = async (): Promise<void> => {
    try {
      await reportOverageForExistingRun({
        user_id: run.user_id,
        agent_slug: run.agent_slug,
        run_id: run.id,
        tokens_input: inputTokens,
        tokens_output: outputTokens,
      });
    } catch {
      // la fatturazione non deve mai far fallire la chiusura del run
    }
  };

  const failFinal = async (error: string): Promise<RunResult> => {
    await writeSystemStep(`ERRORE: ${error}`);
    await store.finishRun(runId, {
      status: "failed",
      errore: error.slice(0, 2000),
      finishedAt: new Date(now()).toISOString(),
      totals: totals(),
    });
    await reportUsage();
    return { outcome: "failed", error };
  };

  const failRetryable = async (error: string): Promise<RunResult> => {
    // Nessun system step: il motivo vive in job.ultimo_errore e verrà
    // riscritto alla prossima ripresa, senza inondare il journal.
    await store.checkpointTotals(runId, totals());
    await store.setRunQueued(runId, totals());
    return { outcome: "failed", retryable: true, error };
  };

  const requeueRun = async (reason: string): Promise<RunResult> => {
    await store.setRunQueued(runId, totals());
    return { outcome: "requeue", error: reason };
  };

  // ── passo 1: tool interrotti da un crash precedente ───────────────────
  const interrupted = steps.find((s) => s.tipo === "tool" && s.output == null);
  if (interrupted) {
    await store.fillStepOutput(interrupted.id, { output: INTERRUPTED_TOOL_TEXT });
    return failFinal(
      `interrupted_tool: ${interrupted.tool_name ?? "sconosciuto"} — ${INTERRUPTED_TOOL_TEXT}`,
    );
  }

  // ── passo 2: gate pre-run ─────────────────────────────────────────────
  const allowance = await assertRunAllowed(run.user_id, run.agent_slug);
  if (!allowance.allowed) {
    return failFinal(`billing_denied: ${allowance.code} — ${allowance.message}`);
  }

  const config = getAgentRuntimeConfig(run.agent_slug);
  if (!config) return failFinal(`unknown_agent: ${run.agent_slug}`);

  const instructions = (run.istruzioni ?? "").trim() || DEFAULT_INSTRUCTIONS;
  const budgetMaxStep = run.budget_max_step ?? BUDGET_DEFAULT_MAX_STEP;
  const budgetMaxCredits = run.budget_max_crediti ?? BUDGET_DEFAULT_MAX_CREDITS;

  const checkBudget = async (): Promise<RunResult | null> => {
    if (lastIndice + 1 >= budgetMaxStep) {
      return failFinal(
        `budget_steps: raggiunto il limite di ${budgetMaxStep} step per run`,
      );
    }
    if (creditsUsed >= budgetMaxCredits) {
      return failFinal(
        `budget_crediti: raggiunto il limite di ${budgetMaxCredits} crediti per run`,
      );
    }
    return null;
  };

  // ── passo 3: tool set dell'agente, filtrato per integrazioni collegate ─
  const [microsoftConnected, outlookConnected] = await Promise.all([
    isMicrosoftConnected(tenantId),
    isOutlookConnected(tenantId),
  ]);
  let toolNames = getEnabledToolsForAgent(run.agent_slug);
  if (!microsoftConnected) toolNames = toolNames.filter((t) => !isMicrosoftTool(t));
  if (!outlookConnected) toolNames = toolNames.filter((t) => !isOutlookTool(t));
  const tools: LLMTool[] = toolNames
    .map((name) => TOOL_DEFINITIONS[name])
    .filter((tool): tool is LLMTool => Boolean(tool));

  const locale = replyLanguage(DEFAULT_LOCALE, instructions);
  const system = buildAgentSystemPrompt(config.systemPrompt, locale);
  const provider = deps.provider ?? getLLMProvider();

  // ── passo 4: esecuzione dei tool mai partiti (crash tra LLM e claim) ──
  const executeToolStep = async (
    use: LLMToolUse,
  ): Promise<{ ok: true; output: string } | { ok: false; reason: string; fatal?: boolean }> => {
    const claimStep = await store.insertStep({
      runId,
      tenantId,
      indice: takeIndice(),
      tipo: "tool",
      input: maskJson({ toolUseId: use.id, name: use.name, args: use.input }),
      toolName: use.name,
      output: null,
      crediti: 0,
    });
    if (!claimStep.ok) {
      // duplicate = un altro writer ha già quell'indice: l'indice ESISTE in
      // journal, quindi non torna indietro; db error = la riga non è scritta,
      // l'indice torna disponibile. In entrambi i casi nessun fallimento
      // definitivo: alla ripresa il journal viene ricaricato e il run
      // converge sullo stato reale (self-healing).
      if (claimStep.reason !== "duplicate") lastIndice--;
      return { ok: false, reason: claimStep.reason, fatal: false };
    }
    const toolStartedAt = now();
    let result: string;
    try {
      result = await executeTool(use.name, use.input as Record<string, string>, {
        userId: run.user_id,
        tenantId,
      });
    } catch (err) {
      const message = errText(err);
      await store.fillStepOutput(claimStep.row.id, {
        output: truncateForStep(maskSecrets(`[tool crash] ${message}`), STEP_TEXT_MAX_CHARS),
        durataMs: now() - toolStartedAt,
      });
      return { ok: false, reason: `tool_crash: ${use.name}: ${message}`, fatal: true };
    }
    const filled = await store.fillStepOutput(claimStep.row.id, {
      output: truncateForStep(maskSecrets(result), STEP_TEXT_MAX_CHARS),
      durataMs: now() - toolStartedAt,
    });
    if (!filled) {
      return { ok: false, reason: `step_fill_failed: ${use.name}`, fatal: true };
    }
    toolCalls++;
    // Notifiche/audit best-effort: non devono mai far fallire il run.
    try {
      const action = buildActionNotification(
        use.name,
        use.input as Record<string, string>,
        result,
      );
      if (action) {
        await createAgentNotification({
          userId: run.user_id,
          agentSlug: run.agent_slug,
          kind: action.kind,
          params: action.params,
        });
      }
      logAudit("tool_exec", {
        userId: run.user_id,
        agent: run.agent_slug,
        tool: use.name,
        durationMs: now() - toolStartedAt,
        runId,
        background: true,
      });
    } catch {
      // best-effort
    }
    // Il modello vede il risultato REALE; nel journal finisce mascherato.
    return { ok: true, output: result };
  };

  const runDeferredTools = async (): Promise<RunResult | null> => {
    const deferred = findDeferredUses(steps);
    if (deferred.length === 0) return null;
    // Troppo vicini alla muraglia: meglio ri-accodare ora, i tool partono
    // alla prossima ripresa (non sono mai stati eseguiti, quindi è sicuro).
    if (now() - startedAt > wallBudgetMs) return requeueRun("wall_budget_before_deferred");
    for (const use of deferred) {
      const budgetBlocked = await checkBudget();
      if (budgetBlocked) return budgetBlocked;
      const executed = await executeToolStep(use);
      if (!executed.ok) {
        return executed.fatal
          ? failFinal(executed.reason)
          : failRetryable(executed.reason);
      }
    }
    steps = await store.listSteps(runId);
    return null;
  };

  const deferredResult = await runDeferredTools();
  if (deferredResult) return deferredResult;

  let messages = rebuildConversation(steps, instructions);

  // ── passo 5: ciclo LLM → tool → LLM ───────────────────────────────────
  for (;;) {
    const budgetBlocked = await checkBudget();
    if (budgetBlocked) return budgetBlocked;

    if (now() - startedAt > wallBudgetMs) {
      // Muraglia D3: la ripresa ricarica il journal e ricomincia da qui.
      return requeueRun("wall_budget");
    }

    let response: LLMResponse;
    try {
      response = await provider.chat({
        model: config.model,
        system,
        messages,
        tools,
        maxTokens: DEFAULT_MAX_TOKENS,
      });
    } catch (err) {
      return failRetryable(`llm_error: ${errText(err)}`);
    }

    inputTokens += response.usage.inputTokens;
    outputTokens += response.usage.outputTokens;
    const stepCredits = Math.ceil(
      (response.usage.inputTokens + response.usage.outputTokens) / TOKENS_PER_CREDIT,
    );
    creditsUsed += stepCredits;

    const llmStep = await store.insertStep({
      runId,
      tenantId,
      indice: takeIndice(),
      tipo: "llm",
      input: maskJson({
        model: config.model,
        stopReason: response.stopReason,
        toolUses: response.toolUses,
      }),
      output: truncateForStep(maskSecrets(response.text), STEP_TEXT_MAX_CHARS),
      crediti: stepCredits,
    });
    if (!llmStep.ok) {
      if (llmStep.reason === "duplicate") {
        // Un altro writer ha rivendicato lo stesso indice: non tocchiamo lo
        // stato (lo gestisce l'altro). Il worker riprova con backoff e alla
        // ripresa il journal viene ricaricato dalla riga vincente.
        lastIndice--;
        return { outcome: "failed", retryable: true, error: "step_index_conflict" };
      }
      lastIndice--;
      return failRetryable(`step_insert: ${llmStep.reason}`);
    }
    await store.checkpointTotals(runId, totals());

    if (response.toolUses.length === 0) {
      // end_turn / max_tokens / stop: la run è completa.
      await store.finishRun(runId, {
        status: "succeeded",
        finishedAt: new Date(now()).toISOString(),
        totals: totals(),
      });
      await reportUsage();
      return { outcome: "succeeded" };
    }

    // Batch di tool: non si ri-accoda a metà (l'assistente con i tool_use e
    // i risultati devono restare appaiati); la muraglia si controlla al giro
    // di loop successivo. Ogni tool è però protetto dal claim fill-once.
    const toolResults: LLMToolResult[] = [];
    for (const use of response.toolUses) {
      const executed = await executeToolStep(use);
      if (!executed.ok) {
        return executed.fatal
          ? failFinal(executed.reason)
          : failRetryable(executed.reason);
      }
      toolResults.push({ id: use.id, content: executed.output });
    }
    messages = [
      ...messages,
      { role: "assistant", content: response.toolUses },
      { role: "user", content: toolResults },
    ];
  }
}
