/**
 * Store delle approvazioni (Fase 4) — il complemento di store.ts.
 *
 * Un run L1 che vuole un tool con effetti si ferma: una riga `agent_approvals`
 * pending nasce, il run passa `waiting_approval`, il job si chiude (senza
 * tentativi bruciati). Quando l'utente decide:
 *   • approved / edited → run torna `queued` + nuovo job: alla ripresa il
 *     runner trova l'approvazione approvata per (run, tool) e la CONSUMA
 *     (`consumed=true`, colonna della Fase 4): il tool non salta due volte;
 *   • edited → il payload dell'esecuzione diventa quello modificato; il
 *     contatore di approvazioni consecutive si azzera;
 *   • rejected → run `failed` con errore leggibile.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import type { AgentApprovalRow } from "@/types/agents-db";

export type PendingApproval = {
  stepId: string | null;
  toolName: string;
  input: Record<string, unknown>;
  label?: string;
};

function db() {
  return createAdminClient();
}

/** Crea la riga di approvazione pending per (run, tool). */
export async function createPendingApproval(
  runId: string,
  tenantId: string,
  agentSlug: string,
  pending: PendingApproval,
): Promise<AgentApprovalRow | null> {
  const client = db();
  if (!client) return null;
  try {
    const { data, error } = await client
      .from("agent_approvals")
      .insert({
        run_id: runId,
        tenant_id: tenantId,
        agent_slug: agentSlug,
        azione: {
          tool: pending.toolName,
          input: pending.input,
          ...(pending.label ? { label: pending.label } : {}),
        },
        stato: "pending",
      })
      .select("*")
      .single();
    if (error) {
      console.error("approvals: insert fallito", error.message);
      return null;
    }
    return data as AgentApprovalRow;
  } catch (err) {
    console.error("approvals: insert eccezione", String(err));
    return null;
  }
}

/**
 * Trova l'approvazione APPROVATA da consumare per (run, tool). Consumata via
 * update guarded (`consumed=false → true` CAS): solo la prima ripresa vince.
 */
export async function consumeApprovedApproval(
  runId: string,
  tenantId: string,
  toolName: string,
): Promise<AgentApprovalRow | null> {
  const client = db();
  if (!client) return null;
  try {
    const { data } = await client
      .from("agent_approvals")
      .select("*")
      .eq("run_id", runId)
      .eq("tenant_id", tenantId)
      .in("stato", ["approved", "edited"])
      .eq("azione->>tool", toolName)
      .eq("consumed", false)
      .order("created_at")
      .limit(1)
      .maybeSingle();
    if (!data) return null;
    const row = data as AgentApprovalRow;
    const { error } = await client
      .from("agent_approvals")
      .update({ consumed: true })
      .eq("id", row.id)
      .eq("consumed", false);
    if (error) return null;
    // doppio check ottimista: riletta per evitare la corsa di due worker
    const { data: verify } = await client
      .from("agent_approvals")
      .select("consumed")
      .eq("id", row.id)
      .maybeSingle();
    return verify && verify.consumed && !error ? row : null;
  } catch {
    return null;
  }
}

/** Quante approvazioni pending ha il tenant (Mission Control). */
export async function countPendingApprovals(
  tenantId: string,
): Promise<number> {
  const client = db();
  if (!client) return 0;
  try {
    const { count, error } = await client
      .from("agent_approvals")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("stato", "pending");
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}
