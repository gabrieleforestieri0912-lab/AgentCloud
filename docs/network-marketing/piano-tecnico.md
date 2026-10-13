# Network Marketing Agent — Piano tecnico breve

## 1. Architettura

Tutto segue i pattern esistenti di AgentCloud, niente nuove infrastrutture:

| Pezzo | Dove vive | Pattern esistente riusato |
|---|---|---|
| Scheda marketplace + pagina `/agents/network-marketing` | `src/lib/agents.ts` (SEEDS), `src/lib/i18n/agentCatalog.it.ts`, `src/lib/i18n/agentDetail.ts` | Pagina dettaglio generica (`src/app/agents/[slug]/page.tsx`) + `BUNDLES` + FAQ/use-case per slug |
| Runtime chat (system prompt §4) | `src/lib/agents/registry.ts` → `network-marketing` | `AGENT_RUNTIME` + `withIntegrationDirective`; tool esistenti (HubSpot, Calendar, Gmail, Sheets, Slack, Notion, file) |
| 11 skill | `src/lib/skills/catalog.ts` (const `NETWORK_MARKETING`) | `SkillPlugin`/`SkillEntry`; disponibilità integrazioni derivata da `INTEGRATIONS` |
| Compliance check deterministico | `src/lib/network-marketing/compliance.ts` | Nessuna dipendenza: regex IT + semaforo + `draftGate` anti-spam/consenso |
| Onboarding (6 domande) | `src/lib/network-marketing/onboarding.ts` | Domande come dati; risposte in `nm_profiles` |
| Dati multi-tenant | `supabase/schema-network-marketing.sql` | RLS per `account_id` come `schema-skills.sql` |
| Seed | `supabase/seed-network-marketing.sql` (template + 44 casi), `supabase/seed-skills-network-marketing.sql` (plugin + skill) | `ON CONFLICT` idempotente come `seed-skills.sql` |
| Bundle | `src/lib/bundles.ts` → `network-marketing-pro` | `calcPricing` (−12%/−22%/−35%) come gli altri bundle |

La pagina agente, la card marketplace, il tab Competenze e il checkout funzionano
senza nuovo codice UI: leggono già `AGENTS`, `BUNDLES`, `catalogPluginsForAgent`
e `getFAQs`, tutti estesi per questo agente.

## 2. Schema DB

`nm_profiles` (1 riga/account: onboarding, disclaimer, presa visione regole con
versione+data) · `nm_contacts` (consenso, temperatura, stage, `do_not_contact`,
tentativi, prossimo follow-up, `hubspot_id`) · `nm_interactions`
(bozze: `draft/approved/sent` + semaforo) · `nm_customers` (riordini) ·
`nm_team_members` (solo dati con consenso) · `nm_templates` · `nm_goals` ·
`nm_compliance_events` (audit log) · `nm_knowledge_docs` (RAG aziendale) ·
`nm_compliance_cases` (44 casi di test, lettura pubblica come `skills`).

RLS `nm_owner_all` (`auth.uid() = account_id`) su tutte le tabelle account;
`nm_customers` isolata via join sul contatto; `nm_compliance_cases` in lettura
pubblica. Export/cancellazione GDPR: delete su `nm_*` per `account_id`
(cancellazione a cascata via FK verso `auth.users`).

## 3. Rischi legali e mitigazioni

| Rischio | Mitigazione implementata | Residuo |
|---|---|---|
| Schemi piramidali / reclutamento come guadagno (L. 173/2005) | Regola NM-04 + skill che mettono prodotto e clienti al centro; FAQ e prompt lo vietano | Verifica legale dei testi prima del lancio |
| Claim di guadagno ingannevoli | NM-01 rosso bloccante + `hasOfficialIncomeData` come unica eccezione | Il legale valida le liste di pattern a ogni aggiornamento |
| Claim salute (Reg. CE 1924/2006) | NM-02 rosso bloccante; solo materiali ufficiali come fonte | Nessun database claim incluso: va caricato dall'utente |
| Spam / consenso (GDPR, art. 130) | `draftGate` (relazione/consenso, DNC, tetto 15/giorno), registro consensi, retention 12 mesi | Informative e basi giuridiche da validare col legale/DPA |
| Recesso 14 giorni | Prompt + template; promemoria nelle offerte | Rimando ai termini ufficiali dell'azienda caricata |
| Parere fiscale/legale automatico | Divieto nel prompt + skill obiezioni | — |

Il prompt da solo non basta: il modulo deterministico blocca davvero le bozze
rosse (non copiabili né inviabili), e ogni evento finisce in audit log.
Dettagli in `nota-legale.md`.
