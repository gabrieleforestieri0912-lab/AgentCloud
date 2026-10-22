/**
 * Configurazione della memoria per agente (tabella `agent_memory_config`).
 *
 * Una riga per (tenant, agente): accende o spegne la memoria e ne regola i
 * parametri. Le colonne NULL ereditano il default del progetto (variabili
 * d'ambiente), così si tocca solo quello che serve.
 *
 * Server-only: usa il client Supabase con service role.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import type { MemoryConfig } from "./config";

/** Riga di `agent_memory_config`. */
export type AgentMemoryConfigRow = {
  tenant_id: string;
  agent_id: string;
  enabled: boolean;
  ttl_days: number | null;
  retrieval_k: number | null;
  token_budget: number | null;
  short_term_token_threshold: number | null;
  dedupe_threshold: number | null;
  updated_at: string;
};

/**
 * Ritorna gli override di configurazione di un agente.
 *
 * `null` quando non c'è una riga (si usano i default) o quando il database
 * non è raggiungibile: la memoria deve funzionare anche senza configurazione.
 */
export async function getAgentMemoryConfig(
  tenantId: string,
  agentId: string,
): Promise<Partial<MemoryConfig> | null> {
  const admin = createAdminClient();
  if (!admin || !tenantId || !agentId) return null;
  try {
    const { data, error } = await admin
      .from("agent_memory_config")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("agent_id", agentId)
      .maybeSingle();
    if (error || !data) return null;
    const row = data as unknown as AgentMemoryConfigRow;
    return rowToOverrides(row);
  } catch (error) {
    console.error("memory: reading the agent configuration failed", error);
    return null;
  }
}

/** Converte la riga in override parziali della configurazione. */
export function rowToOverrides(
  row: AgentMemoryConfigRow,
): Partial<MemoryConfig> {
  const overrides: Partial<MemoryConfig> = { enabled: row.enabled !== false };
  if (typeof row.ttl_days === "number") overrides.ttlDays = row.ttl_days;
  if (typeof row.retrieval_k === "number") overrides.retrievalK = row.retrieval_k;
  if (typeof row.token_budget === "number") overrides.tokenBudget = row.token_budget;
  if (typeof row.short_term_token_threshold === "number") {
    overrides.shortTermTokenThreshold = row.short_term_token_threshold;
  }
  if (typeof row.dedupe_threshold === "number") {
    overrides.dedupeThreshold = row.dedupe_threshold;
  }
  return overrides;
}

/** Patch della configurazione, accettata dall'endpoint REST. */
export type AgentMemoryConfigPatch = {
  enabled?: boolean;
  ttlDays?: number;
  retrievalK?: number;
  tokenBudget?: number;
  shortTermTokenThreshold?: number;
  dedupeThreshold?: number;
};

/**
 * Scrive la configurazione di un agente.
 *
 * Le colonne non indicate diventano NULL (ereditano il default): così
 * "accendi la memoria" non sovrascrive i parametri già scelti.
 */
export async function saveAgentMemoryConfig(
  tenantId: string,
  agentId: string,
  patch: AgentMemoryConfigPatch,
): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin || !tenantId || !agentId) return false;
  const payload: Record<string, unknown> = {
    tenant_id: tenantId,
    agent_id: agentId,
    updated_at: new Date().toISOString(),
  };
  if (patch.enabled !== undefined) payload.enabled = patch.enabled;
  if (patch.ttlDays !== undefined) payload.ttl_days = patch.ttlDays;
  if (patch.retrievalK !== undefined) payload.retrieval_k = patch.retrievalK;
  if (patch.tokenBudget !== undefined) payload.token_budget = patch.tokenBudget;
  if (patch.shortTermTokenThreshold !== undefined) {
    payload.short_term_token_threshold = patch.shortTermTokenThreshold;
  }
  if (patch.dedupeThreshold !== undefined) {
    payload.dedupe_threshold = patch.dedupeThreshold;
  }
  try {
    const { error } = await admin
      .from("agent_memory_config")
      .upsert(payload as never, { onConflict: "tenant_id,agent_id" });
    if (error) {
      console.error("memory: saving the agent configuration failed", error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("memory: saving the agent configuration failed", error);
    return false;
  }
}
