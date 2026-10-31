-- -----------------------------------------------------------------------------
-- Bonus messaggi da referral (freemium)
--
-- Regola di prodotto: chi non ha abbonamento attivo e finisce i 5 messaggi
-- gratuiti giornalieri può continuare a scrivere usando un POOL DI CREDITI una
-- tantum: 3 messaggi extra per ogni persona che si registra completando
-- l'auth partendo dal proprio link (/signup?ref=<codice>). I crediti non
-- scadono e non si ricaricano: si consumano solo DOPO i 5 base del giorno
-- (il calcolo vive in src/lib/billing/referral-bonus.ts, che chiama la RPC
-- qui sotto).
--
-- Un referral conta quando il profilo invitato transita a
-- auth_method_completed = true — la stessa soglia del referral della waitlist
-- (schema-waitlist-referral.sql): la registrazione deve essere portata a
-- termine, non basta la visita al link.
--
-- Applicabile più volte: tutti gli statement sono idempotenti.
-- -----------------------------------------------------------------------------

-- 1. Colonne su profiles.
--    referral_code: codice di invito proprio (generato, univoco).
--    referred_by:   CODICE (non uuid) del referrer. Il valore arriva dal
--                   client accanto al flip di auth_method_completed e viene
--                   validato dai trigger sotto: codice inesistente → null,
--                   autoreferral → null. Tenere il codice (e non l'uuid)
--                   evita un endpoint di risoluzione lato app: a validarlo è
--                   il database, atomicamente.
alter table public.profiles
  add column if not exists referral_code text unique,
  add column if not exists referred_by text references public.profiles(referral_code) on delete set null;

create index if not exists idx_profiles_referral_code on public.profiles(referral_code);

-- 2. Tabella dei crediti: una riga per referral validato, PK sul referrals
--    (un account invitato accredita il bonus una sola volta, anche se
--    l'update di auth_method_completed viene ripetuto).
create table if not exists public.referral_message_grants (
  referred_id uuid primary key references public.profiles(id) on delete cascade,
  referrer_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists idx_referral_message_grants_referrer
  on public.referral_message_grants(referrer_id);

-- RLS: l'utente può leggere solo i crediti che lo riguardano come referrer.
-- Nessuna policy di INSERT: la riga la crea solo il trigger security definer
-- (o la service role), mai il client.
alter table public.referral_message_grants enable row level security;

drop policy if exists "Referrer can view own grants" on public.referral_message_grants;
create policy "Referrer can view own grants"
  on public.referral_message_grants for select
  using (referrer_id = (select auth.uid()));

-- 3. Generatore di codice univoco (loop con retry: 8 hex = ~4 miliardi di
--    combinazioni, ma l'unicità deve essere garantita, non improbabile).
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

-- 4. Backfill dei profili esistenti senza codice.
do $$
declare r record;
begin
  for r in select id from public.profiles where referral_code is null loop
    update public.profiles
    set referral_code = public.gen_profile_referral_code()
    where id = r.id;
  end loop;
end $$;

-- 5. I nuovi profili nascono già col loro codice (handle_new_user inserisce la
--    riga profiles: questo trigger parte automaticamente).
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

-- 6. referred_by è validato e CONGELATO al primo assegnamento:
--      - un codice che non esiste (referral fasullo, ref scritto a mano) → null;
--      - il proprio codice (autoreferral) → null;
--      - dopo il primo set non si può più riassegnare.
--    Normalizzarlo QUI (BEFORE UPDATE) evita che la foreign key faccia fallire
--    l'intero update del profilo quando il codice è falso.
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

-- 7. Accredito del bonus: scatta UNA VOLTA, alla prima transizione a
--    auth_method_completed = true, se il profilo ha un referred_by valido.
--    SECURITY DEFINER perché l'update del profilo parte dal token dell'utente
--    invitato, che non deve poter scrivere in referral_message_grants.
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

-- 8. RPC: stato del bonus per un referrer.
--
--    earned (qui: `referrals`) = quanti referral validi ha.
--    spent  = messaggi extra già consumati = Σ sui giorni UTC dal primo
--             accredito di max(0, run_del_giorno − base). È il drenaggio esatto
--             del pool: il server ammette al più base + extra al giorno, quindi
--             sommare gli eccessi giornalieri non può superare il pool.
--    Le run fatte DA ABBONATO (dopo l'attivazione di un piano) non drenano il
--    bonus: in quei giorni non esisteva alcun limite, e senza questa clausola
--    chi si abbona e poi disdICE brucierebbe i crediti maturati con gli inviti.
--    Il moltiplicatore (3) e il tetto di sicurezza vivono nel codice
--    (src/lib/billing/referral-bonus.ts): qui il business config non si
--    duplica, passa `p_base` dal free tier configurabile.
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
  -- Si può leggere solo il proprio stato (il server usa la service role,
  -- che ci arriva con auth.role() = 'service_role').
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
