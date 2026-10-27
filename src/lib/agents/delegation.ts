/**
 * Deleghe tra agenti (Fase 6) — l'orchestratore innesca run figli.
 *
 * Come funziona un run "orchestratore": il suo LLM riceve il tool
 * `delegate_to_agent` (agganciato al tool set in runner.ts). Quando lo
 * usa, questo modulo:
 *
 *  1. calcola la PROFONDITÀ di delega: catena `parent_run_id` dal run
 *     corrente fino alla radice — D6 la limita a 2 (orchestratore 0 →
 *     sub-agente 1 → sub-sub-agente 2); oltre, la delega è rifiutata;
 *  2. valida l'agente designato (esiste nel registry e appartiene al
 *     tenant — `user_agents` attivo), a men che le istruzioni non siano
 *     vuote o enormi;
 *  3. crea run + job con `trigger='delegation'` e `parent_run_id` (così
 *     la catena si vede in Mission Control) e un BUDGET CONDIVISO: il
 *     credito residuo dell'orchestratore divide il tetto — niente figli
 *     che potrebbero spendere oltre ciò che il run ha già dilapidato;
 *  4. registra la riga `agent_tasks` (stato pending) sul run dell'orche-
 *     stratore: il trigger `enforce_agent_task_graph` (schema Fase 1)
 *     impone stesso-run/tenant e assenza di cicli nei livelli ammessi;
 *  5. scrive nell'OUTPUT del tool tutto ciò che l'orchestratore deve
 *     sapere (runId figlio, task, budget) — l'esito della delega arriva
 *     quando l'orchestratore esamina la catena nei run figli.
 *
 * Errore SEMPRE leggibile: la delega fallisce mostrando il motivo al
 * modello (che può riprovare con altri argomenti), mai un'eccezione a
 * crudo che terminerebbe il run senza journal.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { getAgentRuntimeConfig } from "@/lib/agents/registry";
import type { LLMTool } from "@/lib/llm";
import { createBackgroundRun } from "@/lib/agents/background/enqueue";
import { maskSecrets } from "@/lib/agents/background/mask";
import type { AgentRunRow } from "@/types/agents-db";

/** D6: massima profondità della catena (0=orchestratore, max 2 = sub-sub). */
export const MAX_DELEGATION_DEPTH = 2;

/** Definizione LLM del tool di delega: agganciato SOLO ai run background. */
export const DELEGATION_TOOL: LLMTool = {
  name: "delegate_to_agent",
  description:
    "Delegate a sub-task to another active agent on the same account. " +
    "The sub-agent runs in background with its own context: give it a complete, " +
    "self-contained instruction (it cannot see this conversation). Use it when " +
    "part of your work needs a different agent's specialty. Max delegation depth: 2.",
  input_schema: {
    type: "object",
    properties: {
      agentSlug: {
        type: "string",
        description: "The slug of the agent to delegate to (must be active on the account)",
      },
      instructions: {
        type: "string",
        description:
          "Complete instructions for the sub-agent: what to do, inputs to use, what to return",
      },
      title: {
        type: "string",
        description: "Short task title for the mission board (optional)",
      },
    },
    required: ["agentSlug", "instructions"],
  },
};

export type DelegationArgs = {
  agentSlug: string;
  instructions: string;
  /** Titolo breve del task per la tabella realizzativa. */
  title?: string;
};

export type DelegationResult = { ok: true; childRunId: string; taskId: string }
  | { ok: false; reason: string };

/**
 * Profondità di delega del run: numero di salti dalla radice della catena
 * `parent_run_id`. Letta col client admin (service role) — nessuna riga
 * altrui viene arredata, solo l'identificatore del parent (testo).
 */
export async function runDelegationDepth(
  runId: string,
  maxHops: number = MAX_DELEGATION_DEPTH + 1,
): Promise<number> {
  const client = createAdminClient();
  if (!client) return 0;
  let currentId: string | null = runId;
  let depth = 0;
  for (let i = 0; i < maxHops; i++) {
    if (!currentId) break;
    const { data } = (await client
      .from("agent_runs")
      .select("parent_run_id")
      .eq("id", currentId)
      .maybeSingle()) as { data: { parent_run_id: string | null } | null };
    const parent = data?.parent_run_id ?? null;
    if (!parent) break;
    depth += 1;
    currentId = parent;
  }
  return depth;
}

/** Profondità del run NEW (il figlio che si vorrebbe creare). */
function childDepthOf(parentDepth: number): number {
  // root: profondità 0 → figli 1 → figli dei figli 2 → oltre vietato.
  return parentDepth + 1;
}

export async function delegateToAgent(
  run: Pick<AgentRunRow, "id" | "user_id" | "agent_slug" | "budget_max_crediti" | "crediti_usati">,
  args: DelegationArgs,
  creditsUsedNow: number,
): Promise<DelegationResult> {
  const client = createAdminClient();
  if (!client) return { ok: false, reason: "db_unavailable" };

  const agentSlug = (args.agentSlug ?? "").trim();
  const instructions = (args.instructions ?? "").trim();
  if (!agentSlug || !getAgentRuntimeConfig(agentSlug)) {
    return {
      ok: false,
      reason: "agentUnknown: l'agente designato non esiste nel catalogo",
    };
  }
  if (!instructions) {
    return {
      ok: false,
      reason: "instructionsRequired: la consegna al sub-agente non può essere vuota",
    };
  }
  if (instructions.length > 8_000) {
    return {
      ok: false,
      reason: "instructionsTooLong: la consegna al sub-agente è oltre 8000 caratteri",
    };
  }

  // D6: profondità della catena di run (la tabella agent_tasks impone
  // ≤ 2 per i TASK; transferiamo lo stesso tetto alla catena di run).
  const depth = await runDelegationDepth(run.id);
  if (childDepthOf(depth) > MAX_DELEGATION_DEPTH) {
    return {
      ok: false,
      reason:
        "depthLimit: D6 consente al massimo " +
        `${MAX_DELEGATION_DEPTH} livelli di delega (questo run è già a ${depth})`,
    };
  }

  // L'agente designato deve essere ATTIVO e posseduto dal tenant (il tool
  // non può delegare a un catalogo completo di agenti che altro non sono).
  const { data: owned } = await client
    .from("user_agents")
    .select("agent_slug")
    .eq("user_id", run.user_id)
    .eq("agent_slug", agentSlug)
    .eq("status", "active")
    .maybeSingle();
  if (!owned) {
    return {
      ok: false,
      reason: "agentNotActive: l'agente designato non è attivo su questo account",
    };
  }

  // Auto-delega: il root non può delegare a se stesso trasversalmente.
  if (agentSlug === run.agent_slug && depth === 0 && childDepthOf(depth) >= 1) {
    return {
      ok: false,
      reason: "selfDelegation: ordinare a se stesso è un ciclo D6",
    };
  }

  // Budget condiviso: il figlio non può spendere più del credito che il run
  // padre NON ha ancora usato (tetto ereditato, sempre ≥ 1 o vietato).
  const creditCap = run.budget_max_crediti ?? 50;
  const remaining = Math.max(0, creditCap - creditsUsedNow);
  if (remaining < 2) {
    return {
      ok: false,
      reason:
        "budgetExhausted: il run non ha abbastanza credito residuo " +
        `(${creditsUsedNow}/${creditCap}) per una delega`,
    };
  }
  const childBudget = Math.max(1, Math.floor(remaining / 2));

  // Esci dal run, entra nella catena: come un run qualsiasi, il child viene
  // rivendicato dal worker appena scaduto il suo scheduled_for.
  const created = await createBackgroundRun({
    tenantId: run.user_id,
    agentSlug,
    istruzioni: instructions,
    trigger: "delegation",
    parentRunId: run.id,
    budgetMaxCrediti: childBudget,
  });
  if (!created.ok) {
    return {
      ok: false,
      reason: `delegationFailed: ${created.message.replace("Creazione run fallita: ", "")}`,
    };
  }

  // Registrazione del task sul run dell'ORCHESTRATORE (sul run di chi
  // delega, non sul child: la riga è un'istruzione che il padre dà).
  const titolo = maskSecrets((args.title ?? instructions).trim().slice(0, 300));
  const { data: task, error: taskError } = await client
    .from("agent_tasks")
    .insert({
      run_id: run.id,
      tenant_id: run.user_id,
      titolo: `→ ${agentSlug}: ${titolo}`,
      assegnato_ad: agentSlug,
      dipende_da: [],
      stato: "pending",
      input: maskSecrets(instructions.slice(0, 8_000)),
      profondita: depth,
    })
    .select("id")
    .single();
  if (taskError || !task) {
    // Il run child esiste ma il task non è tracciato: Mission Control lo
    // mostra comunque (catena parent). Il dettaglio del task è best-effort.
    console.error(
      "delegation: agent_tasks fallito",
      (taskError as { message?: string } | null)?.message,
    );
    return { ok: true, childRunId: created.runId, taskId: "untracked" };
  }

  return { ok: true, childRunId: created.runId, taskId: task.id };
}

/**
 * Output testuale del tool per il modello: compatta, con ancore a ciò che
 * conta (id del child, task, budget).
 */
export function delegationOutputText(result: DelegationResult): string {
  if (!result.ok) return result.reason;
  return (
    `Delega inoltrata: sub-run ${result.childRunId} (task ${result.taskId}). ` +
    `Il sub-run eseguirà autonomamente; l'esito complessivo della missione ` +
    `è osservabile in Mission Control e nella catena dei run figli.`
  );
}

/**
 * I 3 template pronti di orchestrazione (Fase 6): la dashboard li propone e
 * il modello li usa come schema. In italiano: le istruzioni valgono per
 * qualunque lingua (la lingua di risposta si determina a run-time).
 */
export const ORCHESTRATION_TEMPLATES = [
  {
    slug: "catalog-sync",
    titolo: "Catalogo coerente su Shopify",
    istruzioni:
      "Sei l'orchestratore. Coordina i tuoi sub-agenti per: (1) delega a un agente " +
      "commerce un audit del catalogo Shopify (descrizioni, prezzi, stock); " +
      "(2) delega gli aggiornamenti essenziali che l'audit ha individuato, " +
      "entro il budget condiviso. Al termine, riepiloghi cosa è cambiato.",
  },
  {
    slug: "lead-triage",
    titolo: "Triage dei lead",
    istruzioni:
      "Sei l'orchestratore. Per ogni nuovo lead (tool lead_capture_submit): delega " +
      "a un agente analista la qualificazione, poi delega a un agente vendite la " +
      "notifica al team. Attenzione al budget condiviso: nessuna delega superflua.",
  },
  {
    slug: "report-chain",
    titolo: "Report settimanale in catena",
    istruzioni:
      "Sei l'orchestratore. Delega a un agente ricerca dati la raccolta (analytics, " +
      "ordini, engagement), poi delega a un agente scrittura la redazione del " +
      "report e infine verificane la qualità. Il risultato va salvato come artifact.",
  },
] as const;
