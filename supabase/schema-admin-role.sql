-- -----------------------------------------------------------------------------
-- Admin role in public.profiles
-- -----------------------------------------------------------------------------
-- Before launch the only way into the platform was an access code. After launch
-- that path is gone, so admins are recognised from their own account:
--   * an email listed in the ADMIN_EMAILS env var, or
--   * role = 'admin' on their public.profiles row.
-- Both are evaluated server-side only (see src/lib/admin-access.ts).
--
-- This file does three things:
--   1. allows 'admin' as a value of profiles.role. The original check created by
--      schema-waitlist-beta-access.sql only allowed member/beta_tester/
--      internal_qa, so writing 'admin' used to fail on the check constraint;
--   2. seeds 'admin' for the accounts that got in before the launch instant
--      (2026-10-01T14:00:00Z, i.e. LAUNCH_AT in src/lib/waitlist-constants.ts);
--   3. stops self-promotion: profiles are written by the app with the user's own
--      token, and Supabase grants UPDATE on every column by default, so `role`
--      has to be excluded explicitly, otherwise any logged-in user could set
--      role = 'admin' on their own row through PostgREST.
--
-- Re-running this file is safe: step 1 and 3 are idempotent and step 2 is
-- bounded by date, so accounts created after launch are never promoted.
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- 1. Allow role = 'admin'
-- -----------------------------------------------------------------------------
-- The current check constraint name depends on how the column was added, so
-- drop whatever check mentions `role` and then add the canonical one.
do $$
declare
  c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%role%'
  loop
    execute format('alter table public.profiles drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('member', 'beta_tester', 'internal_qa', 'admin'));

-- -----------------------------------------------------------------------------
-- 2. Seed: accounts that authenticated before launch
-- -----------------------------------------------------------------------------
-- Only accounts that already completed a real login are promoted, and only if
-- they were created before the launch instant. Accounts created after launch
-- are NOT touched, not even if this block runs again later.
update public.profiles
set role = 'admin'
where role <> 'admin'
  and auth_method_completed = true
  and created_at < '2026-10-01T14:00:00Z';

-- -----------------------------------------------------------------------------
-- 3. Stop self-promotion via PostgREST
-- -----------------------------------------------------------------------------
-- Drop table-level UPDATE and grant it back only on the columns the app
-- actually writes from the client / with the user's token:
--   * auth_method_completed  -> /auth/callback, /api/trial/activate, login and
--                               signup pages
--   * has_seen_*_onboarding  -> /api/user/onboarding
--   * full_name              -> user-editable display name
-- `role` is deliberately absent: only the service role can change it. The
-- service role is not affected by this revoke, so server-side reads/writes
-- (proxy, admin routes, Stripe webhooks) keep working.
revoke update on public.profiles from anon, authenticated;

grant update (
  auth_method_completed,
  has_seen_chat_onboarding,
  has_seen_dashboard_onboarding,
  full_name
) on public.profiles to authenticated;
