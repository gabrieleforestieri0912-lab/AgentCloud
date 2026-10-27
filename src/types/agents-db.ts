/**
 * Tipi delle tabelle agenti autonomi (Fase 1).
 *
 * Specchio TypeScript di supabase/schema-agents.sql + delle colonne aggiunte
 * a `agent_runs`. Nel repository non esiste la pipeline `supabase gen types`
 * (non c'è supabase/config.toml né migrations/: gli schema sono file piatti
 * applicati a mano) — finché non viene introdotta, questo file è la fonte dei
 * tipi e va aggiornato IN CORSIA CON lo schema (un vincolo violato o una
 * colonna mancante si vedono dal typecheck e dai test RLS, non da altro).
 *
 * Quando (Fase 7 o dopo) si aggiunge la CLI Supabase, rigenerare con:
 *   npx supabase gen types typescript --local > src/types/agents-db.ts
 * e allineare i nomi (le colonne sono in snake_case, come nel DB).
 */

/** Identità di tenant: auth.uid() — stesso valore di user_id/tenant_id. */
export type TenantId = string;

/** Livelli Autonomy Ladder (D11): L0 osserva · L1 propone · L2 agisce · L3 autonomo. */
export type AutonomyLevel = "L0" | "L1" | "L2" | "L3";

/** Stato di un run. `completed` è il valore legacy delle chat pre-migrazione. */
export type AgentRunStatus =
  | "queued"
  | "running"
  | "waiting_approval"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "completed";

/** Origine del run (colonna `trigger`). */
export type AgentRunTrigger = "manual" | "schedule" | "delegation";

/** Tipo di passo nel journal (Replay). */
export type AgentRunStepType = "llm" | "tool" | "delegation" | "approval" | "system";

/** Stato di un job in coda. */
export type AgentJobStatus = "queued" | "running" | "done" | "failed" | "cancelled";

/** Stato di una richiesta di approvazione. */
export type AgentApprovalStatus = "pending" | "approved" | "rejected" | "edited";

/** Stato di un task del multi-agente. */
export type AgentTaskStatus = "pending" | "running" | "succeeded" | "failed" | "skipped";

/** Stato di uno schedule. */
export type AgentScheduleStatus = "active" | "paused";

export interface AgentScheduleRow {
  id: string;
  tenant_id: TenantId;
  agent_slug: string;
  name: string;
  instructions: string;
  cron: string;
  timezone: string;
  status: AgentScheduleStatus;
  next_run_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  consecutive_failures: number;
  last_run_at: string | null;
}

/**
 * Riga di `agent_runs`: la tabella PREISTENTE (billing + chat), estesa in
 * Fase 1. Le colonne pre-migrazione sono obbligatorie; quelle estese sono
 * nullable perché le righe legacy non le hanno.
 */
export interface AgentRunRow {
  id: string;
  user_id: TenantId;
  user_agent_id: string | null;
  agent_slug: string;
  conversation_id: string | null;
  status: AgentRunStatus;
  input_tokens: number | null;
  output_tokens: number | null;
  tool_calls: number | null;
  started_at: string | null;
  finished_at: string | null;
  // ── estensione Fase 1 ──────────────────────────────────────────────
  trigger: AgentRunTrigger;
  schedule_id: string | null;
  parent_run_id: string | null;
  budget_max_step: number | null;
  budget_max_crediti: number | null;
  crediti_usati: number;
  errore: string | null;
  istruzioni: string | null;
}

export interface AgentRunStepRow {
  id: string;
  run_id: string;
  tenant_id: TenantId;
  indice: number;
  tipo: AgentRunStepType;
  input: Record<string, unknown> | null;
  output: string | null;
  tool_name: string | null;
  durata_ms: number | null;
  crediti: number;
  created_at: string;
}

export interface AgentJobRow {
  id: string;
  run_id: string;
  tenant_id: TenantId;
  scheduled_for: string;
  tentativi: number;
  max_tentativi: number;
  locked_at: string | null;
  locked_by: string | null;
  stato: AgentJobStatus;
  ultimo_errore: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentTaskRow {
  id: string;
  run_id: string;
  tenant_id: TenantId;
  titolo: string;
  assegnato_ad: string;
  dipende_da: string[];
  stato: AgentTaskStatus;
  input: string | null;
  output: string | null;
  profondita: number;
  created_at: string;
  updated_at: string;
}

/** Payload dell'azione proposta in `agent_approvals.azione` (mai segreti). */
export interface AgentApprovalAction {
  tool: string;
  input: Record<string, unknown>;
  /** Riepilogo leggibile mostrato nella schermata approvazioni. */
  label?: string;
}

export interface AgentApprovalRow {
  id: string;
  run_id: string;
  step_id: string | null;
  tenant_id: TenantId;
  agent_slug: string;
  azione: AgentApprovalAction;
  stato: AgentApprovalStatus;
  decisa_da: string | null;
  decisa_il: string | null;
  modificata: boolean;
  created_at: string;
}

export interface AgentAutonomyRow {
  id: string;
  tenant_id: TenantId;
  agent_slug: string;
  /** `null` = riga di default dell'agente (una sola per tenant+agente). */
  azione: string | null;
  livello: AutonomyLevel;
  approvazioni_consecutive_ok: number;
  promozione_suggerita: boolean;
  created_at: string;
  updated_at: string;
}
