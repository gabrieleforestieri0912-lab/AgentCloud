-- -----------------------------------------------------------------------------
-- AgentCloud · Preferenze utente (user_preferences)
-- -----------------------------------------------------------------------------
-- Una riga = una preferenza dell'account (chiave -> valore JSON): larghezza
-- della sidebar, sidebar aperta, dimensione testo chat, agente predefinito,
-- toggle di notifica email/prodotti.
--
-- Perché esiste: queste preferenze vivevano SOLO in localStorage (del browser):
-- cambiando device o browser, o dopo uno svuotamento dello storage, l'utente
-- si ritrovava i default. Il browser resta la fonte immediata (zero-flash);
-- il DB è la copia allineata: le scritture locali vengono rispecchiate via
-- API (fire-and-forget) e al caricamento ciò che manca in locale arriva da qui.
--
-- Uso: da API server autenticate con service-role (vedi /api/user/preferences);
-- le policy RLS coprono il caso di client anonimo con l'utente autenticato.
-- -----------------------------------------------------------------------------

create table if not exists public.user_preferences (
  user_id text not null,
  key text not null check (length(key) between 1 and 100),
  value jsonb not null,
  updated_at timestamptz default now(),
  primary key (user_id, key)
);

create index if not exists idx_user_preferences_user
  on public.user_preferences(user_id);

alter table public.user_preferences enable row level security;

create policy "owner reads own preferences"
  on public.user_preferences for select
  to authenticated
  using (auth.uid()::text = user_id);

create policy "owner writes own preferences"
  on public.user_preferences for insert
  to authenticated
  with check (auth.uid()::text = user_id);

create policy "owner updates own preferences"
  on public.user_preferences for update
  to authenticated
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

create policy "owner deletes own preferences"
  on public.user_preferences for delete
  to authenticated
  using (auth.uid()::text = user_id);
