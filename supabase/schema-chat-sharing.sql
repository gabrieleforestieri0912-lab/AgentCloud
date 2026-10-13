-- -----------------------------------------------------------------------------
-- AgentCloud · Condivisione chat in sola lettura (shared_chats)
-- -----------------------------------------------------------------------------
-- Una riga = uno snapshot congelato di una conversazione, leggibile da chiunque
-- abbia il token (link). Il destinatario non può modificare nulla: la pagina
-- pubblica /chat/shared/[token] non ha input né azioni, e non esiste alcuna API
-- di scrittura sullo snapshot.
--
-- Privacy: lo snapshot è creato solo su azione esplicita dell'utente ("Condividi");
-- la revoca cancella la riga (il link muore). La cancellazione dell'account deve
-- cancellare anche queste righe (vedi nota in schema.sql se esiste la cleanup).
-- -----------------------------------------------------------------------------

create table if not exists public.shared_chats (
  token text primary key,
  owner_user_id text not null,
  title text not null default 'Conversazione condivisa',
  snapshot jsonb not null default '{"messages":[]}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_shared_chats_owner
  on public.shared_chats(owner_user_id);

alter table public.shared_chats enable row level security;

-- Nessuna policy di lettura pubblica: l'accesso passa solo dalle API server
-- (service role). Il proprietario revoca via API autenticata.
