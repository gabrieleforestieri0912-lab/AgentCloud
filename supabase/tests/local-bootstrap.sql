-- =============================================================================
-- Bootstrap LOCALE (solo Docker/CI) — NON applicare a Supabase
--
-- Riproduce su un Postgres pulito gli elementi di Supabase di cui gli
-- schema-*.sql hanno bisogno: ruoli, schema `auth`, `auth.users` e
-- `auth.uid()`. Usato per eseguire davvero il test RLS
-- (supabase/tests/rls-agents-test.sql) senza un progetto Supabase.
--
-- Uso:
--   docker run -d --name rls-test -e POSTGRES_PASSWORD=pg postgres:16-alpine
--   psql ... -f supabase/tests/local-bootstrap.sql
--   psql ... -f supabase/schema.sql
--   psql ... -f supabase/schema-agents.sql
--   psql ... -f supabase/tests/rls-agents-test.sql
-- =============================================================================

-- Ruoli (come su Supabase: anon/authenticated nologin, service_role con
-- BYPASSRLS — è il BYPASSRLS che rende le policy "to service_role" pura
-- documentazione, esattamente come in produzione).
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
end;
$$;

-- Schema auth + tabelle minime richieste dagli schema (profiles ha FK su
-- auth.users, i trigger si agganciano ad auth.users).
create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key,
  email text,
  raw_user_meta_data jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select (
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
  )::uuid;
$$;

-- Come su Supabase: il "ruolo" del JWT (le policy di alcune tabelle lo
-- chiedono); in assenza di claims si assume anon.
create or replace function auth.role()
returns text
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
    'anon'
  );
$$;

-- Privilegi di default come su Supabase: gli schema esistenti sono
-- accessibili a tutti i ruoli applicativi, le policy RLS fanno il resto.
grant usage on schema public to anon, authenticated, service_role;
grant usage on schema auth to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public
  to anon, authenticated, service_role;
grant execute on all functions in schema public
  to anon, authenticated, service_role;
alter default privileges in schema public
  grant select, insert, update, delete on tables
  to anon, authenticated, service_role;
alter default privileges in schema public
  grant execute on functions
  to anon, authenticated, service_role;
