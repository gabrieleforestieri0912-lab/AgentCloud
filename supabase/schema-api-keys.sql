-- -----------------------------------------------------------------------------
-- AgentCloud · API keys per integrazioni esterne (api_keys)
-- -----------------------------------------------------------------------------
-- Una riga = una API key (`ack_…`) creata dall'utente in /account per usare i
-- suoi agenti dentro progetti esterni via POST /api/v1/run:
--   Authorization: Bearer ack_...
--   { "agent": "<slug-abbonato>", "messages": [...] }
--
-- Differenza dai token CLI (api_tokens): la key può essere limitata a UN solo
-- agente (agent_slug); null = tutti gli agenti posseduti. A ogni chiamata il
-- server verifica comunque l'abbonamento attivo (user_agents): senza
-- abbonamento la key non basta.
--
-- Sicurezza: nel DB finisce SOLO lo SHA-256 della key, mai in chiaro — che
-- viene mostrata una sola volta alla creazione. La revoca imposta revoked_at.
-- Come api_tokens/shared_chats: RLS attiva senza policy pubbliche, accesso
-- solo dalle API server (service role). Applicare da Supabase Dashboard →
-- SQL editor.
-- -----------------------------------------------------------------------------

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  name text not null default 'Integrazione',
  key_hash text not null unique,
  prefix text not null default '',
  agent_slug text,
  created_at timestamptz default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create index if not exists idx_api_keys_user
  on public.api_keys(user_id);

create index if not exists idx_api_keys_hash
  on public.api_keys(key_hash);

alter table public.api_keys enable row level security;

-- Nessuna policy pubblica: lettura/scrittura solo via service role dalle
-- API server (/api/user/keys, /api/v1/run). Il proprietario gestisce le key
-- via API autenticata (la API verifica user_id riga per riga).
