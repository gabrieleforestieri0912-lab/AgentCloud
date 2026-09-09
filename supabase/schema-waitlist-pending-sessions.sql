-- =============================================================================
-- AgentCloud — Waitlist Pending Sessions (bridges code → auth)
-- =============================================================================
-- When a user enters a valid waitlist code BEFORE authenticating, we create
-- a pending session row + httpOnly cookie. After the user completes normal
-- signup/login, the completion hook consumes the pending session and assigns
-- the beta role.
-- =============================================================================

create table if not exists public.waitlist_pending_sessions (
  id            uuid primary key default gen_random_uuid(),
  session_token text unique not null,
  code_id       uuid not null references public.waitlist_codes(id) on delete cascade,
  created_at    timestamptz default now(),
  expires_at    timestamptz not null default (now() + interval '30 minutes'),
  consumed_at   timestamptz  -- null until redemption completes
);

create index if not exists idx_waitlist_pending_sessions_token
  on public.waitlist_pending_sessions(session_token);

-- RLS: only service role can access (Edge Functions use service_role key)
alter table public.waitlist_pending_sessions enable row level security;

-- No user-facing policies → service role only
