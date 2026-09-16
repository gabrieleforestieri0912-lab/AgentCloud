-- =============================================================================
-- Phase 2 — Auto-complete referrals when auth_method_completed becomes true
-- Ensures Open Decision #7 (points only when referred user completes auth)
-- even for email/password flows that PATCH profiles directly (login/signup).
-- Trigger is idempotent and defers to service_role; no RLS bypass needed
-- because it runs as SECURITY DEFINER.
-- =============================================================================

create or replace function public.complete_referral_on_auth()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only when flipping false -> true
  if (old.auth_method_completed = false and new.auth_method_completed = true) then
    -- Find waitlist email for this user (profiles.email)
    -- and mark any pending referral for that email as completed
    update public.waitlist_referrals
    set status = 'completed',
        completed_at = now(),
        referred_user_id = coalesce(referred_user_id, new.id)
    where status = 'pending'
      and lower(referred_email) = lower(new.email);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_complete_referral_on_auth on public.profiles;
create trigger trg_complete_referral_on_auth
  after update of auth_method_completed on public.profiles
  for each row execute function public.complete_referral_on_auth();
