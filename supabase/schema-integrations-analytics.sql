-- -----------------------------------------------------------------------------
-- AgentCloud · Integrazione Google Analytics 4 (provider `google_analytics`)
-- -----------------------------------------------------------------------------
-- Allarga il vincolo sui provider per la connessione GA4 in sola lettura
-- (stesso OAuth client Google, riga tenant_integrations dedicata con scope
-- analytics.readonly).
--
-- Deve restare allineato a IMPLEMENTED_PROVIDERS in
-- src/lib/integrations/catalog.ts.
--
-- Script idempotente: nessuna delete, nessuna perdita di connessioni.
-- Applicare le migration integrations in ordine (outlook, docs, forms,
-- analytics, mailchimp): ognuna è cumulativa.
-- -----------------------------------------------------------------------------
alter table public.tenant_integrations
  drop constraint if exists tenant_integrations_provider_check;

alter table public.tenant_integrations
  add constraint tenant_integrations_provider_check
  check (provider in (
    'notion','slack','hubspot','google_sheets','github','clickup','asana',
    'google_drive','airtable','trello','woocommerce','mailchimp','microsoft',
    'microsoft_outlook','google_docs','google_forms','google_analytics'
  ));
