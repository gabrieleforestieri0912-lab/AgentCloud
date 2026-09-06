-- =============================================================================
-- AgentCloud — Google (Gmail + Calendar) OAuth: Phase 1 schema
-- =============================================================================
-- Per-user Google connections. One row per AgentCloud user (upsert on user_id).
-- access_token and refresh_token are stored ENCRYPTED at rest as a jsonb
-- envelope { data, iv, tag } produced by the application (AES-256-GCM, key
-- from GOOGLE_TOKEN_ENCRYPTION_KEY) — the exact same storage approach already
-- used by shopify_connections (schema-shopify-oauth.sql). The database NEVER
-- stores plaintext tokens.
--
-- Apply AFTER schema.sql (or schema-waitlist.sql): this relies on the
-- public.touch_updated_at() trigger function already created by those files.
--
-- Row Level Security: users may SELECT/UPDATE/DELETE only their own row.
-- There is intentionally NO client INSERT policy: rows are created/upserted
-- only by the OAuth callback running with the service role (Phase 2), so a
-- user cannot write arbitrary connection rows. The service role (callback,
-- token refresh, API proxy) bypasses RLS.
--
-- Runtime (Phase 3-4): access tokens are refreshed automatically by
-- src/lib/google/token.ts before each call; the typed read-only proxy
-- (src/lib/google/api-proxy.ts + POST /api/google/proxy) exposes list_emails
-- and get_calendar_events to the Email Manager and Calendar Booking agents.
-- =============================================================================

create table if not exists public.google_connections (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  google_email text,
  access_token jsonb not null,
  refresh_token jsonb not null,
  scopes text[] not null default '{}',
  expires_at timestamptz,
  connected_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id)
);

create index if not exists idx_google_connections_user
  on public.google_connections(user_id);
create index if not exists idx_google_connections_email
  on public.google_connections(google_email);

alter table public.google_connections enable row level security;

-- Users can only read their own connection (never the token envelopes of others).
drop policy if exists "Users can view own google connection" on public.google_connections;
create policy "Users can view own google connection"
  on public.google_connections for select
  using (auth.uid() = user_id);

-- NOTE: no INSERT policy on purpose — the OAuth callback (service role) is the
-- only writer, so users cannot forge connection rows for other accounts.

-- Users can only update their own connection.
drop policy if exists "Users can update own google connection" on public.google_connections;
create policy "Users can update own google connection"
  on public.google_connections for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Users can only delete (disconnect) their own connection.
drop policy if exists "Users can delete own google connection" on public.google_connections;
create policy "Users can delete own google connection"
  on public.google_connections for delete
  using (auth.uid() = user_id);

-- Service role manages everything (callback upsert, token refresh, API proxy).
drop policy if exists "Service role can manage google connections" on public.google_connections;
create policy "Service role can manage google connections"
  on public.google_connections for all
  using (true)
  with check (true);

drop trigger if exists trg_google_connections_updated_at on public.google_connections;
create trigger trg_google_connections_updated_at
  before update on public.google_connections
  for each row execute function public.touch_updated_at();