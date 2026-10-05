# Generic Integrations — Setup (7 provider)

Layer di integrazioni generiche multi-tenant, separato da Shopify. Ogni provider ha:

- un **adapter** OAuth in `src/lib/integrations/providers/<provider>.ts`
  (interfaccia `IntegrationProvider` in `src/lib/integrations/types.ts`);
- una riga in `tenant_integrations` (token cifrati app-level);
- una voce nel catalogo `src/lib/integrations.ts` con `available: true`.

Provider disponibili (7): **Notion, Slack, HubSpot, Google Sheets, GitHub, ClickUp, Asana**.

Le chiamate alle API dei provider con tool agente (GitHub, ClickUp, Asana, Google Sheets) sono **dirette**, fatte lato server con il token del tenant (`lib/integrations/api-proxy.ts`, `lib/google/sheets.ts`). **Non** esistono Edge Function proxy per le integrazioni: le uniche Supabase Function sono quelle del flusso waitlist.

## Flusso OAuth

1. La UI linka `/api/integrations/<provider>/authorize?returnTo=…`.
2. `authorize` costruisce l'URL del provider con uno `state` firmato (cookie CSRF) e reindirizza.
3. Il provider rimanda a `${NEXT_PUBLIC_SITE_URL}/api/integrations/<provider>/callback`.
4. Il callback scambia il `code` (server-side), cifra i token e fa upsert in `tenant_integrations`.
5. `/api/integrations/status` elenca le connessioni; `/api/integrations/<provider>/disconnect` le revoca.

Redirect URI da registrare per **ogni** provider nella sua console OAuth:

```
${SITE}/api/integrations/<provider>/callback
```

dove `<provider>` ∈ `notion | slack | hubspot | google_sheets | github | clickup | asana`.

## Variabili comuni

| Variabile | Uso |
|-----------|-----|
| `NEXT_PUBLIC_SITE_URL` | Base per il redirect URI (in prod). In locale si usa l'origin della request. |
| `INTEGRATIONS_TOKEN_ENCRYPTION_KEY` | Chiave AES-256-GCM per cifrare i token in `tenant_integrations`. **Mai** `dev-tenant-key` in prod. |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Usate dal server (service client) per leggere/aggiornare `tenant_integrations`. |

## Provider

### Notion
| | |
|---|---|
| Env | `NOTION_OAUTH_CLIENT_ID`, `NOTION_OAUTH_CLIENT_SECRET` |
| Creazione app | Public integration su <https://www.notion.so/my-integrations> |
| Scope | Configurati nell'integrazione (read/insert/update), nessun parametro `scope` nell'authorize |
| Token | Non scade → nessun refresh |
| Tool agente | `notion_search`, `notion_read_page`, `notion_create_page`, `notion_append_blocks` — Notion API `https://api.notion.com/v1` (versione `2022-06-28`, override `NOTION_API_VERSION`) via `lib/integrations/api-proxy.ts`. |
| Note | L'utente deve condividere le pagine con l'integrazione, altrimenti non le vede. `notion_create_page` usa la property `title`: se il parent è un database con una property dal nome diverso, l'errore di Notion lo segnala e va usata quella property. |

### Slack
| | |
|---|---|
| Env | `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET` (+ `SLACK_SIGNING_SECRET` solo per webhook) |
| Opzionali | `SLACK_BOT_SCOPES` (default `chat:write,channels:read`), `SLACK_USER_SCOPES` (default vuoto) |
| Creazione app | <https://api.slack.com/apps> → OAuth & Permissions → Redirect URLs |
| Token | Bot token `xoxb-…` di norma non scade → nessun refresh |
| Tool agente | `slack_list_channels`, `slack_post_message`, `slack_read_channel` — Slack Web API `https://slack.com/api` via `lib/integrations/api-proxy.ts`. |
| Note | `slack_post_message` e `slack_list_channels` funzionano con gli scope di default. **`slack_read_channel` richiede `channels:history`**: senza, Slack risponde `missing_scope` e il tool riporta l'errore (non riprovare). Il bot vede solo i canali di cui è membro: se l'utente deve postare in un canale, deve prima invitare l'app (`/invite @AgentCloud`). |

### HubSpot
| | |
|---|---|
| Env | `HUBSPOT_CLIENT_ID`, `HUBSPOT_CLIENT_SECRET` |
| Opzionali | `HUBSPOT_SCOPES` (default `crm.objects.contacts.read crm.objects.contacts.write`) |
| Creazione app | Developer app su <https://developers.hubspot.com> → Auth → Redirect URLs |
| Token | access token ~6h + `refresh_token` → **auto-refresh** via l'hook `refreshToken` dell'adapter (`lib/integrations/api-proxy.ts`) |
| Tool agente | `hubspot_search_contacts`, `hubspot_get_contact`, `hubspot_create_contact`, `hubspot_update_contact`, `hubspot_list_companies` — CRM v3 `https://api.hubapi.com` via `lib/integrations/api-proxy.ts`. |
| Note | Un contatto non esiste senza email: `hubspot_create_contact` senza email valida rifiuta, e un 409 (email già presente) viene tradotto in "leggi il contatto, non creare un duplicato". `hubspot_update_contact` / `create_contact` ricevono le proprietà come `key=value;key=value` (`values`), non come JSON. |

### Google Sheets
| | |
|---|---|
| Env | Riusa `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (stesso OAuth client di Gmail/Calendar) |
| Opzionali | `GOOGLE_SHEETS_SCOPES` (default `https://www.googleapis.com/auth/spreadsheets`) |
| Redirect | **Devi** aggiungere `${SITE}/api/integrations/google_sheets/callback` tra gli Authorized redirect URIs del client Google, oltre a `/api/auth/google/callback`. Il **Google sign-in** (Supabase Auth) usa un **client dedicato** con la sua redirect URI, non questo. |
| Token | access token 1h + refresh token → **auto-refresh** (`lib/google/sheets.ts`) |
| Tool agente | `sheets_read_range`, `sheets_update_range`, `sheets_append_row` — chiamate dirette via `lib/google/sheets.ts`. |
| Note | Senza la redirect URI dedicata si ottiene `redirect_uri_mismatch`. |

### GitHub
| | |
|---|---|
| Env | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` |
| Opzionali | `GITHUB_SCOPES` (default `repo read:user user:email`) |
| Creazione app | OAuth App su <https://github.com/settings/developers> |
| Token | Non scade → nessun refresh |
| Tool agente | `github_list_repos`, `github_list_issues`, `github_create_issue` — chiamate dirette via `lib/integrations/api-proxy.ts`. |

### ClickUp
| | |
|---|---|
| Env | `CLICKUP_CLIENT_ID`, `CLICKUP_CLIENT_SECRET` |
| Opzionali | — (ClickUp non usa `scope`; l'utente sceglie i Workspace in fase di consenso) |
| Creazione app | ClickUp → avatar → **Settings → Apps → Create new app** (<https://app.clickup.com/settings/apps>) — gratis, anche su piano Free |
| Token | Long-lived, **nessun refresh token** |
| Tool agente | `clickup_list_spaces`, `clickup_list_tasks`, `clickup_create_task` — REST v2 `https://api.clickup.com/api/v2` via `lib/integrations/api-proxy.ts`. |

> Nota: ClickUp sostituisce Linear (l'OAuth di Linear richiede un piano Business/Enterprise a pagamento).

### Asana
| | |
|---|---|
| Env | `ASANA_CLIENT_ID`, `ASANA_CLIENT_SECRET` |
| Opzionali | `ASANA_SCOPES` (default: gli scope di default dell'app Asana) |
| Creazione app | <https://app.asana.com/0/developer-console> |
| Token | access token ~1h + `refresh_token` → **auto-refresh** (`lib/integrations/api-proxy.ts`) |
| Tool agente | `asana_list_workspaces`, `asana_list_projects`, `asana_list_tasks`, `asana_create_task` — chiamate dirette via `lib/integrations/api-proxy.ts`. |

## Database

Esegui `supabase/schema-integrations.sql` (idempotente). La migrazione rimuove i provider `stripe` e `linear` e abilita `github`/`clickup`/`asana` nel check:

```sql
provider in ('notion','slack','hubspot','google_sheets','github','clickup','asana')
```

## Tool agente

Definizioni e handler vivono in **`src/lib/agents/integration-tools.ts`** (estratti da `lib/agents/tools.ts`, che contiene solo uno spread + un dispatch). Gli handler risolvono il tenant (utente autenticato o tenant condiviso per admin via codice) e chiamano **`src/lib/integrations/api-proxy.ts`**, che:

1. legge la riga `tenant_integrations` (service client);
2. decripta l'access token e lo **rinfresca** se scaduto, usando l'hook `refreshToken` dell'adapter del provider (`getProvider(p).refreshToken`): va detto perché ogni provider scade diversamente — HubSpot ~6h, Asana ~1h, Google ~1h, mentre GitHub/ClickUp/Notion/Slack non scadono e non hanno refresh token;
3. chiama l'API del provider (REST o GraphQL) e restituisce testo compatto.

Nessun JWT dell'utente viene inoltrato: l'autorizzazione verso il provider usa il token OAuth salvato. Tool disponibili:

| Tool | Provider | Azione |
|------|----------|--------|
| `github_list_repos` | GitHub | Lista repo dell'account |
| `github_list_issues` | GitHub | Lista issue di un repo (`owner`, `repo`) |
| `github_create_issue` | GitHub | Crea issue (`owner`, `repo`, `title`) |
| `clickup_list_spaces` | ClickUp | Lista workspace/spaces/lists (con id) |
| `clickup_list_tasks` | ClickUp | Lista task (`listId` opzionale) |
| `clickup_create_task` | ClickUp | Crea task (`listId`, `title`) |
| `asana_list_workspaces` | Asana | Lista workspace |
| `asana_list_projects` | Asana | Lista progetti (`workspaceId`) |
| `asana_list_tasks` | Asana | Lista task (`projectId`) |
| `asana_create_task` | Asana | Crea task (`taskName` + `projectId` o `workspaceId`) |
| `notion_search` | Notion | Cerca pagine per titolo (`query`) |
| `notion_read_page` | Notion | Legge il testo di una pagina (`pageId`) |
| `notion_create_page` | Notion | Crea pagina figlia (`pageId`, `title`, `content`) |
| `notion_append_blocks` | Notion | Aggiunge paragrafi a una pagina (`pageId`, `content`) |
| `slack_list_channels` | Slack | Lista i canali visibili al bot (per ottenere il channel id) |
| `slack_post_message` | Slack | Invia messaggio (`channel`, `text`, `threadTs` opzionale) |
| `slack_read_channel` | Slack | Legge gli ultimi messaggi (`channel`) — richiede `channels:history` |
| `hubspot_search_contacts` | HubSpot | Cerca contatti (`query` matcha l'email) |
| `hubspot_get_contact` | HubSpot | Legge un contatto (`contactId` o `email`) |
| `hubspot_create_contact` | HubSpot | Crea contatto (`email` + `values`) |
| `hubspot_update_contact` | HubSpot | Aggiorna un contatto (`contactId`/`email` + `values`) |
| `hubspot_list_companies` | HubSpot | Lista aziende del portal |

I tool sono in `ALL_TOOLS_LIST` (`lib/agents/feature-flags.ts`) e abilitati come `optionalTools` su **tutti e 15 gli agenti** tramite la costante `NOTION_SLACK_HUBSPOT_TOOLS` (`lib/agents/registry.ts`). Ogni agente che ne ha almeno uno riceve in coda al system prompt la direttiva `INTEGRATION_TOOLS_DIRECTIVE`, che fissa la sequenza corretta (search → id → azione), la conferma prima delle scritture esterne e il divieto di ripetere un'azione già fallita. Se il provider non è collegato, il tool invita a connetterlo dalla dashboard con il marker `[[CONNECT:<provider>]]`.

Test: `node scripts/test-integration-tools.mjs` (registro e dispatch) e `node scripts/test-integrations.mjs` (flusso OAuth dei 7 provider con un account di test).

## UI

- `/dashboard/integrations` — griglia con tutte le app; stato **Connesso**/Connetti.
- `/agents/[slug]` e `/agents/[slug]/deploy` — la card integrazioni mostra **Connetti** per le app live e **Prossimamente** per quelle non ancora disponibili (`isIntegrationAvailable` in `src/lib/integrations.ts`).

## Troubleshooting

| Sintomo | Causa probabile |
|---------|-----------------|
| `provider_not_configured` | Manca l'env `<PROVIDER>_CLIENT_ID`/`_SECRET`. |
| `redirect_uri_mismatch` (Google) | Redirect del layer generico non registrata sul client OAuth. |
| `redirect_uri_mismatch` sul **login Google** | Client di Supabase Auth non configurato: crea un client OAuth dedicato (separato da Gmail/Calendar) e registra `https://<project-ref>.supabase.co/auth/v1/callback`. |
| `state_mismatch` / `state_provider_mismatch` | Cookie di stato scaduto o provider diverso: riparti da Connetti. |
| "No … account connected" dal tool | Riga assente o `status <> 'connected'` in `tenant_integrations`. |
| Tool scadono con errore 401 | Refresh fallito: le env `<PROVIDER>_CLIENT_ID`/`_SECRET` mancano lato server, oppure il refresh token è stato revocato → va riconnesso dalla dashboard. |
| `slack_read_channel` → `missing_scope` | Manca lo scope OAuth `channels:history` sull'app Slack. |
| `slack_post_message` → `channel_not_found` | Il bot non è nel canale: l'utente deve invitare l'app (`/invite @AgentCloud`). |
| `hubspot_create_contact` → 409 | Email già presente: usare `hubspot_get_contact` invece di creare un duplicato. |
