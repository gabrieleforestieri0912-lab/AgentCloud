-- -----------------------------------------------------------------------------
-- AgentCloud · Connessioni MCP (mcp_connections)
-- -----------------------------------------------------------------------------
-- Una riga per (utente, server). I segreti (access token, refresh token,
-- client secret, API key) sono cifrati a riposo dall'applicazione
-- (AES-256-GCM, chiave in INTEGRATIONS_TOKEN_ENCRYPTION_KEY): la colonna
-- contiene un envelope JSON, mai il token in chiaro.
--
-- Script idempotente: puoi rieseguirlo quante volte vuoi.
--
-- `server_id` è l'id della voce del registro (src/lib/mcp/registry.ts) oppure
-- `custom:<uuid>` per i server MCP aggiunti a mano dall'utente.
-- -----------------------------------------------------------------------------

create extension if not exists pgcrypto;

-- Helper condiviso (creata anche da schema.sql / schema-integrations.sql).
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;


-- -----------------------------------------------------------------------------
-- 1. Tabella
-- -----------------------------------------------------------------------------
create table if not exists public.mcp_connections (
  id uuid default gen_random_uuid() primary key,
  -- auth.uid() dell'utente: i token sono isolati per utente.
  tenant_id text not null,
  -- id nel registro, oppure `custom:<uuid>`.
  server_id text not null,
  -- connected | pending | error | reconnect_required | disconnected
  status text not null default 'pending'
    check (status in ('connected','pending','error','reconnect_required','disconnected')),
  -- streamable_http | sse | stdio
  transport text not null default 'streamable_http',
  -- Endpoint del server MCP (null per i connettori nativi).
  url text,
  -- Envelope cifrato (AES-256-GCM). MAI in chiaro.
  access_token text,
  -- Envelope cifrato. MAI in chiaro.
  refresh_token text,
  expires_at timestamptz,
  scope text,
  -- client_id della registrazione OAuth (Dynamic Client Registration).
  client_id text,
  -- Envelope cifrato: il client_secret emesso dal provider.
  client_secret text,
  -- Envelope cifrato: API key dei server MCP con autenticazione a chiave.
  api_key text,
  -- Tool abilitati dall'utente. NULL = default (solo tool di lettura).
  enabled_tools jsonb,
  -- Cache dell'ultimo tools/list: nome, descrizione e annotation.
  tools_snapshot jsonb,
  -- Dati pubblici e stato interno del flusso OAuth (mai token).
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (tenant_id, server_id)
);


-- -----------------------------------------------------------------------------
-- 2. Indici
-- -----------------------------------------------------------------------------
create index if not exists idx_mcp_connections_tenant
  on public.mcp_connections(tenant_id);
create index if not exists idx_mcp_connections_tenant_server
  on public.mcp_connections(tenant_id, server_id);


-- -----------------------------------------------------------------------------
-- 3. Row Level Security
-- -----------------------------------------------------------------------------
alter table public.mcp_connections enable row level security;

-- L'utente vede solo le proprie connessioni.
drop policy if exists "Users can view own mcp connections" on public.mcp_connections;
create policy "Users can view own mcp connections"
  on public.mcp_connections for select
  using (auth.uid()::text = tenant_id);

-- La scrittura passa dal server (service role): le route OAuth, la UI dei
-- toggle e la disconnessione scrivono lato server. L'utente non scrive
-- direttamente, così nessun token viene scritto dal browser.
drop policy if exists "Users can insert own mcp connections" on public.mcp_connections;
create policy "Users can insert own mcp connections"
  on public.mcp_connections for insert
  with check (auth.uid()::text = tenant_id);

drop policy if exists "Users can update own mcp connections" on public.mcp_connections;
create policy "Users can update own mcp connections"
  on public.mcp_connections for update
  using (auth.uid()::text = tenant_id)
  with check (auth.uid()::text = tenant_id);

drop policy if exists "Users can delete own mcp connections" on public.mcp_connections;
create policy "Users can delete own mcp connections"
  on public.mcp_connections for delete
  using (auth.uid()::text = tenant_id);

-- Service role: tutto (callback OAuth, refresh, proxy dei tool, disconnessione).
drop policy if exists "Service role can manage mcp connections" on public.mcp_connections;
create policy "Service role can manage mcp connections"
  on public.mcp_connections for all to service_role
  using (true) with check (true);


-- -----------------------------------------------------------------------------
-- 4. Trigger updated_at
-- -----------------------------------------------------------------------------
drop trigger if exists trg_mcp_connections_updated_at on public.mcp_connections;
create trigger trg_mcp_connections_updated_at
  before update on public.mcp_connections
  for each row execute function public.touch_updated_at();


-- -----------------------------------------------------------------------------
-- 5. Verifica rapida (opzionale)
-- -----------------------------------------------------------------------------
-- select server_id, status, count(*) over (partition by tenant_id)
--   from public.mcp_connections order by updated_at desc;
