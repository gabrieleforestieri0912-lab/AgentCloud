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
--
-- Auth:
--   - Authentication is handled by Supabase Auth (auth.users).
--   - All tables have Row Level Security enabled.
--   - "Service role can manage" policies allow server-side webhooks to write
--     while users only see their own rows.
-- =============================================================================


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
  status text default ''active'',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
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
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_slug text not null,
  stripe_subscription_id text,
  stripe_customer_id text,
  status text not null default ''active'',
  config jsonb default ''{}''::jsonb,
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
  using (auth.uid() = user_id);

drop policy if exists "Users can update own user_agents config" on public.user_agents;
create policy "Users can update own user_agents config"
  on public.user_agents for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

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
  user_id uuid not null references auth.users(id) on delete cascade,
  user_agent_id uuid references public.user_agents(id) on delete set null,
  agent_slug text not null,
  status text default ''running'',
  input_tokens integer,
  output_tokens integer,
  started_at timestamptz default now(),
  finished_at timestamptz
);

create index if not exists idx_agent_runs_user
  on public.agent_runs(user_id);
create index if not exists idx_agent_runs_user_agent
  on public.agent_runs(user_agent_id);

alter table public.agent_runs enable row level security;

drop policy if exists "Users can view own agent_runs" on public.agent_runs;
create policy "Users can view own agent_runs"
  on public.agent_runs for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own agent_runs" on public.agent_runs;
create policy "Users can insert own agent_runs"
  on public.agent_runs for insert
  with check (auth.uid() = user_id);

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
  using (auth.role() = ''authenticated'');


-- -----------------------------------------------------------------------------
-- 7. waitlist
--    Public waitlist signups (email-only collection).
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


-- =============================================================================
-- Optional: bootstrap agents_registry from the application catalog.
--
-- This block is idempotent (uses on conflict do update). You can safely
-- re-run schema.sql to refresh the catalog.
-- =============================================================================
insert into public.agents_registry (slug, name, short_name, category, price_cents, stripe_price_id, display_price, active) values
  (''executive-assistant'',  ''Executive Assistant'',         ''Executive Assistant'',  ''Business & Operations'', 7900,  ''price_executive_assistant'',  ''\u20ac79/mo'',  true),
  (''project-manager'',      ''Project Manager'',             ''Project Manager'',      ''Business & Operations'', 8900,  ''price_project_manager'',      ''\u20ac89/mo'',  true),
  (''meeting-assistant'',    ''Meeting Assistant'',           ''Meeting Assistant'',    ''Business & Operations'', 5900,  ''price_meeting_assistant'',    ''\u20ac59/mo'',  true),
  (''crm-assistant'',        ''CRM Assistant'',               ''CRM Assistant'',        ''Business & Operations'', 9900,  ''price_crm_assistant'',        ''\u20ac99/mo'',  true),
  (''customer-success'',     ''Customer Success Manager'',    ''Customer Success'',     ''Business & Operations'', 11900, ''price_customer_success'',     ''\u20ac119/mo'', true),
  (''business-manager'',     ''Business Manager'',            ''Business Manager'',     ''Business & Operations'', 12900, ''price_business_manager'',     ''\u20ac129/mo'', true),
  (''marketing-strategist'', ''Marketing Strategist'',        ''Marketing Strategist'', ''Marketing & Sales'',     9900,  ''price_marketing_strategist'', ''\u20ac99/mo'',  true),
  (''seo-specialist'',       ''SEO Specialist'',              ''SEO Specialist'',       ''Marketing & Sales'',     6900,  ''price_seo_specialist'',       ''\u20ac69/mo'',  true),
  (''google-ads-expert'',    ''Google Ads Expert'',           ''Google Ads Expert'',    ''Marketing & Sales'',     8900,  ''price_google_ads_expert'',    ''\u20ac89/mo'',  true),
  (''social-media-manager'', ''Social Media Manager'',        ''Social Media Manager'', ''Marketing & Sales'',     7900,  ''price_social_media_manager'', ''\u20ac79/mo'',  true),
  (''cold-email-writer'',    ''Cold Email Writer'',           ''Cold Email Writer'',    ''Marketing & Sales'',     5900,  ''price_cold_email_writer'',    ''\u20ac59/mo'',  true),
  (''lead-qualification'',   ''Lead Qualification Agent'',    ''Lead Qualification'',   ''Marketing & Sales'',     9900,  ''price_lead_qualification'',   ''\u20ac99/mo'',  true),
  (''support-agent'',        ''Support Agent'',               ''Support Agent'',        ''Customer Service'',      8900,  ''price_support_agent'',        ''\u20ac89/mo'',  true),
  (''complaint-manager'',    ''Complaint Manager'',           ''Complaint Manager'',    ''Customer Service'',      6900,  ''price_complaint_manager'',    ''\u20ac69/mo'',  true),
  (''fullstack-developer'',  ''Full Stack Developer'',        ''Full Stack Developer'', ''Development'',           14900, ''price_fullstack_developer'',  ''\u20ac149/mo'', true),
  (''api-integration'',      ''API Integration Expert'',      ''API Integration'',      ''Development'',           9900,  ''price_api_integration'',      ''\u20ac99/mo'',  true),
  (''devops-engineer'',      ''DevOps Engineer'',             ''DevOps Engineer'',      ''Development'',           12900, ''price_devops_engineer'',      ''\u20ac129/mo'', true),
  (''qa-tester'',            ''QA Tester'',                   ''QA Tester'',            ''Development'',           7900,  ''price_qa_tester'',            ''\u20ac79/mo'',  true),
  (''prompt-engineer'',      ''Prompt Engineer'',             ''Prompt Engineer'',      ''AI & Data'',             6900,  ''price_prompt_engineer'',      ''\u20ac69/mo'',  true),
  (''ai-automation'',        ''AI Automation Builder'',       ''AI Automation'',        ''AI & Data'',             11900, ''price_ai_automation'',        ''\u20ac119/mo'', true),
  (''data-analyst'',         ''Data Analyst'',                ''Data Analyst'',         ''AI & Data'',             9900,  ''price_data_analyst'',         ''\u20ac99/mo'',  true),
  (''copywriter'',           ''Copywriter'',                  ''Copywriter'',           ''Design & Content'',      7900,  ''price_copywriter'',           ''\u20ac79/mo'',  true),
  (''blog-writer'',          ''Blog Writer'',                 ''Blog Writer'',          ''Design & Content'',      6900,  ''price_blog_writer'',          ''\u20ac69/mo'',  true),
  (''ui-designer'',          ''UI Designer'',                 ''UI Designer'',          ''Design & Content'',      8900,  ''price_ui_designer'',          ''\u20ac89/mo'',  true),
  (''ecommerce-expert'',     ''E-commerce Expert'',           ''E-commerce Expert'',    ''E-commerce & Finance'',  9900,  ''price_ecommerce_expert'',     ''\u20ac99/mo'',  true)
on conflict (slug) do update set
  name           = excluded.name,
  short_name     = excluded.short_name,
  category       = excluded.category,
  price_cents    = excluded.price_cents,
  stripe_price_id = excluded.stripe_price_id,
  display_price  = excluded.display_price,
  active         = excluded.active;
