create table if not exists public.shopify_connections (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  shop_domain text not null,
  access_token jsonb not null,
  scope text,
  installed_at timestamptz default now(),
  uninstalled_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, shop_domain)
);

create index if not exists idx_shopify_connections_user
  on public.shopify_connections(user_id);
create index if not exists idx_shopify_connections_shop
  on public.shopify_connections(shop_domain);

alter table public.shopify_connections enable row level security;

-- Users can only read their own connections.
drop policy if exists "Users can view own shopify connections" on public.shopify_connections;
create policy "Users can view own shopify connections"
  on public.shopify_connections for select
  using (auth.uid()::text = user_id);

-- Users can only create connections for themselves.
drop policy if exists "Users can insert own shopify connections" on public.shopify_connections;
create policy "Users can insert own shopify connections"
  on public.shopify_connections for insert
  with check (auth.uid()::text = user_id);

-- Users can only update their own connections.
drop policy if exists "Users can update own shopify connections" on public.shopify_connections;
create policy "Users can update own shopify connections"
  on public.shopify_connections for update
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

-- Service role manages everything (token exchange, webhook uninstall, GDPR).
drop policy if exists "Service role can manage shopify connections" on public.shopify_connections;
create policy "Service role can manage shopify connections"
  on public.shopify_connections for all
  using (true)
  with check (true);

drop trigger if exists trg_shopify_connections_updated_at on public.shopify_connections;
create trigger trg_shopify_connections_updated_at
  before update on public.shopify_connections
  for each row execute function public.touch_updated_at();
