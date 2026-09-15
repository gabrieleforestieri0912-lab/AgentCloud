-- 1. Colonne referral sulla waitlist
alter table public.waitlist
  add column if not exists referral_code text unique,
  add column if not exists referred_by text references public.waitlist(referral_code) on delete set null,
  add column if not exists referral_count integer not null default 0;

-- Indici per lookup rapido
create index if not exists idx_waitlist_referral_code on public.waitlist(referral_code);
create index if not exists idx_waitlist_referred_by on public.waitlist(referred_by);
create index if not exists idx_waitlist_created_at on public.waitlist(created_at);

-- 2. Backfill referral_code per righe esistenti senza codice (8 chars base36)
-- Usa gen_random_uuid() -> base36-like: 8 hex chars
do $$
declare r record;
begin
  for r in select id from public.waitlist where referral_code is null loop
    update public.waitlist
    set referral_code = lower(substr(md5(random()::text || id::text), 1, 8))
    where id = r.id;
  end loop;
end $$;

-- 3. Trigger per generare automaticamente referral_code su nuovi inserimenti quando non fornito
create or replace function public.waitlist_gen_referral_code()
returns trigger
language plpgsql
as $$
begin
  if new.referral_code is null or new.referral_code = '' then
    new.referral_code := lower(substr(md5(random()::text || new.email || now()::text), 1, 8));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_waitlist_referral_code on public.waitlist;
create trigger trg_waitlist_referral_code
  before insert on public.waitlist
  for each row execute function public.waitlist_gen_referral_code();

-- 4. Trigger per incrementare referral_count del referrer
create or replace function public.waitlist_bump_referral_count()
returns trigger
language plpgsql
as $$
begin
  if new.referred_by is not null then
    update public.waitlist
    set referral_count = referral_count + 1
    where referral_code = new.referred_by;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_waitlist_bump_referral on public.waitlist;
create trigger trg_waitlist_bump_referral
  after insert on public.waitlist
  for each row execute function public.waitlist_bump_referral_count();

-- 5. RPC helper: posizione in coda per email (rank per created_at)
-- NOTA: "position" è parola riservata in Postgres -> deve essere quotata con doppi apici
create or replace function public.waitlist_position(p_email text)
returns table("position" integer, total integer, referral_code text, referral_count integer)
language sql
security definer
set search_path = public
as $$
  select
    (select count(*)::int from public.waitlist where created_at <= w.created_at) as "position",
    (select count(*)::int from public.waitlist) as total,
    w.referral_code,
    w.referral_count
  from public.waitlist w
  where lower(w.email) = lower(p_email)
  limit 1;
$$;

grant execute on function public.waitlist_position(text) to anon, authenticated, service_role;
