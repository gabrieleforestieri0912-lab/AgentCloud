-- =============================================================================
-- Schema: Multi-agent conversations + chat history management
-- =============================================================================

-- 1. conversations — estende con campi per archiviazione, eliminazione soft, titolo
--    Se la tabella non esiste, la crea. Se esiste, aggiunge le colonne mancanti.

create table if not exists public.conversations (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  title text not null default 'Nuova conversazione',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  archived_at timestamptz,
  deleted_at timestamptz
);

-- Aggiungi colonne se non esistono (per DB esistenti)
do $$ begin
  alter table public.conversations add column if not exists title text not null default 'Nuova conversazione';
exception when duplicate_column then null; end $$;

do $$ begin
  alter table public.conversations add column if not exists archived_at timestamptz;
exception when duplicate_column then null; end $$;

do $$ begin
  alter table public.conversations add column if not exists deleted_at timestamptz;
exception when duplicate_column then null; end $$;

create index if not exists idx_conversations_user on public.conversations(user_id);
create index if not exists idx_conversations_updated on public.conversations(user_id, updated_at desc);

-- 2. conversation_agents — junction table: quali agenti sono in una conversazione

create table if not exists public.conversation_agents (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  agent_slug text not null,
  tenant_id text not null,
  added_at timestamptz default now(),
  removed_at timestamptz,
  is_active_responder boolean default false,
  unique (conversation_id, agent_slug)
);

create index if not exists idx_conv_agents_conversation on public.conversation_agents(conversation_id);
create index if not exists idx_conv_agents_tenant on public.conversation_agents(tenant_id);
create index if not exists idx_conv_agents_active on public.conversation_agents(conversation_id, removed_at) where removed_at is null;

-- 3. conversation_messages — messaggi della conversazione (server-side)

create table if not exists public.conversation_messages (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id text not null,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  agent_slug text,
  tokens_in integer,
  tokens_out integer,
  created_at timestamptz default now()
);

create index if not exists idx_conv_messages_conversation on public.conversation_messages(conversation_id, created_at);
create index if not exists idx_conv_messages_user on public.conversation_messages(user_id);

-- =============================================================================
-- RLS Policies
-- =============================================================================

alter table public.conversations enable row level security;
alter table public.conversation_agents enable row level security;
alter table public.conversation_messages enable row level security;

-- conversations: solo il proprietario può leggere/modificare
drop policy if exists "Users can manage own conversations" on public.conversations;
create policy "Users can manage own conversations"
  on public.conversations for all
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

-- conversation_agents: solo membri del tenant possono leggere, service role scrive
drop policy if exists "Users can view own conversation_agents" on public.conversation_agents;
create policy "Users can view own conversation_agents"
  on public.conversation_agents for select
  using (tenant_id = auth.uid()::text);

drop policy if exists "Service role can manage conversation_agents" on public.conversation_agents;
create policy "Service role can manage conversation_agents"
  on public.conversation_agents for all
  using (true)
  with check (true);

-- conversation_messages: solo il proprietario può leggere/scrivere
drop policy if exists "Users can manage own conversation_messages" on public.conversation_messages;
create policy "Users can manage own conversation_messages"
  on public.conversation_messages for all
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

-- =============================================================================
-- Auto-update updated_at on conversations
-- =============================================================================

drop trigger if exists trg_conversations_updated_at on public.conversations;
create trigger trg_conversations_updated_at
  before update on public.conversations
  for each row execute function public.touch_updated_at();
