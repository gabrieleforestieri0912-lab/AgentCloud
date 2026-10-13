-- -----------------------------------------------------------------------------
-- AgentCloud · Integrazione Microsoft Outlook (provider `microsoft_outlook`)
-- -----------------------------------------------------------------------------
-- Allarga il vincolo sui provider per la connessione Outlook separata
-- (stessa app Entra di `microsoft`, riga tenant_integrations diversa per il
-- consenso incrementale mail/calendario).
--
-- Deve restare allineato a IMPLEMENTED_PROVIDERS in
-- src/lib/integrations/catalog.ts:
--   notion, slack, hubspot, google_sheets, github, clickup, asana,
--   google_drive, airtable, trello, woocommerce, mailchimp, microsoft,
--   microsoft_outlook
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
    'microsoft_outlook'
  ));
