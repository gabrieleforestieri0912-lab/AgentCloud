-- -----------------------------------------------------------------------------
-- AgentCloud · Integrazioni OAuth dei tenant (tenant_integrations)
-- -----------------------------------------------------------------------------
-- Provider supportati (devono restare allineati a IMPLEMENTED_PROVIDERS in
-- src/lib/integrations/catalog.ts — il test lo verifica):
--   notion, slack, hubspot, google_sheets, github, clickup, asana,
--   google_drive, airtable, trello, woocommerce, mailchimp, microsoft
--
-- Redirect URI da registrare su ciascun provider:
--   https://www.agentcloud.agency/api/integrations/<provider>/callback
--
-- Script idempotente: puoi rieseguirlo quante volte vuoi. Rieseguirlo NON
-- cancella connessioni: vedi la sezione 2.
--
-- Per il batch 2 vedi anche schema-integrations-batch2.sql, che allarga il
-- vincolo e documenta il caso WooCommerce (chiavi per store, non env).
-- Questo file è già aggiornato con tutti i 12 provider, quindi applicare i due
-- file in qualsiasi ordine dà lo stesso risultato.
-- -----------------------------------------------------------------------------

create extension if not exists pgcrypto;


-- -----------------------------------------------------------------------------
-- 0. Helper condiviso (già creato da schema.sql / schema-waitlist.sql)
-- -----------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;


-- -----------------------------------------------------------------------------
-- 1. Tabella delle integrazioni
-- -----------------------------------------------------------------------------
create table if not exists public.tenant_integrations (
  id uuid default gen_random_uuid() primary key,
  tenant_id text not null,
  provider text not null,
  status text not null default 'pending' check (status in ('connected','disconnected','error','pending')),
  access_token text, -- envelope cifrato, nullable solo durante pending/error
  refresh_token text, -- envelope cifrato, nullable (Slack/ClickUp/Notion non lo emettono)
  expires_at timestamptz, -- GitHub e ClickUp: token senza scadenza
  scope text,
  external_account_id text, -- GitHub login, Slack team id, HubSpot portal id, Notion workspace id, ClickUp/Asana user id
  metadata jsonb default '{}'::jsonb, -- workspace name, team id, ecc.
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (tenant_id, provider)
);


-- -----------------------------------------------------------------------------
-- 2. Vincolo sui provider supportati
-- -----------------------------------------------------------------------------
-- La lista dei provider qui dentro DEVE restare allineata a
-- IMPLEMENTED_PROVIDERS in src/lib/integrations/catalog.ts: scripts/
-- test-integrations-ui.mjs verifica che le due liste coincidano e fallisce se
-- divergono. Il SQL non può derivare dal TS, quindi la sincronizzazione è
-- controllata da un test.
--
-- Provider: notion, slack, hubspot, google_sheets, github, clickup, asana,
--           google_drive, airtable, trello, woocommerce, mailchimp, microsoft
alter table public.tenant_integrations
  drop constraint if exists tenant_integrations_provider_check;

-- Rimozioni ESPLICITE e nominative dei provider usati in passato. Non usare una
-- `delete where provider not in (...)`: è una bomba a orologeria. Se questo
-- file viene rieseguito prima di schema-integrations-batch2.sql, quella delete
-- cancella le connessioni dei provider che ancora non stanno in questo elenco —
-- e lo fa senza avvisare nessuno. Un errore del genere si scopre solo quando un
-- cliente torna dicendo che la connessione è sparita.

-- stripe: provider rimosso dal catalogo.
delete from public.tenant_integrations where provider = 'stripe';

-- linear: sostituito da clickup (Linear OAuth richiede un piano a pagamento).
delete from public.tenant_integrations where provider = 'linear';

-- Se qui sotto ci fosse un provider inatteso che viola il vincolo, l'ALTER
-- fallisce con un errore esplicito: è il comportamento voluto. Meglio un
-- deploy che si ferma che dati cancellati in silenzio.

alter table public.tenant_integrations
  add constraint tenant_integrations_provider_check
  check (provider in (
    'notion','slack','hubspot','google_sheets','github','clickup','asana',
    'google_drive','airtable','trello','woocommerce','mailchimp','microsoft'
  ));


-- -----------------------------------------------------------------------------
-- 3. Indici
-- -----------------------------------------------------------------------------
create index if not exists idx_tenant_integrations_tenant
  on public.tenant_integrations(tenant_id);
create index if not exists idx_tenant_integrations_provider
  on public.tenant_integrations(provider);
create index if not exists idx_tenant_integrations_tenant_provider
  on public.tenant_integrations(tenant_id, provider);


-- -----------------------------------------------------------------------------
-- 4. Row Level Security
-- -----------------------------------------------------------------------------
alter table public.tenant_integrations enable row level security;

-- Users can view their own integrations (text compare to allow __tenant__ via service role bypass)
drop policy if exists "Users can view own tenant integrations" on public.tenant_integrations;
create policy "Users can view own tenant integrations"
  on public.tenant_integrations for select
  using (auth.uid()::text = tenant_id);

-- Users can insert their own integrations (callback upserts via service role, but allow self-insert)
drop policy if exists "Users can insert own tenant integrations" on public.tenant_integrations;
create policy "Users can insert own tenant integrations"
  on public.tenant_integrations for insert
  with check (auth.uid()::text = tenant_id);

-- Users can update their own integrations
drop policy if exists "Users can update own tenant integrations" on public.tenant_integrations;
create policy "Users can update own tenant integrations"
  on public.tenant_integrations for update
  using (auth.uid()::text = tenant_id)
  with check (auth.uid()::text = tenant_id);

-- Users can delete their own integrations (disconnect)
drop policy if exists "Users can delete own tenant integrations" on public.tenant_integrations;
create policy "Users can delete own tenant integrations"
  on public.tenant_integrations for delete
  using (auth.uid()::text = tenant_id);

-- Service role manages everything (OAuth callback, proxy delle tool, refresh token)
drop policy if exists "Service role can manage tenant integrations" on public.tenant_integrations;
create policy "Service role can manage tenant integrations"
  on public.tenant_integrations for all
  using (true)
  with check (true);


-- -----------------------------------------------------------------------------
-- 5. Trigger updated_at
-- -----------------------------------------------------------------------------
drop trigger if exists trg_tenant_integrations_updated_at on public.tenant_integrations;
create trigger trg_tenant_integrations_updated_at
  before update on public.tenant_integrations
  for each row execute function public.touch_updated_at();


-- -----------------------------------------------------------------------------
-- 6. Verifica rapida (opzionale): provider presenti e vincolo attivo
-- -----------------------------------------------------------------------------
-- select provider, count(*) from public.tenant_integrations group by provider order by provider;
-- select conname, pg_get_constraintdef(oid) from pg_constraint where conname = 'tenant_integrations_provider_check';
