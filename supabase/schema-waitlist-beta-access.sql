-- -----------------------------------------------------------------------------
-- 1. waitlist_codes
-- -----------------------------------------------------------------------------
create table if not exists public.waitlist_codes (
  id         uuid primary key default gen_random_uuid(),
  code       text unique not null,
  role       text not null default 'beta_tester'
             check (role in ('beta_tester', 'internal_qa')),
  max_uses   int not null default 1,
  used_count int not null default 0,
  expires_at timestamptz,  -- NULL = never expires (open decision: default to requiring expiry)
  created_at timestamptz default now(),
  created_by uuid references auth.users(id)
);

-- Idempotent: add expires_at if running on existing table
alter table public.waitlist_codes
  add column if not exists expires_at timestamptz;

create index if not exists idx_waitlist_codes_code
  on public.waitlist_codes(code);

-- -----------------------------------------------------------------------------
-- 2. waitlist_redemptions
-- -----------------------------------------------------------------------------
create table if not exists public.waitlist_redemptions (
  id          uuid primary key default gen_random_uuid(),
  code_id     uuid not null references public.waitlist_codes(id) on delete cascade,
  user_id     uuid not null references auth.users(id),
  redeemed_at timestamptz default now(),
  -- tenant_id removed: this project has no tenants table; role is on profiles.
  -- Kept as comment for future reference:
  -- tenant_id uuid references tenants(id)
  unique(code_id, user_id)  -- one redemption per user per code (no-op on double redeem)
);

create index if not exists idx_waitlist_redemptions_user_id
  on public.waitlist_redemptions(user_id);

-- -----------------------------------------------------------------------------
-- 3. Alter profiles: add role column
-- -----------------------------------------------------------------------------
-- The project has no tenant_users table. User roles live in profiles.
-- Default 'member' for all existing and new users.

alter table public.profiles
  add column if not exists role text not null default 'member'
  check (role in ('member', 'beta_tester', 'internal_qa'));

-- -----------------------------------------------------------------------------
-- 4. RLS policies
-- -----------------------------------------------------------------------------
-- waitlist_codes: only service role can read/write (no user-facing access)
alter table public.waitlist_codes enable row level security;

-- No user-facing policies → only service role can access
-- (Edge Functions use service_role key)

-- waitlist_redemptions: users can read their own redemptions
alter table public.waitlist_redemptions enable row level security;

drop policy if exists "Users can view own redemptions" on public.waitlist_redemptions;
create policy "Users can view own redemptions"
  on public.waitlist_redemptions
  for select
  using (auth.uid() = user_id);

-- profiles role: users can read their own role (already have select on own profile)
-- The existing profiles RLS policy already scopes by auth.uid(), so role is
-- visible to the user themselves. No new policy needed.

-- -----------------------------------------------------------------------------
-- 5. Helper function: check if user has beta bypass
-- -----------------------------------------------------------------------------
-- Used by Edge Functions and RLS to check beta status.
-- Returns true ONLY if:
--   1. ENABLE_WAITLIST_BETA_BYPASS env flag is 'true' (via GUC)
--   2. User's role is 'beta_tester' or 'internal_qa'
--
-- This is the SINGLE choke point for all bypass checks.

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
  -- Check if beta bypass is enabled via GUC
  -- The Edge Function must set this: set_config('app.enable_waitlist_beta_bypass', 'true', true)
  bypass_enabled := current_setting('app.enable_waitlist_beta_bypass', true) = 'true';

  if not bypass_enabled then
    return false;
  end if;

  -- Check user's role
  select role into user_role
  from public.profiles
  where id = check_user_id;

  return user_role in ('beta_tester', 'internal_qa');
end;
$$;

-- -----------------------------------------------------------------------------
-- 6. RPC: increment used_count (idempotent)
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- Done. Next: Phase 2 (Redeem Edge Function)
-- -----------------------------------------------------------------------------
