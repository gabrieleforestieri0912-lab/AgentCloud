-- Migration: add full_name to waitlist for welcome popup post-signup
alter table public.waitlist
  add column if not exists full_name text;

-- Optional: backfill from profiles where email matches (best-effort)
-- profiles.full_name may already exist for users who signed via Google OAuth
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='full_name') then
    update public.waitlist w
    set full_name = p.full_name
    from public.profiles p
    where w.full_name is null
      and p.full_name is not null
      and lower(p.email) = lower(w.email);
  end if;
end $$;
