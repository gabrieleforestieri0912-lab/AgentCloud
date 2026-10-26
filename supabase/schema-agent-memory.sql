create table if not exists public.agent_memory_items (
  id uuid default gen_random_uuid() primary key,
  tenant_id text not null,
  agent_id text not null,
  user_id text not null,
  type text not null check (type in ('fact', 'preference', 'summary', 'event', 'meta')),
  content text not null,
  embedding jsonb,
  importance real not null default 0.5 check (importance >= 0 and importance <= 1),
  created_at timestamptz not null default now(),
  last_accessed_at timestamptz not null default now(),
  expires_at timestamptz,
  source_conversation_id text
);

-- Indice principale: le query filtrano sempre per tenant + agente + soggetto
-- e ordinano per data di creazione.
create index if not exists idx_agent_memory_scope
  on public.agent_memory_items (tenant_id, agent_id, user_id, created_at desc);

-- Filtro per tipo (endpoint di lista e cancellazione per tipo).
create index if not exists idx_agent_memory_type
  on public.agent_memory_items (tenant_id, agent_id, user_id, type);

-- Pulizia degli item scaduti.
create index if not exists idx_agent_memory_expires
  on public.agent_memory_items (expires_at)
  where expires_at is not null;

alter table public.agent_memory_items enable row level security;

-- L'utente autenticato vede e modifica solo la memoria del proprio tenant.
drop policy if exists "Users manage own agent_memory_items" on public.agent_memory_items;
create policy "Users manage own agent_memory_items"
  on public.agent_memory_items for all
  using (auth.uid()::text = tenant_id)
  with check (auth.uid()::text = tenant_id);

-- Il codice server usa la service role: la policy resta limitata al ruolo
-- service_role, come le altre tabelle del progetto.
drop policy if exists "Service role can manage agent_memory_items" on public.agent_memory_items;
create policy "Service role can manage agent_memory_items"
  on public.agent_memory_items for all
  to service_role
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------
-- Configurazione della memoria per agente (per tenant).
--
-- Una riga per (tenant, agente): accende o spegne la memoria e ne regola i
-- parametri. Le colonne NULL ereditano il default del progetto
-- (variabili d'ambiente), così si cambia solo quello che serve.
-- ---------------------------------------------------------------------------
create table if not exists public.agent_memory_config (
  tenant_id text not null,
  agent_id text not null,
  enabled boolean not null default true,
  ttl_days integer,
  retrieval_k integer,
  token_budget integer,
  short_term_token_threshold integer,
  dedupe_threshold real,
  updated_at timestamptz not null default now(),
  primary key (tenant_id, agent_id)
);

alter table public.agent_memory_config enable row level security;

drop policy if exists "Users manage own agent_memory_config" on public.agent_memory_config;
create policy "Users manage own agent_memory_config"
  on public.agent_memory_config for all
  using (auth.uid()::text = tenant_id)
  with check (auth.uid()::text = tenant_id);

drop policy if exists "Service role can manage agent_memory_config" on public.agent_memory_config;
create policy "Service role can manage agent_memory_config"
  on public.agent_memory_config for all
  to service_role
  using (true)
  with check (true);
