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
| Tool agente | Nessuno (OAuth-only). |
| Note | L'utente deve condividere le pagine con l'integrazione, altrimenti non le vede. |

### Slack
| | |
|---|---|
| Env | `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET` (+ `SLACK_SIGNING_SECRET` solo per webhook) |
| Opzionali | `SLACK_BOT_SCOPES` (default `chat:write,channels:read`), `SLACK_USER_SCOPES` (default vuoto) |
| Creazione app | <https://api.slack.com/apps> → OAuth & Permissions → Redirect URLs |
| Token | Bot token `xoxb-…` di norma non scade → nessun refresh |
| Tool agente | Nessuno (OAuth-only). |

### HubSpot
| | |
|---|---|
| Env | `HUBSPOT_CLIENT_ID`, `HUBSPOT_CLIENT_SECRET` |
| Opzionali | `HUBSPOT_SCOPES` (default `crm.objects.contacts.read crm.objects.contacts.write`) |
| Creazione app | Developer app su <https://developers.hubspot.com> → Auth → Redirect URLs |
| Token | access token ~6h + `refresh_token` → refresh on demand |
| Tool agente | Nessuno (OAuth-only). |

### Google Sheets
| | |
|---|---|
| Env | Riusa `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (stesso OAuth client di Gmail/Calendar) |
| Opzionali | `GOOGLE_SHEETS_SCOPES` (default `https://www.googleapis.com/auth/spreadsheets`) |
| Redirect | **Devi** aggiungere `${SITE}/api/integrations/google_sheets/callback` tra gli Authorized redirect URIs del client Google, oltre a `/api/auth/google/callback`. |
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
2. decripta l'access token e lo **rinfresca** se scaduto (Asana);
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

I tool sono in `ALL_TOOLS_LIST` (`lib/agents/feature-flags.ts`) e abilitati come `optionalTools` su `personal-assistant`, `business-manager` e `support-agent` (`lib/agents/registry.ts`). Se il provider non è collegato, il tool invita a connetterlo dalla dashboard.

## UI

- `/dashboard/integrations` — griglia con tutte le app; stato **Connesso**/Connetti.
- `/agents/[slug]` e `/agents/[slug]/deploy` — la card integrazioni mostra **Connetti** per le app live e **Prossimamente** per quelle non ancora disponibili (`isIntegrationAvailable` in `src/lib/integrations.ts`).

## Troubleshooting

| Sintomo | Causa probabile |
|---------|-----------------|
| `provider_not_configured` | Manca l'env `<PROVIDER>_CLIENT_ID`/`_SECRET`. |
| `redirect_uri_mismatch` (Google) | Redirect del layer generico non registrata sul client OAuth. |
| `state_mismatch` / `state_provider_mismatch` | Cookie di stato scaduto o provider diverso: riparti da Connetti. |
| "No … account connected" dal tool | Riga assente o `status <> 'connected'` in `tenant_integrations`. |
| Asana scade e fallisce | `ASANA_CLIENT_ID`/`ASANA_CLIENT_SECRET` mancanti lato server. |
