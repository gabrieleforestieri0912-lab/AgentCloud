-- =============================================================================
-- AgentCloud — Generic multi-provider integrations: Phase 1 schema
-- =============================================================================
-- Generic table for Stripe Connect, Notion, Slack, HubSpot, Google Sheets.
-- Separate from shopify_connections (do not modify Shopify tables).
-- Tokens are stored ENCRYPTED at rest as text (AES-256-GCM envelope
-- { data, iv, tag } base64 — application-level encryption in the Edge
-- Function, key from SUPABASE_SERVICE_ROLE / INTEGRATIONS_TOKEN_ENCRYPTION_KEY,
-- never client-side). DB never stores plaintext. See
-- docs/integrations-setup.md and Phase 1 decision below.
--
-- Encryption decision (documented, fallback = app-level):
--   Proposed & adopted: application-level encryption in Edge Functions
--   (mirrors Shopify pattern: SHOPIFY_TOKEN_ENCRYPTION_KEY / 
--   GOOGLE_TOKEN_ENCRYPTION_KEY, AES-256-GCM, key derived via SHA-256 from
--   INTEGRATIONS_TOKEN_ENCRYPTION_KEY or SUPABASE_SERVICE_ROLE_KEY).
--   Alternative considered: Supabase Vault / pgsodium (column-level
--   encryption at rest). Rejected for Phase 1 because: (1) Vault requires
--   enabling pgsodium + key management in project, (2) per-tenant RLS +
--   service_role bypass already isolates rows, (3) app-level keeps
--   decrypt auto-refresh logic inside Edge Functions without DB
--   extensions. Can be revisited if compliance requires TDE without app key.
--   Confirm with Gabriele before switching — default stays app-level.
--
-- Apply AFTER schema.sql (needs public.touch_updated_at()).
-- RLS: tenant (auth.users) may only read/write its own rows
--      (mirror of shopify_connections RLS: auth.uid() = tenant_id).
--      Service role bypasses RLS for token exchange / proxy.
-- =============================================================================

-- Tenant model: in AgentCloud tenant == authenticated user (auth.users.id).
-- Spec example says tenant_id uuid FK -> tenants; here tenants are auth.users.
-- Using uuid FK to auth.users(id) keeps consistency with profiles(id).
create table if not exists public.tenant_integrations (
  id uuid default gen_random_uuid() primary key,
  tenant_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('stripe','notion','slack','hubspot','google_sheets')),
  status text not null default 'pending' check (status in ('connected','disconnected','error','pending')),
  access_token text, -- encrypted envelope, nullable only during pending/error
  refresh_token text, -- encrypted envelope, nullable (Slack/Notion may not issue)
  expires_at timestamptz,
  scope text,
  external_account_id text, -- Stripe acct id, Slack team id, HubSpot portal id, Notion workspace id
  metadata jsonb default '{}'::jsonb, -- workspace name, etc.
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (tenant_id, provider)
);

create index if not exists idx_tenant_integrations_tenant
  on public.tenant_integrations(tenant_id);
create index if not exists idx_tenant_integrations_provider
  on public.tenant_integrations(provider);
create index if not exists idx_tenant_integrations_tenant_provider
  on public.tenant_integrations(tenant_id, provider);

alter table public.tenant_integrations enable row level security;

-- Users can view their own integrations
drop policy if exists "Users can view own tenant integrations" on public.tenant_integrations;
create policy "Users can view own tenant integrations"
  on public.tenant_integrations for select
  using (auth.uid() = tenant_id);

-- Users can insert their own integrations (callback upserts via service role, but allow self-insert)
drop policy if exists "Users can insert own tenant integrations" on public.tenant_integrations;
create policy "Users can insert own tenant integrations"
  on public.tenant_integrations for insert
  with check (auth.uid() = tenant_id);

-- Users can update their own integrations
drop policy if exists "Users can update own tenant integrations" on public.tenant_integrations;
create policy "Users can update own tenant integrations"
  on public.tenant_integrations for update
  using (auth.uid() = tenant_id)
  with check (auth.uid() = tenant_id);

-- Users can delete their own integrations (disconnect)
drop policy if exists "Users can delete own tenant integrations" on public.tenant_integrations;
create policy "Users can delete own tenant integrations"
  on public.tenant_integrations for delete
  using (auth.uid() = tenant_id);

-- Service role manages everything (OAuth callback, Edge Function proxy, refresh)
drop policy if exists "Service role can manage tenant integrations" on public.tenant_integrations;
create policy "Service role can manage tenant integrations"
  on public.tenant_integrations for all
  using (true)
  with check (true);

drop trigger if exists trg_tenant_integrations_updated_at on public.tenant_integrations;
create trigger trg_tenant_integrations_updated_at
  before update on public.tenant_integrations
  for each row execute function public.touch_updated_at();
