-- =============================================================================
-- Fix RLS — policy "Service role" senza `to service_role`
--
-- Motivo (documentato in supabase/schema.sql:110-115): una policy
-- `for all using (true)` SENZA la clausola `to service_role` vale per TUTTI
-- i ruoli, incluso `anon` e `authenticated`. Significa che chiunque fosse
-- loggato (o anche anonimo) poteva leggere, modificare ed eliminare le righe
-- di TUTTI i tenant su queste tabelle:
--
--   * tenant_integrations, shopify_connections, google_connections  → token
--     OAuth cifrati + metadata e stato delle connessioni altrui
--   * conversation_agents                                          → associazioni chat
--   * waitlist_referral_codes / referrals / social_actions         → codici e crediti
--   * profiles (policy duplicata in schema-waitlist.sql, più debole
--     dell'originale di schema.sql)
--   * subscriptions, user_agents, agent_runs, agent_notifications,
--     carts, cart_items → copie DB PRE-d536f67 di schema.sql: la versione
--     corretta del file è nel repository ma non è mai stata rieseguita
--     sul database
--   * waitlist_points (view) → una vista di Postgres gira con i diritti
--     del proprietario (postgres), che la RLS non filtra: con il grant
--     di default esposta a anon, mostrava email e punti di tutta la
--     waitlist senza autenticazione
--
-- Verificato sul database di produzione il 2026-10-31 con la anon key:
--   * 12 tabelle leggibili e scrivibili da anon (probe di scrittura:
--     l'insert passava la RLS e fermava solo il NOT NULL);
--   * la view waitlist_points restituiva 21 email.
-- Le tabelle conversation_agents e waitlist_referrals erano vuote e quindi
-- non osservabili in lettura, ma hanno la stessa policy rotta nei file.
--
-- I token restano cifrati a lato applicazione (AES-256-GCM, chiave server):
-- l'esposizione non è in chiaro, ma il danno resta (lettura metadata
-- cross-tenant, distruzione/tampering, bypass di disconnessioni).
--
-- File idempotente: enable RLS + drop + recreate con la variante corretta.
-- Applicarlo DOPO gli schema-*.sql di riferimento (altrimenti i file
-- originali riscrivono la versione rotta se re-applicati).
--
-- Nota: su Supabase il service role ha BYPASSRLS, quindi la policy è di
-- fatto documentazione — ma va resa corretta lo stesso: senza `to
-- service_role` il problema non riguarda il service role, riguarda TUTTI.
-- Le policy per-utente ("Users can …") vengono ricreate nella forma
-- canonica di schema.sql: se nel DB mancano, altrimenti gli utenti
-- perderebbero l'accesso alle proprie righe dopo il fix.
-- =============================================================================

-- 0. RLS attiva su tutte le tabelle toccate (se già attiva non fa nulla;
--    se qualcuna fosse rimasta senza RLS, le policy da sole non bastano)
alter table public.tenant_integrations      enable row level security;
alter table public.shopify_connections      enable row level security;
alter table public.google_connections       enable row level security;
alter table public.conversation_agents      enable row level security;
alter table public.waitlist_referral_codes  enable row level security;
alter table public.waitlist_referrals       enable row level security;
alter table public.waitlist_social_actions  enable row level security;
alter table public.profiles                 enable row level security;
alter table public.subscriptions            enable row level security;
alter table public.user_agents              enable row level security;
alter table public.agent_runs               enable row level security;
alter table public.agent_notifications      enable row level security;
alter table public.carts                    enable row level security;
alter table public.cart_items               enable row level security;

-- 1. tenant_integrations (schema-integrations.sql:140)
drop policy if exists "Service role can manage tenant integrations"
  on public.tenant_integrations;
create policy "Service role can manage tenant integrations"
  on public.tenant_integrations for all
  to service_role
  using (true)
  with check (true);

-- 2. shopify_connections (schema-shopify-oauth.sql:42)
drop policy if exists "Service role can manage shopify connections"
  on public.shopify_connections;
create policy "Service role can manage shopify connections"
  on public.shopify_connections for all
  to service_role
  using (true)
  with check (true);

-- 3. google_connections (schema-google-oauth.sql:70)
drop policy if exists "Service role can manage google connections"
  on public.google_connections;
create policy "Service role can manage google connections"
  on public.google_connections for all
  to service_role
  using (true)
  with check (true);

-- 4. conversation_agents (schema-conversations.sql:83)
drop policy if exists "Service role can manage conversation_agents"
  on public.conversation_agents;
create policy "Service role can manage conversation_agents"
  on public.conversation_agents for all
  to service_role
  using (true)
  with check (true);

-- 5. waitlist_referral_codes (schema-waitlist-ranking.sql:21)
drop policy if exists "Service role can manage referral codes"
  on public.waitlist_referral_codes;
create policy "Service role can manage referral codes"
  on public.waitlist_referral_codes for all
  to service_role
  using (true)
  with check (true);

-- 6. waitlist_referrals (schema-waitlist-ranking.sql:71)
drop policy if exists "Service role can manage referrals"
  on public.waitlist_referrals;
create policy "Service role can manage referrals"
  on public.waitlist_referrals for all
  to service_role
  using (true)
  with check (true);

-- 7. waitlist_social_actions (schema-waitlist-ranking.sql:140)
drop policy if exists "Service role can manage social actions"
  on public.waitlist_social_actions;
create policy "Service role can manage social actions"
  on public.waitlist_social_actions for all
  to service_role
  using (true)
  with check (true);

-- 8. profiles — il duplicato debole di schema-waitlist.sql:71 sovrascrive
--    l'originale corretto di schema.sql:117 se applicato dopo: lo si ricrea
--    nella forma corretta così l'ordine di applicazione non conta più.
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Service role can manage profiles" on public.profiles;
create policy "Service role can manage profiles"
  on public.profiles for all
  to service_role
  using (true)
  with check (true);

-- 9. subscriptions (schema.sql:186-201)
drop policy if exists "Users can view own subscriptions" on public.subscriptions;
create policy "Users can view own subscriptions"
  on public.subscriptions for select
  using (auth.uid()::text = user_id);

drop policy if exists "Service role can manage subscriptions" on public.subscriptions;
create policy "Service role can manage subscriptions"
  on public.subscriptions for all
  to service_role
  using (true)
  with check (true);

-- 10. user_agents (schema.sql:258-274)
drop policy if exists "Users can view own user_agents" on public.user_agents;
create policy "Users can view own user_agents"
  on public.user_agents for select
  using (auth.uid()::text = user_id);

drop policy if exists "Users can update own user_agents config" on public.user_agents;
create policy "Users can update own user_agents config"
  on public.user_agents for update
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

drop policy if exists "Service role can manage user_agents" on public.user_agents;
create policy "Service role can manage user_agents"
  on public.user_agents for all
  to service_role
  using (true)
  with check (true);

-- 11. agent_runs (schema.sql:315-330)
drop policy if exists "Users can view own agent_runs" on public.agent_runs;
create policy "Users can view own agent_runs"
  on public.agent_runs for select
  using (auth.uid()::text = user_id);

drop policy if exists "Users can insert own agent_runs" on public.agent_runs;
create policy "Users can insert own agent_runs"
  on public.agent_runs for insert
  with check (auth.uid()::text = user_id);

drop policy if exists "Service role can manage agent_runs" on public.agent_runs;
create policy "Service role can manage agent_runs"
  on public.agent_runs for all
  to service_role
  using (true)
  with check (true);

-- 12. agent_notifications (schema.sql:382-398)
drop policy if exists "Users can view own agent_notifications" on public.agent_notifications;
create policy "Users can view own agent_notifications"
  on public.agent_notifications for select
  using (auth.uid()::text = user_id);

drop policy if exists "Users can update own agent_notifications" on public.agent_notifications;
create policy "Users can update own agent_notifications"
  on public.agent_notifications for update
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

drop policy if exists "Service role can manage agent_notifications" on public.agent_notifications;
create policy "Service role can manage agent_notifications"
  on public.agent_notifications for all
  to service_role
  using (true)
  with check (true);

-- 13. carts (schema.sql:477-488)
drop policy if exists "Users can manage own carts" on public.carts;
create policy "Users can manage own carts"
  on public.carts for all
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

drop policy if exists "Service role can manage carts" on public.carts;
create policy "Service role can manage carts"
  on public.carts for all
  to service_role
  using (true)
  with check (true);

-- 14. cart_items (schema.sql:509-520)
drop policy if exists "Users can manage own cart_items" on public.cart_items;
create policy "Users can manage own cart_items"
  on public.cart_items for all
  using (exists (select 1 from public.carts where carts.id = cart_items.cart_id and carts.user_id = auth.uid()::text))
  with check (exists (select 1 from public.carts where carts.id = cart_items.cart_id and carts.user_id = auth.uid()::text));

drop policy if exists "Service role can manage cart_items" on public.cart_items;
create policy "Service role can manage cart_items"
  on public.cart_items for all
  to service_role
  using (true)
  with check (true);

-- 15. waitlist_points (view, schema-waitlist-ranking.sql:153)
-- Una vista Postgres esegue le query come il suo proprietario (postgres),
-- che la RLS non filtra: con il grant di default a anon la view restituiva
-- email + punti di TUTTA la waitlist a chiunque. Nessun codice la legge
-- direttamente (grep: zero `.from("waitlist_points")` in src) — il posto
-- di giusto sono le RPC security definer (waitlist_ranking,
-- waitlist_leaderboard_preview) che mascherano le email e restano
-- invariate: girano come postgres, proprietario della view.
revoke select on public.waitlist_points from anon, authenticated;
