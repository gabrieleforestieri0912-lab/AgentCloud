create table if not exists public.tenant_integrations (
  id uuid default gen_random_uuid() primary key,
  tenant_id text not null,
  provider text not null check (provider in ('notion','slack','hubspot','google_sheets','github','linear','asana')),
  status text not null default 'pending' check (status in ('connected','disconnected','error','pending')),
  access_token text, -- encrypted envelope, nullable only during pending/error
  refresh_token text, -- encrypted envelope, nullable (Slack/Notion may not issue)
  expires_at timestamptz,
  scope text,
  external_account_id text, -- GitHub login, Slack team id, HubSpot portal id, Notion workspace id, Linear/Asana user id
  metadata jsonb default '{}'::jsonb, -- workspace name, etc.
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (tenant_id, provider)
);

-- Migrazione provider: rimozione 'stripe', aggiunta 'github'/'linear'/'asana'.
-- Necessaria per DB già esistenti: `create table if not exists` non aggiorna il check.
-- Elimina le eventuali righe del provider rimosso, altrimenti il nuovo check fallisce.
delete from public.tenant_integrations where provider = 'stripe';
alter table public.tenant_integrations
  drop constraint if exists tenant_integrations_provider_check;
alter table public.tenant_integrations
  add constraint tenant_integrations_provider_check
  check (provider in ('notion','slack','hubspot','google_sheets','github','linear','asana'));

create index if not exists idx_tenant_integrations_tenant
  on public.tenant_integrations(tenant_id);
create index if not exists idx_tenant_integrations_provider
  on public.tenant_integrations(provider);
create index if not exists idx_tenant_integrations_tenant_provider
  on public.tenant_integrations(tenant_id, provider);

alter table public.tenant_integrations enable row level security;

-- Users can view their own integrations (text compare to allow __tenant__ via service role bypass)
drop policy if exists "Users can view own tenant integrations" on public.tenant_integrations;
create policy "Users can view own tenant integrations"
  on public.tenant_integrations for select
  using (auth.uid()::text = tenant_id);

-- Users can insert their own integrations (callback upserts via service role, but allow self-insert)
drop policy if exists "Users can insert own tenant integrations" on public.tenant_integrations;
create policy "Users can insert own tenant integrations"
  on public.tenant_integrations for insert
  with check (auth.uid()::text = tenant_id);

-- Users can update their own integrations
drop policy if exists "Users can update own tenant integrations" on public.tenant_integrations;
create policy "Users can update own tenant integrations"
  on public.tenant_integrations for update
  using (auth.uid()::text = tenant_id)
  with check (auth.uid()::text = tenant_id);

-- Users can delete their own integrations (disconnect)
drop policy if exists "Users can delete own tenant integrations" on public.tenant_integrations;
create policy "Users can delete own tenant integrations"
  on public.tenant_integrations for delete
  using (auth.uid()::text = tenant_id);

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
