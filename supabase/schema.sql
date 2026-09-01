-- =============================================================================
-- AgentCloud — unified database schema
-- =============================================================================
-- Run this file in Supabase SQL Editor (or via supabase-cli db push) to
-- provision the entire application schema in one shot.
--
-- Tables:
--   1. profiles            — one row per authenticated user, holds Stripe customer
--   2. agents_registry     — server-side mirror of the agent catalog
--   3. subscriptions       — Stripe subscription ledger (per agent purchase)
--   4. user_agents         — owned agent instances (one per user x agent)
--   5. agent_runs          — activity log for runs/conversations on owned agents
--   6. demo_requests       — public demo contact form submissions
--   7. waitlist            — public waitlist signups
--   8. rate_limits         — distributed rate limiting buckets
--   9. agent_notifications — important actions performed by agents (in-app bell)
--
-- Auth:
--   - Authentication is handled by Supabase Auth (auth.users).
--   - All tables have Row Level Security enabled.
--   - "Service role can manage" policies allow server-side webhooks to write
--     while users only see their own rows.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 0. Migration (run once on existing installs; harmless on fresh installs)
--
-- Authentication is handled by Supabase Auth (auth.users), so user
-- identifiers are UUIDs. The user_id columns remain `text` for backward
-- compatibility with rows created before the Supabase migration; new rows
-- store the auth.users UUID as text. The service role key is used server-side
-- to read/write these tables after Supabase authentication; the user-facing
-- RLS policies below remain as defense-in-depth for direct access.
-- -----------------------------------------------------------------------------
alter table if exists public.user_agents
  drop constraint if exists user_agents_user_id_fkey;
alter table if exists public.agent_runs
  drop constraint if exists agent_runs_user_id_fkey;

alter table if exists public.user_agents
  alter column user_id type text;
alter table if exists public.agent_runs
  alter column user_id type text;

alter table if exists public.subscriptions
  add column if not exists stripe_customer_id text;
alter table if exists public.agent_runs
  add column if not exists conversation_id text;

-- One ledger row per (subscription, agent). Ignore the error when the
-- constraint already exists on a fresh install (the CREATE TABLE below
-- includes it).
do $$
begin
  alter table public.subscriptions
    add constraint uq_subscriptions_sub_agent unique (stripe_subscription_id, agent_id);
exception
  when duplicate_object then null;
  when others then null;
end
$$;


-- -----------------------------------------------------------------------------
-- 0. Helpers
-- -----------------------------------------------------------------------------
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
-- 1. profiles
-- -----------------------------------------------------------------------------
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

-- Auto-create a profile row for every new Supabase auth user (email/password
-- or Google OAuth). `raw_user_meta_data.full_name` is set by Google and by the
-- signup form; falls back to NULL when absent.
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


-- -----------------------------------------------------------------------------
-- 2. agents_registry
--    Server-side mirror of src/lib/agents.ts so webhooks can resolve
--    Stripe Price IDs by slug.
-- -----------------------------------------------------------------------------
create table if not exists public.agents_registry (
  slug text primary key,
  name text not null,
  short_name text not null,
  category text not null,
  price_cents integer not null,
  stripe_price_id text not null,
  display_price text not null,
  active boolean default true,
  created_at timestamptz default now()
);

alter table public.agents_registry enable row level security;

drop policy if exists "Anyone can view agents_registry" on public.agents_registry;
create policy "Anyone can view agents_registry"
  on public.agents_registry for select
  using (true);

drop policy if exists "Service role can manage agents_registry" on public.agents_registry;
create policy "Service role can manage agents_registry"
  on public.agents_registry for all
  using (true)
  with check (true);


-- -----------------------------------------------------------------------------
-- 3. subscriptions
--    Raw Stripe subscription ledger. One row per Stripe subscription event
--    captured. The authoritative "what does the user own" table is
--    user_agents (one row per active ownership).
-- -----------------------------------------------------------------------------
create table if not exists public.subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  agent_id text not null,
  stripe_subscription_id text,
  stripe_customer_id text,
  status text default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (stripe_subscription_id, agent_id)
);

create index if not exists idx_subscriptions_user_id
  on public.subscriptions(user_id);
create index if not exists idx_subscriptions_agent_id
  on public.subscriptions(agent_id);
create index if not exists idx_subscriptions_stripe_id
  on public.subscriptions(stripe_subscription_id);

alter table public.subscriptions enable row level security;

drop policy if exists "Users can view own subscriptions" on public.subscriptions;
create policy "Users can view own subscriptions"
  on public.subscriptions for select
  using (auth.uid()::text = user_id);

create index if not exists idx_subscriptions_stripe_customer
  on public.subscriptions(stripe_customer_id);

drop policy if exists "Service role can manage subscriptions" on public.subscriptions;
create policy "Service role can manage subscriptions"
  on public.subscriptions for all
  using (true)
  with check (true);

drop trigger if exists trg_subscriptions_updated_at on public.subscriptions;
create trigger trg_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.touch_updated_at();


-- -----------------------------------------------------------------------------
-- 4. user_agents
--    Authoritative ownership table. One row per (user, agent_slug).
--    Created/updated by the Stripe webhook on subscription events.
-- -----------------------------------------------------------------------------
create table if not exists public.user_agents (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  agent_slug text not null,
  stripe_subscription_id text,
  stripe_customer_id text,
  status text not null default 'active',
  config jsonb default '{}'::jsonb,
  activated_at timestamptz default now(),
  cancelled_at timestamptz,
  current_period_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, agent_slug)
);

create index if not exists idx_user_agents_user
  on public.user_agents(user_id);
create index if not exists idx_user_agents_slug
  on public.user_agents(agent_slug);
create index if not exists idx_user_agents_status
  on public.user_agents(status);

alter table public.user_agents enable row level security;

drop policy if exists "Users can view own user_agents" on public.user_agents;
create policy "Users can view own user_agents"
  on public.user_agents for select
  using (auth.uid()::text = user_id);

drop policy if exists "Users can update own user_agents config" on public.user_agents;
create policy "Users can update own user_agents config"
  on public.user_agents for update
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

drop policy if exists "Service role can manage user_agents" on public.user_agents;
create policy "Service role can manage user_agents"
  on public.user_agents for all
  using (true)
  with check (true);

drop trigger if exists trg_user_agents_updated_at on public.user_agents;
create trigger trg_user_agents_updated_at
  before update on public.user_agents
  for each row execute function public.touch_updated_at();


-- -----------------------------------------------------------------------------
-- 5. agent_runs
--    Activity log for runs/conversations on owned agents.
-- -----------------------------------------------------------------------------
create table if not exists public.agent_runs (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  user_agent_id uuid references public.user_agents(id) on delete set null,
  agent_slug text not null,
  conversation_id text,
  status text default 'running',
  input_tokens integer,
  output_tokens integer,
  started_at timestamptz default now(),
  finished_at timestamptz
);

create index if not exists idx_agent_runs_user
  on public.agent_runs(user_id);
create index if not exists idx_agent_runs_user_agent
  on public.agent_runs(user_agent_id);
create index if not exists idx_agent_runs_user_period
  on public.agent_runs(user_id, agent_slug, started_at);

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


-- -----------------------------------------------------------------------------
-- 6. demo_requests
--    Public demo contact form submissions.
-- -----------------------------------------------------------------------------
create table if not exists public.demo_requests (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  surname text not null,
  email text not null,
  created_at timestamptz default now(),
  notified boolean default false
);

alter table public.demo_requests enable row level security;

drop policy if exists "Anyone can insert demo requests" on public.demo_requests;
create policy "Anyone can insert demo requests"
  on public.demo_requests for insert
  with check (true);

drop policy if exists "Only authenticated users can view demo requests" on public.demo_requests;
create policy "Only authenticated users can view demo requests"
  on public.demo_requests for select
  using (auth.role() = 'authenticated');


-- -----------------------------------------------------------------------------
-- 7. waitlist
--    Public waitlist signups. The app also provisions a Supabase Auth user for
--    each email (via `/api/waitlist`) so signups appear in Auth → Users and
--    are already registered when the platform opens.
-- -----------------------------------------------------------------------------
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


-- -----------------------------------------------------------------------------
-- 8. agent_notifications
--    Important actions performed by agents on behalf of the user (file
--    created, product published, event booked, lead captured, ...). Written
--    server-side by the agent run loop, read in the in-app bell. Users can
--    mark their own rows as read; the service role writes new rows.
-- -----------------------------------------------------------------------------
create table if not exists public.agent_notifications (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  agent_slug text not null,
  kind text not null,
  params jsonb default '{}'::jsonb,
  read boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_agent_notifications_user
  on public.agent_notifications(user_id, created_at desc);

alter table public.agent_notifications enable row level security;

drop policy if exists "Users can view own agent_notifications" on public.agent_notifications;
create policy "Users can view own agent_notifications"
  on public.agent_notifications for select
  using (auth.uid()::text = user_id);

drop policy if exists "Users can update own agent_notifications" on public.agent_notifications;
create policy "Users can update own agent_notifications"
  on public.agent_notifications for update
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

drop policy if exists "Service role can manage agent_notifications" on public.agent_notifications;
create policy "Service role can manage agent_notifications"
  on public.agent_notifications for all
  using (true)
  with check (true);


-- -----------------------------------------------------------------------------
-- 9. rate_limits
--    Distributed rate limiting buckets (rate limit helpers in the app).
--
--    One row per (bucket, key, window_start). Counters are incremented
--    atomically via the bump_rate_limit RPC (insert ... on conflict), so the
--    limit holds across all server instances (serverless included). RLS is
--    enabled with no policies: only the service role can touch this table,
--    anon/authenticated clients get deny-all.
-- -----------------------------------------------------------------------------
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

-- Atomic increment; returns the new count so the caller can compare it to the
-- configured limit. Never create a separate select-after-insert (race-prone).
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

-- Opportunistic cleanup of expired windows (called occasionally by the app).
create or replace function public.cleanup_rate_limits(p_older_than timestamptz)
returns void
language sql
as $$
  delete from public.rate_limits where window_start < p_older_than;
$$;


-- =============================================================================
-- Optional: bootstrap agents_registry from the application catalog.
--
-- This block is idempotent (uses on conflict do update). You can safely
-- re-run schema.sql to refresh the catalog.
-- =============================================================================
insert into public.agents_registry (slug, name, short_name, category, price_cents, stripe_price_id, display_price, active) values
  ('email-manager',        'Cleo — Email Manager',       'Cleo',                 'Business & Operations', 3900,  'price_email_manager',        '€39/mo',  true),
  ('business-manager',     'Otto — Business Manager',    'Otto',                 'Business & Operations', 5900,  'price_business_manager',     '€59/mo',  true),
  ('personal-assistant',   'Aria — Personal Assistant',  'Aria',                 'Business & Operations', 2900,  'price_personal_assistant',   '€29/mo',  true),
  ('calendar-booking',     'Luna — Calendar Booking',    'Luna',                 'Business & Operations', 3900,  'price_calendar_booking',     '€39/mo',  true),
  ('seo-agent',            'Nova — SEO Content',         'Nova',                 'Marketing & Sales',     3900,  'price_seo_agent',            '€39/mo',  true),
  ('lead-capture',         'Falco — Lead Capture',       'Falco',                'Marketing & Sales',     2900,  'price_lead_capture',         '€29/mo',  true),
  ('support-agent',        'Zoe — Support Agent',        'Zoe',                  'Customer Service',      4900,  'price_support_agent',        '€49/mo',  true),
  ('copywriter',           'Dante — Copywriter',         'Dante',                'Design & Content',      3900,  'price_copywriter',           '€39/mo',  true),
  ('finance-manager',      'Midas — Finance Manager',    'Midas',                'E-commerce & Finance',  4900,  'price_finance_manager',      '€49/mo',  true),
  ('shopify-agent',        'Cosmo — Shopify Agent',      'Cosmo',                'E-commerce & Finance',  3900,  'price_shopify_agent',        '€39/mo',  true)
on conflict (slug) do update set
  name           = excluded.name,
  short_name     = excluded.short_name,
  category       = excluded.category,
  price_cents    = excluded.price_cents,
  stripe_price_id = excluded.stripe_price_id,
  display_price  = excluded.display_price,
  active         = excluded.active;
