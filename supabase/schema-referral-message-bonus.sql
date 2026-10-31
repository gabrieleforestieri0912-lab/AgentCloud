alter table public.profiles
  add column if not exists referral_code text unique,
  add column if not exists referred_by text references public.profiles(referral_code) on delete set null;

-- L'hardening anti auto-promozione (schema-admin-role.sql) revoca l'UPDATE
-- generico su profiles e concede solo alcune colonne a `authenticated`. Senza
-- `referred_by` in quella lista, la scrittura dell'attribuzione fatta dal
-- browser (pagina signup e /auth/callback, col token dell'utente) finisce in
-- 403 e il referral non viene MAI accreditato — catena morta in produzione.
-- La riga resta protetta dalla policy RLS di profiles (verificato: PATCH su
-- riga altrui con colonna concessa → 0 righe aggiornate).
grant update (referred_by) on public.profiles to authenticated;

create index if not exists idx_profiles_referral_code on public.profiles(referral_code);

create table if not exists public.referral_message_grants (
  referred_id uuid primary key references public.profiles(id) on delete cascade,
  referrer_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists idx_referral_message_grants_referrer
  on public.referral_message_grants(referrer_id);

alter table public.referral_message_grants enable row level security;

drop policy if exists "Referrer can view own grants" on public.referral_message_grants;
create policy "Referrer can view own grants"
  on public.referral_message_grants for select
  using (referrer_id = (select auth.uid()));

create or replace function public.gen_profile_referral_code()
returns text
language plpgsql
as $$
declare
  candidate text;
begin
  loop
    candidate := lower(substr(md5(random()::text || clock_timestamp()::text || gen_random_uuid()::text), 1, 8));
    exit when not exists (select 1 from public.profiles where referral_code = candidate);
  end loop;
  return candidate;
end;
$$;

do $$
declare r record;
begin
  for r in select id from public.profiles where referral_code is null loop
    update public.profiles
    set referral_code = public.gen_profile_referral_code()
    where id = r.id;
  end loop;
end $$;

create or replace function public.profiles_gen_referral_code()
returns trigger
language plpgsql
as $$
begin
  if new.referral_code is null or new.referral_code = '' then
    new.referral_code := public.gen_profile_referral_code();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_referral_code on public.profiles;
create trigger trg_profiles_referral_code
  before insert on public.profiles
  for each row execute function public.profiles_gen_referral_code();

create or replace function public.profiles_normalize_referred_by()
returns trigger
language plpgsql
as $$
begin
  if old.referred_by is not null and new.referred_by is distinct from old.referred_by then
    new.referred_by := old.referred_by;
  elsif new.referred_by = new.referral_code
     or not exists (select 1 from public.profiles p where p.referral_code = new.referred_by) then
    new.referred_by := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_normalize_referred_by on public.profiles;
create trigger trg_profiles_normalize_referred_by
  before update on public.profiles
  for each row
  when (
    new.referred_by is not null
    and new.referred_by is distinct from old.referred_by
  )
  execute function public.profiles_normalize_referred_by();

create or replace function public.grant_referral_message_bonus()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.referral_message_grants (referred_id, referrer_id)
  select new.id, p.id
  from public.profiles p
  where p.referral_code = new.referred_by
    and p.id <> new.id
  on conflict (referred_id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_grant_referral_message_bonus on public.profiles;
create trigger trg_grant_referral_message_bonus
  after update on public.profiles
  for each row
  when (
    old.auth_method_completed is distinct from new.auth_method_completed
    and new.auth_method_completed = true
    and new.referred_by is not null
  )
  execute function public.grant_referral_message_bonus();

create or replace function public.referral_bonus_state(p_user_id text, p_base integer)
returns table(referrals integer, spent integer, code text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid;
  first_grant timestamptz;
  spent_total integer;
begin

  if coalesce(auth.uid()::text, '') <> p_user_id
     and coalesce(auth.role(), '') <> 'service_role' then
    return;
  end if;

  begin
    uid := p_user_id::uuid;
  exception when invalid_text_representation then
    return;
  end;

  select min(g.created_at) into first_grant
  from public.referral_message_grants g
  where g.referrer_id = uid;

  spent_total := coalesce((
    select sum(greatest(days.day_runs - p_base, 0))::int
    from (
      select count(*)::int as day_runs
      from public.agent_runs ar
      where ar.user_id = p_user_id
        and ar.started_at >= first_grant
        and not exists (
          select 1 from public.user_agents ua
          where ua.user_id = p_user_id
            and ua.activated_at is not null
            and ua.activated_at <= ar.started_at
        )
      group by (ar.started_at at time zone 'UTC')::date
    ) days
  ), 0);

  return query
    select
      (select count(*)::int from public.referral_message_grants g where g.referrer_id = uid),
      spent_total,
      (select p.referral_code from public.profiles p where p.id = uid);
end;
$$;

grant execute on function public.referral_bonus_state(text, integer) to authenticated, service_role;
