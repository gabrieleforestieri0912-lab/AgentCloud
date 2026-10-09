-- ⚠️ VERIFICATO CHE MANCA SU PRODUZIONE — applicare questo file.
--
-- Durante la verifica dei privacy webhooks, un `shop/redact` ha risposto 500
-- con "Could not find the table 'public.shopify_compliance_events' in the
-- schema cache": questo file era nel repository ma non era mai stato eseguito
-- sul database. La conseguenza era il difetto peggiore possibile in un
-- obbligo GDPR — il webhook di cancellazione falliva e i dati del negozio
-- restavano al loro posto.
--
-- Applicare con `supabase db push`, oppure incollando questo file nel SQL
-- Editor del progetto su Supabase.
--
-- Per verificare che sia applicata:
--   select to_regclass('public.shopify_compliance_events');
--   -- deve restituire la tabella, non NULL
--
-- Nota: `supabase/migrations/` è in .gitignore, quindi il DDL vive qui nei
-- file `schema-*.sql`, che è la convenzione del repository.

create table if not exists public.shopify_compliance_events (
  id uuid default gen_random_uuid() primary key,
  -- ID univoco del webhook (header X-Shopify-Webhook-Id): serve per
  -- l'idempotenza, lo stesso evento ricevuto due volte viene registrato
  -- una sola volta. NULL quando l'header manca (i NULL non confliggono).
  webhook_id text unique,
  shop_domain text not null,
  topic text not null,
  status text not null default 'received',
  received_at timestamptz default now()
);

create index if not exists idx_shopify_compliance_shop
  on public.shopify_compliance_events(shop_domain, received_at desc);

alter table public.shopify_compliance_events enable row level security;

-- NESSUNA policy per utenti autenticati: la tabella contiene solo
-- metadati di audit (shop_domain, topic, timestamp — MAI dati personali)
-- ed è letta/scritta esclusivamente lato server con il service role,
-- che bypassa le policy RLS.
