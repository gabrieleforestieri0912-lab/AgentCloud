-- La tabella ESISTE già su produzione (verificato via information_schema il
-- 2026-10-09) e la sua struttura è corretta.
--
-- Se un webhook di conformità risponde 500 con
--   "Could not find the table 'public.shopify_compliance_events' in the schema cache"
-- NON è questa la causa: è la **schema cache di PostgREST** che non conosce
-- ancora la tabella, non ricaricata dopo la creazione. Il sintomo è identico
-- a una tabella mancante, quindi la diagnosi va fatta con una query diretta e
-- NON leggendo il catalogo di PostgREST (che riflette la cache):
--
--   select to_regclass('public.shopify_compliance_events');   -- se non è NULL, la tabella c'è
--
-- La correzione NON è riapplicare questo file, è ricaricare la cache:
--
--   notify pgrst, 'reload schema';
--
-- Dopo il reload PostgREST elenca 32 tabelle e i webhook di conformità
-- rispondono 200 scrivendo l'audit correttamente.
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
