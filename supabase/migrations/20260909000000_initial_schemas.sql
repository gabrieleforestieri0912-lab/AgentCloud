-- =============================================================================
-- AgentCloud — Combined Migration (all schemas, idempotent)
-- =============================================================================
-- Apply order: schema-waitlist → schema.sql → schema-integrations →
--              schema-shopify-oauth → schema-google-oauth → schema-waitlist-beta-access
-- All statements use IF NOT EXISTS / DROP IF EXISTS for safety.
-- =============================================================================

-- -------------------------------------------------------------------------
-- 0. Helpers (from schema-waitlist)
-- -------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;


-- -------------------------------------------------------------------------
-- 1. profiles (from schema-waitlist)
-- -------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  stripe_customer_id text unique,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_profiles_stripe_customer
  on public.profiles(stripe_customer_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

drop policy if exists "Service role can manage profiles" on public.profiles;
create policy "Service role can manage profiles"
  on public.profiles for all
  using (true)
  with check (true);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();


-- -------------------------------------------------------------------------
-- 2. waitlist (from schema-waitlist)
-- -------------------------------------------------------------------------
create table if not exists public.waitlist (
  id uuid default gen_random_uuid() primary key,
  email text not null unique,
  created_at timestamptz default now(),
  notified boolean default false
);

alter table public.waitlist enable row level security;

drop policy if exists "Anyone can insert waitlist" on public.waitlist;
create policy "Anyone can insert waitlist"
  on public.waitlist for insert
  with check (true);

drop policy if exists "Only authenticated users can view waitlist" on public.waitlist;
create policy "Only authenticated users can view waitlist"
  on public.waitlist for select
  using (auth.role() = 'authenticated');


-- -------------------------------------------------------------------------
-- 3. rate_limits (from schema-waitlist)
-- -------------------------------------------------------------------------
create table if not exists public.rate_limits (
  bucket text not null,
  key text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  created_at timestamptz default now(),
  primary key (bucket, key, window_start)
);

create index if not exists idx_rate_limits_bucket
  on public.rate_limits(bucket);

create index if not exists idx_rate_limits_window
  on public.rate_limits(window_start);

alter table public.rate_limits enable row level security;

create or replace function public.bump_rate_limit(
  p_bucket text,
  p_key text,
  p_window_start timestamptz
) returns int
language plpgsql
as $$
declare v_count int;
begin
  insert into public.rate_limits (bucket, key, window_start, count)
  values (p_bucket, p_key, p_window_start, 1)
  on conflict (bucket, key, window_start)
  do update set count = public.rate_limits.count + 1
  returning count into v_count;
  return v_count;
end;
$$;

create or replace function public.cleanup_rate_limits(p_older_than timestamptz)
returns void
language sql
as $$
  delete from public.rate_limits where window_start < p_older_than;
$$;


-- -------------------------------------------------------------------------
-- 4. agents_registry (from schema.sql)
-- -------------------------------------------------------------------------
create table if not exists public.agents_registry (
  slug text primary key,
  name text not null,
  description text,
  long_description text,
  category text,
  icon_url text,
  image_url text,
  price_cents integer default 0,
  currency text default 'usd',
  is_active boolean default true,
  features jsonb default '[]'::jsonb,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.agents_registry enable row level security;

drop policy if exists "Public can view active agents" on public.agents_registry;
create policy "Public can view active agents"
  on public.agents_registry for select
  using (is_active = true);

drop policy if exists "Service role can manage agents_registry" on public.agents_registry;
create policy "Service role can manage agents_registry"
  on public.agents_registry for all
  using (true)
  with check (true);

drop trigger if exists trg_agents_registry_updated_at on public.agents_registry;
create trigger trg_agents_registry_updated_at
  before update on public.agents_registry
  for each row execute function public.touch_updated_at();


-- -------------------------------------------------------------------------
-- 5. subscriptions (from schema.sql)
-- -------------------------------------------------------------------------
create table if not exists public.subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  agent_slug text not null,
  stripe_subscription_id text unique,
  stripe_price_id text,
  status text default 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_subscriptions_user
  on public.subscriptions(user_id);
create index if not exists idx_subscriptions_agent
  on public.subscriptions(agent_slug);
create index if not exists idx_subscriptions_stripe
  on public.subscriptions(stripe_subscription_id);

alter table public.subscriptions enable row level security;

drop policy if exists "Users can view own subscriptions" on public.subscriptions;
create policy "Users can view own subscriptions"
  on public.subscriptions for select
  using (auth.uid()::text = user_id);

drop policy if exists "Service role can manage subscriptions" on public.subscriptions;
create policy "Service role can manage subscriptions"
  on public.subscriptions for all
  using (true)
  with check (true);

drop trigger if exists trg_subscriptions_updated_at on public.subscriptions;
create trigger trg_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.touch_updated_at();


-- -------------------------------------------------------------------------
-- 6. user_agents (from schema.sql)
-- -------------------------------------------------------------------------
create table if not exists public.user_agents (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  agent_slug text not null,
  status text default 'active',
  config jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, agent_slug)
);

create index if not exists idx_user_agents_user
  on public.user_agents(user_id);
create index if not exists idx_user_agents_agent
  on public.user_agents(agent_slug);

alter table public.user_agents enable row level security;

drop policy if exists "Users can view own user_agents" on public.user_agents;
create policy "Users can view own user_agents"
  on public.user_agents for select
  using (auth.uid()::text = user_id);

drop policy if exists "Users can update own user_agents config" on public.user_agents;
create policy "Users can update own user_agents config"
  on public.user_agents for update
  using (auth.uid()::text = user_id);

drop policy if exists "Service role can manage user_agents" on public.user_agents;
create policy "Service role can manage user_agents"
  on public.user_agents for all
  using (true)
  with check (true);

drop trigger if exists trg_user_agents_updated_at on public.user_agents;
create trigger trg_user_agents_updated_at
  before update on public.user_agents
  for each row execute function public.touch_updated_at();


-- -------------------------------------------------------------------------
-- 7. agent_runs (from schema.sql)
-- -------------------------------------------------------------------------
create table if not exists public.agent_runs (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  agent_slug text not null,
  status text default 'running',
  input jsonb,
  output jsonb,
  tokens_used integer default 0,
  cost_cents integer default 0,
  started_at timestamptz default now(),
  completed_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_agent_runs_user
  on public.agent_runs(user_id);
create index if not exists idx_agent_runs_agent
  on public.agent_runs(agent_slug);

alter table public.agent_runs enable row level security;

drop policy if exists "Users can view own agent_runs" on public.agent_runs;
create policy "Users can view own agent_runs"
  on public.agent_runs for select
  using (auth.uid()::text = user_id);

drop policy if exists "Users can insert own agent_runs" on public.agent_runs;
create policy "Users can insert own agent_runs"
  on public.agent_runs for insert
  with check (auth.uid()::text = user_id);

drop policy if exists "Service role can manage agent_runs" on public.agent_runs;
create policy "Service role can manage agent_runs"
  on public.agent_runs for all
  using (true)
  with check (true);


-- -------------------------------------------------------------------------
-- 8. demo_requests (from schema.sql)
-- -------------------------------------------------------------------------
create table if not exists public.demo_requests (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  email text not null,
  company text,
  message text,
  created_at timestamptz default now()
);

alter table public.demo_requests enable row level security;

drop policy if exists "Anyone can submit demo request" on public.demo_requests;
create policy "Anyone can submit demo request"
  on public.demo_requests for insert
  with check (true);

drop policy if exists "Service role can manage demo_requests" on public.demo_requests;
create policy "Service role can manage demo_requests"
  on public.demo_requests for all
  using (true)
  with check (true);


-- -------------------------------------------------------------------------
-- 9. agent_notifications (from schema.sql)
-- -------------------------------------------------------------------------
create table if not exists public.agent_notifications (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  agent_slug text not null,
  title text not null,
  message text,
  read boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_agent_notifications_user
  on public.agent_notifications(user_id);

alter table public.agent_notifications enable row level security;

drop policy if exists "Users can view own agent_notifications" on public.agent_notifications;
create policy "Users can view own agent_notifications"
  on public.agent_notifications for select
  using (auth.uid()::text = user_id);

drop policy if exists "Users can update own agent_notifications" on public.agent_notifications;
create policy "Users can update own agent_notifications"
  on public.agent_notifications for update
  using (auth.uid()::text = user_id);

drop policy if exists "Service role can manage agent_notifications" on public.agent_notifications;
create policy "Service role can manage agent_notifications"
  on public.agent_notifications for all
  using (true)
  with check (true);


-- -------------------------------------------------------------------------
-- 10. tenant_integrations (from schema-integrations)
-- -------------------------------------------------------------------------
create table if not exists public.tenant_integrations (
  id uuid default gen_random_uuid() primary key,
  tenant_id text not null,
  provider text not null check (provider in ('stripe','notion','slack','hubspot','google_sheets')),
  status text not null default 'pending' check (status in ('connected','disconnected','error','pending')),
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  scope text,
  external_account_id text,
  metadata jsonb default '{}'::jsonb,
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

drop policy if exists "Users can view own tenant integrations" on public.tenant_integrations;
create policy "Users can view own tenant integrations"
  on public.tenant_integrations for select
  using (auth.uid()::text = tenant_id);

drop policy if exists "Users can insert own tenant integrations" on public.tenant_integrations;
create policy "Users can insert own tenant integrations"
  on public.tenant_integrations for insert
  with check (auth.uid()::text = tenant_id);

drop policy if exists "Users can update own tenant integrations" on public.tenant_integrations;
create policy "Users can update own tenant integrations"
  on public.tenant_integrations for update
  using (auth.uid()::text = tenant_id)
  with check (auth.uid()::text = tenant_id);

drop policy if exists "Users can delete own tenant integrations" on public.tenant_integrations;
create policy "Users can delete own tenant integrations"
  on public.tenant_integrations for delete
  using (auth.uid()::text = tenant_id);

drop policy if exists "Service role can manage tenant integrations" on public.tenant_integrations;
create policy "Service role can manage tenant integrations"
  on public.tenant_integrations for all
  using (true)
  with check (true);

drop trigger if exists trg_tenant_integrations_updated_at on public.tenant_integrations;
create trigger trg_tenant_integrations_updated_at
  before update on public.tenant_integrations
  for each row execute function public.touch_updated_at();


-- -------------------------------------------------------------------------
-- 11. shopify_connections (from schema-shopify-oauth)
-- -------------------------------------------------------------------------
create table if not exists public.shopify_connections (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  shop_domain text not null,
  access_token jsonb not null,
  scope text,
  installed_at timestamptz default now(),
  uninstalled_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, shop_domain)
);

create index if not exists idx_shopify_connections_user
  on public.shopify_connections(user_id);
create index if not exists idx_shopify_connections_shop
  on public.shopify_connections(shop_domain);

alter table public.shopify_connections enable row level security;

drop policy if exists "Users can view own shopify connections" on public.shopify_connections;
create policy "Users can view own shopify connections"
  on public.shopify_connections for select
  using (auth.uid()::text = user_id);

drop policy if exists "Users can insert own shopify connections" on public.shopify_connections;
create policy "Users can insert own shopify connections"
  on public.shopify_connections for insert
  with check (auth.uid()::text = user_id);

drop policy if exists "Users can update own shopify connections" on public.shopify_connections;
create policy "Users can update own shopify connections"
  on public.shopify_connections for update
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

drop policy if exists "Service role can manage shopify connections" on public.shopify_connections;
create policy "Service role can manage shopify connections"
  on public.shopify_connections for all
  using (true)
  with check (true);

drop trigger if exists trg_shopify_connections_updated_at on public.shopify_connections;
create trigger trg_shopify_connections_updated_at
  before update on public.shopify_connections
  for each row execute function public.touch_updated_at();


-- -------------------------------------------------------------------------
-- 12. google_connections (from schema-google-oauth)
-- -------------------------------------------------------------------------
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

drop policy if exists "Users can view own google connection" on public.google_connections;
create policy "Users can view own google connection"
  on public.google_connections for select
  using (auth.uid() = user_id);

drop policy if exists "Users can update own google connection" on public.google_connections;
create policy "Users can update own google connection"
  on public.google_connections for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own google connection" on public.google_connections;
create policy "Users can delete own google connection"
  on public.google_connections for delete
  using (auth.uid() = user_id);

drop policy if exists "Service role can manage google connections" on public.google_connections;
create policy "Service role can manage google connections"
  on public.google_connections for all
  using (true)
  with check (true);

drop trigger if exists trg_google_connections_updated_at on public.google_connections;
create trigger trg_google_connections_updated_at
  before update on public.google_connections
  for each row execute function public.touch_updated_at();


-- -------------------------------------------------------------------------
-- 13. waitlist_beta_access (from schema-waitlist-beta-access)
-- -------------------------------------------------------------------------

-- 13a. waitlist_codes
create table if not exists public.waitlist_codes (
  id         uuid primary key default gen_random_uuid(),
  code       text unique not null,
  role       text not null default 'beta_tester'
             check (role in ('beta_tester', 'internal_qa')),
  max_uses   int not null default 1,
  used_count int not null default 0,
  expires_at timestamptz,
  created_at timestamptz default now(),
  created_by uuid references auth.users(id)
);

alter table public.waitlist_codes
  add column if not exists expires_at timestamptz;

create index if not exists idx_waitlist_codes_code
  on public.waitlist_codes(code);

-- 13b. waitlist_redemptions
create table if not exists public.waitlist_redemptions (
  id          uuid primary key default gen_random_uuid(),
  code_id     uuid not null references public.waitlist_codes(id) on delete cascade,
  user_id     uuid not null references auth.users(id),
  redeemed_at timestamptz default now(),
  unique(code_id, user_id)
);

create index if not exists idx_waitlist_redemptions_user_id
  on public.waitlist_redemptions(user_id);

-- 13c. profiles.role
alter table public.profiles
  add column if not exists role text not null default 'member'
  check (role in ('member', 'beta_tester', 'internal_qa'));

-- 13d. RLS
alter table public.waitlist_codes enable row level security;

alter table public.waitlist_redemptions enable row level security;

drop policy if exists "Users can view own redemptions" on public.waitlist_redemptions;
create policy "Users can view own redemptions"
  on public.waitlist_redemptions
  for select
  using (auth.uid() = user_id);

-- 13e. has_beta_bypass function
create or replace function public.has_beta_bypass(check_user_id uuid default auth.uid())
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  bypass_enabled boolean;
  user_role text;
begin
  bypass_enabled := current_setting('app.enable_waitlist_beta_bypass', true) = 'true';

  if not bypass_enabled then
    return false;
  end if;

  select role into user_role
  from public.profiles
  where id = check_user_id;

  return user_role in ('beta_tester', 'internal_qa');
end;
$$;

-- 13f. increment_used_count RPC
create or replace function public.increment_used_count(code_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.waitlist_codes
  set used_count = used_count + 1
  where id = code_id;
end;
$$;


-- =============================================================================
-- Done. All schemas applied idempotently.
-- =============================================================================


-- -------------------------------------------------------------------------
-- 14. waitlist_pending_sessions (bridges code → auth)
-- -------------------------------------------------------------------------
create table if not exists public.waitlist_pending_sessions (
  id            uuid primary key default gen_random_uuid(),
  session_token text unique not null,
  code_id       uuid not null references public.waitlist_codes(id) on delete cascade,
  created_at    timestamptz default now(),
  expires_at    timestamptz not null default (now() + interval '30 minutes'),
  consumed_at   timestamptz
);

create index if not exists idx_waitlist_pending_sessions_token
  on public.waitlist_pending_sessions(session_token);

alter table public.waitlist_pending_sessions enable row level security;
