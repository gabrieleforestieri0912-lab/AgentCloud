-- -----------------------------------------------------------------------------
-- 1. waitlist_referral_codes — one opaque code per waitlist user (base62, 8 chars)
--    Spec: user_id, code unique, created_at. Code is NOT the raw user ID.
--    Note: existing column public.waitlist.referral_code is kept for backward
--    compat; this table is the normalized registry. Backfilled from that column.
-- -----------------------------------------------------------------------------
create table if not exists public.waitlist_referral_codes (
  user_id uuid primary key, -- references waitlist.id or auth.users.id (flexible, no FK to allow both)
  code text not null unique check (char_length(code) = 8),
  created_at timestamptz not null default now()
);

alter table public.waitlist_referral_codes enable row level security;

drop policy if exists "Users can view own referral code" on public.waitlist_referral_codes;
create policy "Users can view own referral code"
  on public.waitlist_referral_codes for select
  using (auth.uid() = user_id);

drop policy if exists "Service role can manage referral codes" on public.waitlist_referral_codes;
create policy "Service role can manage referral codes"
  on public.waitlist_referral_codes for all
  using (true) with check (true);

create index if not exists idx_waitlist_referral_codes_code on public.waitlist_referral_codes(code);
create index if not exists idx_waitlist_referral_codes_user on public.waitlist_referral_codes(user_id);

-- Backfill from existing waitlist.referral_code (hex 8 chars, kept as-is; new codes will be base62)
insert into public.waitlist_referral_codes (user_id, code, created_at)
select w.id, w.referral_code, w.created_at
from public.waitlist w
where w.referral_code is not null
on conflict (user_id) do nothing;

insert into public.waitlist_referral_codes (user_id, code, created_at)
select w.id, w.referral_code, w.created_at
from public.waitlist w
where w.referral_code is not null
on conflict (code) do nothing;

-- -----------------------------------------------------------------------------
-- 2. waitlist_referrals — referral attribution, status pending/completed
--    Points awarded only when referred user reaches auth_method_completed=true
--    (Open Decision #7). Same-email blocked; same-IP flagged but still awarded
--    (handled in Edge Function, not DB hard block).
-- -----------------------------------------------------------------------------
create table if not exists public.waitlist_referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_user_id uuid not null,
  referred_user_id uuid, -- null until referred user creates account (pending via email)
  referred_email text not null,
  status text not null check (status in ('pending','completed')) default 'pending',
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  referrer_ip text, -- for same-IP flagging (Open Decision #5), not a hard block
  constraint waitlist_referrals_no_self_email check (lower(referred_email) <> lower((select email from public.waitlist where id = referrer_user_id limit 1))),
  unique (referrer_user_id, referred_email) -- prevent duplicate referral rows per email
);

-- Note: self-email check via subquery is not enforceable as CHECK with subquery in all PG versions;
-- server-side validation in Edge Function is authoritative (see Open Decision #5).
-- Keep the unique constraint above as the hard dedupe.

alter table public.waitlist_referrals enable row level security;

drop policy if exists "Users can view own referrals" on public.waitlist_referrals;
create policy "Users can view own referrals"
  on public.waitlist_referrals for select
  using (auth.uid() = referrer_user_id or auth.uid() = referred_user_id);

drop policy if exists "Service role can manage referrals" on public.waitlist_referrals;
create policy "Service role can manage referrals"
  on public.waitlist_referrals for all
  using (true) with check (true);

create index if not exists idx_waitlist_referrals_referrer on public.waitlist_referrals(referrer_user_id);
create index if not exists idx_waitlist_referrals_referred on public.waitlist_referrals(referred_user_id);
create index if not exists idx_waitlist_referrals_status on public.waitlist_referrals(status);
create index if not exists idx_waitlist_referrals_email on public.waitlist_referrals(lower(referred_email));

-- -----------------------------------------------------------------------------
-- 3. waitlist_social_actions — one-time instagram_follow per user
--    Open Decision #4: cap to once per account via DB unique constraint, not just UI.
-- -----------------------------------------------------------------------------
create table if not exists public.waitlist_social_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  action_type text not null check (action_type in ('instagram_follow')),
  created_at timestamptz not null default now(),
  unique (user_id, action_type)
);

alter table public.waitlist_social_actions enable row level security;

drop policy if exists "Users can view own social actions" on public.waitlist_social_actions;
create policy "Users can view own social actions"
  on public.waitlist_social_actions for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own social actions" on public.waitlist_social_actions;
create policy "Users can insert own social actions"
  on public.waitlist_social_actions for insert
  with check (auth.uid() = user_id);

drop policy if exists "Service role can manage social actions" on public.waitlist_social_actions;
create policy "Service role can manage social actions"
  on public.waitlist_social_actions for all
  using (true) with check (true);

create index if not exists idx_waitlist_social_actions_user on public.waitlist_social_actions(user_id);
create index if not exists idx_waitlist_social_actions_type on public.waitlist_social_actions(action_type);

-- -----------------------------------------------------------------------------
-- 4. Points — DERIVED, not stored (Open Decision #6)
--    3 points per completed referral (referred user auth_method_completed=true)
--    1 point per instagram_follow (one-time)
--    View is read-only; ranking RPC uses it live via RANK() OVER.
-- -----------------------------------------------------------------------------
create or replace view public.waitlist_points as
select
  w.id as user_id,
  w.email,
  w.created_at as waitlist_joined_at,
  coalesce(r.points_referral, 0) + coalesce(s.points_social, 0) as points,
  coalesce(r.referrals_completed, 0) as referrals_completed,
  coalesce(s.instagram_follow, 0) as instagram_follow
from public.waitlist w
left join (
  select referrer_user_id, count(*)::int as referrals_completed, count(*)::int * 3 as points_referral
  from public.waitlist_referrals
  where status = 'completed'
  group by referrer_user_id
) r on r.referrer_user_id = w.id
left join (
  select user_id, count(*)::int as instagram_follow, count(*)::int * 1 as points_social
  from public.waitlist_social_actions
  where action_type = 'instagram_follow'
  group by user_id
) s on s.user_id = w.id;

-- For backwards compat with old referral_count trigger, also consider
-- waitlist.referral_count as pending referral points that haven't been
-- migrated to waitlist_referrals. Not counted in this view to avoid double-count;
-- the Edge Function that completes referrals is the source of truth.

-- -----------------------------------------------------------------------------
-- 5. Ranking RPC — live position via RANK() OVER (points DESC, waitlist_joined_at ASC)
--    Open Decision #6: derived live, not denormalized column.
--    Returns: position, total, points, referrals_completed, instagram_follow
-- -----------------------------------------------------------------------------
create or replace function public.waitlist_ranking(p_email text)
returns table(
  "position" integer,
  total integer,
  points integer,
  referrals_completed integer,
  instagram_follow integer,
  referral_code text
)
language sql
security definer
set search_path = public
as $$
  with ranked as (
    select
      wp.user_id,
      wp.email,
      wp.waitlist_joined_at,
      wp.points,
      wp.referrals_completed,
      wp.instagram_follow,
      rank() over (order by wp.points desc, wp.waitlist_joined_at asc) as rnk
    from public.waitlist_points wp
  ),
  me as (
    select rnk, points, referrals_completed, instagram_follow
    from ranked
    where lower(email) = lower(p_email)
    limit 1
  )
  select
    (select rnk from me)::int as "position",
    (select count(*)::int from public.waitlist) as total,
    (select points from me)::int as points,
    (select referrals_completed from me)::int as referrals_completed,
    (select instagram_follow from me)::int as instagram_follow,
    (select referral_code from public.waitlist where lower(email) = lower(p_email) limit 1) as referral_code
  where exists (select 1 from me);
$$;

grant execute on function public.waitlist_ranking(text) to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 6. Leaderboard preview RPC — top N by ranking (for UI testing, Phase 4)
-- -----------------------------------------------------------------------------
create or replace function public.waitlist_leaderboard_preview(limit_count integer default 10)
returns table(rank integer, email_masked text, points integer, waitlist_joined_at timestamptz)
language sql
security definer
set search_path = public
as $$
  with ranked as (
    select
      wp.email,
      wp.points,
      wp.waitlist_joined_at,
      rank() over (order by wp.points desc, wp.waitlist_joined_at asc) as rnk
    from public.waitlist_points wp
  )
  select
    rnk::int as rank,
    substring(email from 1 for 1) || '***@' || split_part(email, '@', 2) as email_masked,
    points,
    waitlist_joined_at
  from ranked
  order by rnk asc
  limit limit_count;
$$;

grant execute on function public.waitlist_leaderboard_preview(integer) to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 7. Keep existing waitlist_position and waitlist_ahead intact for backward compat
--    during the feature branch. They will be superseded by waitlist_ranking
--    once points are in use. No DROP.
-- -----------------------------------------------------------------------------
