-- =============================================================================
-- Fase 4 — Approvazioni: consumo once-only delle decisioni approvate
--
-- `consumed` impedisce che un'approvazione approvata esegua il tool più DI
-- UNA VOLTA (doppia ripresa del run, modello che rilancia il tool call). Il
-- consumo è un update guarded: non c'è perdente in corsa a farne due.
-- =============================================================================

alter table if exists public.agent_approvals
  add column if not exists consumed boolean not null default false;
