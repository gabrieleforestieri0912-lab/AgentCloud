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
--
-- I token restano cifrati a lato applicazione (AES-256-GCM, chiave server):
-- l'esposizione non è in chiaro, ma il danno resta (lettura metadata
-- cross-tenant, distruzione/tampering, bypass di disconnessioni).
--
-- File idempotente: drop + recreate con la variante corretta. Applicarlo
-- DOPO gli schema-*.sql di riferimento (altrimenti i file originali
-- riscrivono la versione rotta se re-applicati).
--
-- Nota: su Supabase il service role ha BYPASSRLS, quindi la policy è di
-- fatto documentazione — ma va resa corretta lo stesso: senza `to
-- service_role` il problema non riguarda il service role, riguarda TUTTI.
-- =============================================================================

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
drop policy if exists "Service role can manage profiles" on public.profiles;
create policy "Service role can manage profiles"
  on public.profiles for all
  to service_role
  using (true)
  with check (true);
