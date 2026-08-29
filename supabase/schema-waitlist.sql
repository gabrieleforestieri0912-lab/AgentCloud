-- =============================================================================
-- AgentCloud — waitlist-phase schema
-- =============================================================================
-- Run this file in Supabase SQL Editor (or via supabase-cli db push) while the
-- platform is still in waitlist mode. It provisions ONLY what that phase
-- needs:
--
--   1. profiles     — one row per registered user (auto-created by Supabase
--                     Auth trigger), so login/signup keep working
--   2. waitlist     — waitlist signups (the app also provisions a Supabase
--                     Auth user per email, so signups appear in Auth → Users)
--   3. rate_limits  — distributed rate limiting buckets + RPCs (used by the
--                     /api/waitlist endpoint)
--
-- When the platform is fully available, run `schema.sql` instead (the full
-- schema with agents_registry, subscriptions, user_agents, agent_runs,
-- agent_notifications, demo_requests, waitlist and rate_limits).
--
-- Auth:
--   - Authentication is handled by Supabase Auth (auth.users).
--   - All tables have Row Level Security enabled.
--   - "Service role can manage" policies allow server-side code to write
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
--    One row per authenticated user. Kept in the waitlist schema so that
--    signups/login keep registering users before the platform launches.
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
-- 2. waitlist
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
-- 3. rate_limits
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
