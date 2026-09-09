-- AgentCloud — Force Full Auth for Waitlist-Only Accounts
-- Adds auth_method_completed to profiles

-- New users who sign up via Google or password get true by default
-- (they already used a full auth method).
-- Waitlist users get false (they need to complete auth).
alter table public.profiles
  add column if not exists auth_method_completed boolean not null default false;

-- Backfill: existing users who have a password or OAuth provider get true.
-- We check Supabase Auth metadata to determine this.
-- NOTE: This must be run via Edge Function or service-role since auth.users
-- is not directly accessible from SQL. For now, default is false (waitlist users).
-- The handle_new_user trigger already creates profiles with default false.
-- Post-launch signups via Google/password will have auth_method_completed
-- set to true by the auth callback.
