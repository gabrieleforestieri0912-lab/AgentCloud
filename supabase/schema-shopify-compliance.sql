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
