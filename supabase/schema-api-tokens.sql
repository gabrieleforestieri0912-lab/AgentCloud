-- -----------------------------------------------------------------------------
-- AgentCloud · Token API personali per la CLI (api_tokens)
-- -----------------------------------------------------------------------------
-- Una riga = un token personale (`act_…`) generato dall'utente nelle
-- impostazioni (pagina /account). La CLI lo usa così:
--   agentcloud login --token act_...
-- oppure via env AGENTCLOUD_TOKEN, senza passare dal browser.
--
-- Sicurezza: nel DB finisce SOLO lo SHA-256 del token (token_hash), mai il
-- token in chiaro — che viene mostrato una sola volta alla creazione. La
-- revoca imposta revoked_at (il token smette subito di funzionare) e la
-- cancellazione dell'account deve cancellare anche queste righe
-- (vedi /api/account/delete).
-- Come shared_chats: RLS attiva senza policy pubbliche, accesso solo dalle
-- API server (service role). Applicare da Supabase Dashboard → SQL editor.
-- -----------------------------------------------------------------------------

create table if not exists public.api_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  name text not null default 'CLI',
  token_hash text not null unique,
  prefix text not null default '',
  created_at timestamptz default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create index if not exists idx_api_tokens_user
  on public.api_tokens(user_id);

create index if not exists idx_api_tokens_hash
  on public.api_tokens(token_hash);

alter table public.api_tokens enable row level security;

-- Nessuna policy pubblica: lettura/scrittura solo via service role dalle
-- API server (/api/user/tokens). Il proprietario gestisce i token via API
-- autenticata (la API verifica user_id riga per riga).
