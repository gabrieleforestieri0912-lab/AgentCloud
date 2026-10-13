-- -----------------------------------------------------------------------------
-- AgentCloud · Integrazione Google Docs (provider `google_docs`)
-- -----------------------------------------------------------------------------
-- Allarga il vincolo sui provider per la connessione Google Docs
-- (stesso OAuth client Google di Drive/Sheets, riga tenant_integrations
-- dedicata con scope drive.file + documents).
--
-- Deve restare allineato a IMPLEMENTED_PROVIDERS in
-- src/lib/integrations/catalog.ts.
--
-- Script idempotente: nessuna delete, nessuna perdita di connessioni.
-- -----------------------------------------------------------------------------
alter table public.tenant_integrations
  drop constraint if exists tenant_integrations_provider_check;

alter table public.tenant_integrations
  add constraint tenant_integrations_provider_check
  check (provider in (
    'notion','slack','hubspot','google_sheets','github','clickup','asana',
    'google_drive','airtable','trello','woocommerce','mailchimp','microsoft',
    'microsoft_outlook','google_docs'
  ));
