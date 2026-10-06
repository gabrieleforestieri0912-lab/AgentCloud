# Generic Integrations — Setup (12 provider)

Layer di integrazioni generiche multi-tenant, separato da Shopify. Ogni provider ha:

- un **adapter** in `src/lib/integrations/providers/<provider>.ts`
  (interfaccia `IntegrationProvider` in `src/lib/integrations/types.ts`);
- una riga in `tenant_integrations` (token cifrati app-level);
- una voce in `IMPLEMENTED_PROVIDERS` (`src/lib/integrations/catalog.ts`);
- una voce nel catalogo `src/lib/integrations.ts` con `available: true`.

Provider disponibili (12): **Notion, Slack, HubSpot, Google Sheets, GitHub, ClickUp,
Asana, Google Drive, Airtable, Trello, WooCommerce, Mailchimp**.

Le chiamate alle API dei provider con tool agente sono **dirette**, fatte lato server
con il token del tenant (`lib/integrations/api-proxy.ts`, `lib/google/sheets.ts`).
**Non** esistono Edge Function proxy per le integrazioni: le uniche Supabase Function
sono quelle del flusso waitlist.

## Il catalogo è la fonte unica

`src/lib/integrations/catalog.ts` elenca tutti i provider in `PROVIDER_CATALOG`, e da
lì derivano `SupportedProvider`, le etichette, le categorie del filtro e
`GenericProvider`. I provider effettivamente disponibili stanno in
`IMPLEMENTED_PROVIDERS`.

Il perché della separazione: `registry.ts` usa `Record<ImplementedProvider,
IntegrationProvider>` non opzionale, quindi **un provider implementato senza adapter
fallisce il typecheck**, ma il catalogo può contenere in anticipo anche i provider
dei connettori futivi (scope, brand, guide) senza rompere la build.

La lista dei provider è **duplicata** in `supabase/schema-integrations.sql` (un CHECK
constraint non può derivare dal TS). `npm run test:ui` verifica che le due liste
coincidano: senza quel controllo una riga dimenticata in SQL fa fallire ogni
connessione con un errore di vincolo.

## Flusso OAuth

1. La UI linka `/api/integrations/<provider>/authorize?returnTo=…`.
2. `authorize` valida l'eventuale `tenantInput` (dati che il provider pretende
   dall'utente), costruisce l'URL del provider con uno `state` **firmato** e
   reindirizza.
3. Il provider rimanda a `${NEXT_PUBLIC_SITE_URL}/api/integrations/<provider>/callback`.
4. Il callback verifica firma, scadenza, tenant e provider dello `state`, scambia il
   `code` (server-side), **cifra** i token e fa upsert in `tenant_integrations`.
5. `/api/integrations/status` elenca le connessioni; `/api/integrations/<provider>/disconnect` le revoca.

Lo `state` è `base64url({t,p,n,e,x})` + HMAC-SHA256, in cookie httpOnly: legato al
tenant, al provider e con scadenza. Il payload `x` porta il `tenantInput` (es.
l'URL dello store WooCommerce) **firmato**: se arrivasse da un parametro riappreso dal
browser, un attaccante potrebbe cambiarlo e il server chiamerebbe un host suo.

Redirect URI da registrare per **ogni** provider nella sua console OAuth:

```
${SITE}/api/integrations/<provider>/callback
```

dove `<provider>` ∈ `notion | slack | hubspot | google_sheets | github | clickup |
asana | google_drive | airtable | trello | woocommerce | mailchimp`.

Per ambiente locale il dominio è `http://localhost:3000`; su Vercel preview cambia a
ogni deploy, quindi conviene registrare anche i domini di produzione stabili.

## PKCE

Alcuni provider richiedono PKCE (S256). Il `code_verifier` sta in un cookie httpOnly
separato; nello `state` finisce solo la `code_challenge`. Un `state` intercettato non
basta quindi a completare lo scambio. Oggi serve solo ad **Airtable**.

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

### Google Drive
| | |
|---|---|
| Env | Riusa `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (stesso OAuth client di Gmail/Calendar/Sheets) |
| Opzionali | `GOOGLE_DRIVE_SCOPES` (default `drive.file` + `drive.readonly`) |
| Redirect | **Devi** aggiungere `${SITE}/api/integrations/google_drive/callback` tra gli Authorized redirect URI del client Google, oltre a `/api/auth/google/callback` e a quella di Sheets. |
| Scope | `https://www.googleapis.com/auth/drive.file` (file creati dall'app) + `.../drive.readonly` (lettura dei file dell'utente). **Non** usare lo scope `drive` completo: è quello che Google manda in verifica manuale per le app non verificate, con rischio di blocco allo screening. |
| Token | access token 1h + refresh token → **auto-refresh**. `refreshToken` conserva il verifier precedente: Google non ne emette di nuovi, e azzerarlo renderebbe la riga irrecuperabile al rinnovo successivo. |
| Tool agente | `drive_search_files`, `drive_read_file`, `drive_list_folder` — REST v3 `https://www.googleapis.com/drive/v3`. |
| Note | I Google Docs/Sheets/Slides non si scaricano: vanno letti con `files/export`. I file binari (immagini, video) restituiscono un avviso con il link, non un errore. I file lunghi sono troncati a 20.000 caratteri e l'output **dichiara** il troncamento, così il modello non risponde convinto di aver letto tutto. |

### Airtable
| | |
|---|---|
| Env | `AIRTABLE_CLIENT_ID`, `AIRTABLE_CLIENT_SECRET` |
| Opzionali | `AIRTABLE_SCOPES` (default `data.records:read schema.bases:read`) |
| Creazione app | <https://airtable.com/develop> → OAuth integration → "Add OAuth Integration" |
| Redirect | `${SITE}/api/integrations/airtable/callback` |
| PKCE | **Obbligatorio** (S256). Il `code_verifier` resta nel cookie httpOnly. |
| Token | access token ~1h + `refresh_token` → **auto-refresh**. Anche i refresh token scadono (`refresh_expires_in`, di solito 60 giorni): scaduto quello, va riconnesso. |
| Tool agente | `airtable_list_bases`, `airtable_list_tables`, `airtable_list_records` — REST `https://api.airtable.com/v0`. |
| Note | Airtable non ha una sintassi di query: accetta solo formule. Il filtro accetta linguaggio naturale (`"Status: Open"`, `"Stage = Won"`, o una parola sola cercata nel record) e viene tradotto in `filterByFormula` con le stringhe escaped. I record sono troncati ai primi 6 campi. |
| Scope | **Sola lettura**: `data.records:read` + `schema.bases:read`. `data.records:write` non è più richiesto: i tool esposti sono read-only e il meccanismo di conferma delle scritture non esiste ancora (Open Decision 14). Va reintrodotto insieme al tool che lo usa (`airtable_create_record`), non prima. |

### Trello
| | |
|---|---|
| Env | `TRELLO_API_KEY` (la key dell'app; `TRELLO_API_SECRET` serve per la revoca) |
| Opzionali | `TRELLO_SCOPES` (default `read,write`), `TRELLO_TOKEN_EXPIRATION` (default `30days`) |
| Creazione app | <https://trello.com/power-ups/admin> — la **Key** è l'`APP_KEY` |
| Redirect | `${SITE}/api/integrations/trello/callback` |
| **Flusso atipico** | **Non** è un authorization_code flow OAuth. `GET /1/authorize` rimanda il token già pronto come `?token=…`. Per questo l'adapter dichiara `tokenInRedirect` e `authParam: "token"`. PKCE non esiste per Trello. |
| Token | **Nessun refresh token.** Scade dopo `expiration` richiesto in authorize. `expiration=30days` invece di `never`: `never` produce un token che non scade e che nessuno può revocare da solo. |
| Tool agente | `trello_list_boards`, `trello_list_cards` — REST `https://api.trello.com/1`. |
| Note | Trello **rifiuta** l'header `Authorization` su quasi tutti gli endpoint: `key` e `token` vanno come query param. È il protocollo, quindi il token finisce nell'URL della richiesta: per questo `providerRequest` non logga mai la URL e i suoi errori riportano solo status + estratto del corpo. Se la connessione scade, `resolveIntegrationToken` dice di riconnettersi invece di lasciar arrivare un 401 al modello. |

### WooCommerce
| | |
|---|---|
| Env | Solo `WOOCOMMERCE_APP_NAME` (il nome mostrato all'utente nella schermata di autorizzazione) e `WOOCOMMERCE_SCOPE` (default `read_write`). **Nessuna chiave in env.** |
| Chiavi per store | Le Consumer Key/Secret nascono sullo **store del cliente** e sono cifrate in `tenant_integrations` (`access_token` = key, `refresh_token` = secret). Una coppia diversa per ogni tenant. Nessuna colonna nuova: si riusano le due esistenti, già cifrate. |
| Formato token | `keypair`: le chiamate usano `Authorization: Basic base64(key:secret)` — nell'header, **non** in query string come Trello. |
| Flusso | `GET https://<store>/wp-json/wc-auth/v1/authorize` → l'utente entra nel proprio wp-admin e approva → WooCommerce redirige a `redirect_uri` con `?consumer_key=…&consumer_secret=…`. Nessuno scambio di codice (`tokenInRedirect`). |
| Dati richiesti | **Due campi**, raccolti dalla card con un form GET: `store_url` e `user_id`. Il `user_id` (ID WordPress) è **obbligatorio** per WooCommerce e non è deducibile: si trova in wp-admin → Utenti → passando il mouse su "Modifica", nell'URL finisce con `user_id=N`. Senza, l'authorize risponde 400. |
| Token | Le chiavi API WooCommerce non scadono per impostazione predefinita → `expires_at` null, nessun refresh. |
| Tool agente | `woo_list_products`, `woo_get_product`, `woo_list_orders`, `woo_get_order`, `woo_get_customer` — REST v3 `https://<store>/wp-json/wc/v3`. |
| **SSRF** | L'host viene dall'utente ed è chiamato dal server. Controllo in due tempi: `normalizeTenantUrl` in `authorize` (sintattico: https, porte diverse da 443 vietate, niente credenziali nell'URL, niente IP privati) e `assertPublicHost` in ogni fetch, che **risolve il DNS**. Sono bloccati localhost, `*.localhost`, `*.internal`, `metadata.google.internal`, 169.254/16 (metadata cloud), RFC1918, CGNAT e i TEST-NET. Il secondo controllo serve perché il DNS può cambiare fra la connessione e la chiamata (DNS rebinding). |
| Note | I prodotti e gli ordini passano da `lib/commerce/normalize.ts`, un formato comune pensato per essere adottato anche da Shopify (non ancora: Shopify mantiene il suo output storico per non rompere i prompt). Un prodotto a prezzo variabile restituisce `price: null` e non `0`: WooCommerce manda stringa vuota, e `Number("")` è 0 — senza il controllo l'agente leggeva quei prodotti come "gratis". |

### Mailchimp
| | |
|---|---|
| Env | `MAILCHIMP_CLIENT_ID`, `MAILCHIMP_CLIENT_SECRET` (nella schermata OAuth2 si chiamano "API Key" e "Secret") |
| Creazione app | Mailchimp → Account → Extra → OAuth2 → registra un'integrazione |
| Redirect | `${SITE}/api/integrations/mailchimp/callback` |
| Scope | Mailchimp **non usa scope OAuth**: l'accesso è per-account e i permessi dipendono dal tipo di integrazione registrata ("Read-Write" o "Read Only"). |
| **Data center** | Non esiste un host unico: ogni account vive in un datacenter (`us21`, `eu7`…) e ogni chiamata va a `https://<dc>.api.mailchimp.com/3.0`. `dc` e `api_url` arrivano nella risposta allo scambio del token, sono l'unica fonte e vengono salvati in `metadata`. L'adapter li riceve anche in `refreshToken`, perché l'endpoint di rinnovo è `https://<dc>.api.mailchimp.com/oauth2/token`. Se il `dc` manca del tutto, l'adapter dice di riconnettersi invece di colpire un host generico. |
| Token | access token 1h + `refresh_token` → **auto-refresh**. Mailchimp emette un refresh token nuovo a ogni rinnovo: va salvato, e se manca si conserva il precedente. |
| Autenticazione API | HTTP Basic con una stringa qualsiasi come username (`anystring`) e l'access token come password. **Non** è `Bearer`. |
| Tool agente | `mailchimp_list_audiences`, `mailchimp_get_audience_stats`, `mailchimp_list_campaigns`. Solo lettura: **nessun invio di campagna e nessun iscritto aggiunto** in questa versione. |

## Database

Esegui `supabase/schema-integrations.sql` (idempotente). Rimuove i provider `stripe` e
`linear` e applica il CHECK constraint con tutti i 12 provider:

```sql
provider in ('notion','slack','hubspot','google_sheets','github','clickup','asana',
             'google_drive','airtable','trello','woocommerce','mailchimp')
```

`supabase/schema-integrations-batch2.sql` allarga lo stesso vincolo e documenta il
caso WooCommerce. I due file si possono applicare **in qualsiasi ordine**.

> Rieseguire `schema-integrations.sql` **non cancella connessioni**. Le rimozioni
> sono esplicite e nominate (`stripe`, `linear`), non c'è più una
> `delete … where provider not in (…)`: quella cancellava in silenzio i provider che
> il file non conosceva, e un errore del genere si scopre solo quando un cliente
> segnala che la connessione è sparita. Se un provider inatteso violasse il vincolo,
> l'`ALTER` fallisce con un errore visibile: è il comportamento voluto.

RLS: `tenant_integrations` ha `enable row level security` e quattro policy (select,
insert, update, delete) che confrontano `tenant_id` con `auth.uid()::text`, più la
policy di gestione per il service role. Tutte le letture dei token passano dal client
service role e filtrano per `.eq("tenant_id", …)`: un tenant non può raggiungere i
token di un altro.

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
| `drive_search_files` | Google Drive | Cerca file per nome (`query`, `folderId` opzionale) |
| `drive_read_file` | Google Drive | Legge il testo di un file (`fileId`), con export per i Google-native |
| `drive_list_folder` | Google Drive | Lista il contenuto di una cartella (`folderId` opzionale = "My Drive") |
| `airtable_list_bases` | Airtable | Lista le base condivise con l'account |
| `airtable_list_tables` | Airtable | Lista tabelle di una base (`baseId`) |
| `airtable_list_records` | Airtable | Lista record (`baseId`, `tableId`, `filter` opzionale) |
| `trello_list_boards` | Trello | Lista le board aperte |
| `trello_list_cards` | Trello | Lista card (`boardId` o `listId`) |
| `woo_list_products` | WooCommerce | Lista prodotti (`search` opzionale) |
| `woo_get_product` | WooCommerce | Legge un prodotto (`productId`) |
| `woo_list_orders` | WooCommerce | Lista ordini recenti (`status` opzionale) |
| `woo_get_order` | WooCommerce | Legge un ordine (`orderId`) |
| `woo_get_customer` | WooCommerce | Legge un cliente (email o `customer` id) |
| `mailchimp_list_audiences` | Mailchimp | Lista audience con statistiche chiave |
| `mailchimp_get_audience_stats` | Mailchimp | Statistiche dettagliate di un audience (`listId`) |
| `mailchimp_list_campaigns` | Mailchimp | Lista campagne recenti con open/click rate |

**Nessun tool del batch 2 scrive.** I tool di scrittura previsti
(`drive_create_file`, `airtable_create_record`/`update_record`,
`trello_create_card`/`move_card`/`add_comment`, `woo_update_stock`/
`woo_update_order_status`, `mailchimp_add_subscriber`) sono esclusi di proposito:
manca il meccanismo di conferma fra handler e UI (Open Decision 14). Finché non
esiste, esporre un tool che scrive significherebbe eseguire senza chiedere — che è
esattamente il problema da risolvere. Corollario sugli scope: si dichiara solo ciò
che i tool usano. `data.records:write` di Airtable era l'unico permesso di
scrittura richiesto e non sfruttato, ed è stato rimosso (vedi la riga Scope di
Airtable). I 5 provider del batch 2 sono iniettati solo
negli agenti dove servono (`GOOGLE_DRIVE_TOOLS` a tutti quelli che hanno le altre
integrazioni, `AIRTABLE_TOOLS`/`TRELLO_TOOLS`/`WOOCOMMERCE_TOOLS`/`MAILCHIMP_TOOLS`
solo dove hanno senso): un tool su un provider non collegato non restituisce nulla
e sposta solo peso nel contesto del modello.

I tool sono in `ALL_TOOLS_LIST` (`lib/agents/feature-flags.ts`) e abilitati come `optionalTools` su **tutti e 15 gli agenti** tramite la costante `NOTION_SLACK_HUBSPOT_TOOLS` (`lib/agents/registry.ts`). Ogni agente che ne ha almeno uno riceve in coda al system prompt la direttiva `INTEGRATION_TOOLS_DIRECTIVE`, che fissa la sequenza corretta (search → id → azione), la conferma prima delle scritture esterne e il divieto di ripetere un'azione già fallita. Se il provider non è collegato, il tool invita a connetterlo dalla dashboard con il marker `[[CONNECT:<provider>]]`.

Test: `node scripts/test-integration-tools.mjs` (registro e dispatch) e `node scripts/test-integrations.mjs` (flusso OAuth dei 7 provider con un account di test).

## UI

- `/dashboard/integrations` — griglia con filtro per categoria e ricerca, badge
  "Gratis" sulle app collegabili, stato **Connesso**/Errore/In attesa, e pulsanti
  Collega / Disconnetti. I provider che chiedono dati all'utente (WooCommerce)
  mostrano un **form** invece di un link: i valori viaggiano in un GET verso la
  route authorize, vengono validati server-side e finiscono nello `state` firmato,
  mai nel browser oltre la validazione nativa del form.
- `/integrations` — pagina pubblica, stessa lista con badge e stato di collegamento.
- `/agents/[slug]` e `/agents/[slug]/deploy` — la card integrazioni mostra **Connetti**
  per le app live e **Prossimamente** per quelle non ancora disponibili
  (`isIntegrationAvailable` in `src/lib/integrations.ts`).

## Test

| Comando | Cosa copre |
|---------|-----------|
| `npm run test:integrations` | IP bloccati, normalizzazione URL, firma e tampering dello `state`, PKCE, catalogo, cifratura |
| `npm run test:drive` | Scope Drive, registrazione tool e UI |
| `npm run test:airtable` | PKCE a runtime (il verifier non finisce nella URL), formula di filtro |
| `npm run test:trello` | Flusso non-standard, scadenza senza refresh, token non nei log |
| `npm run test:woocommerce` | SSRF, coppia di credenziali, normalizzazione prodotti/ordini |
| `npm run test:mailchimp` | Data center nel refresh, header Basic, stato finale del batch |
| `npm run test:ui` | Filtri, stati vuoti, accessibilità, palette, i18n in 5 lingue, allineamento SQL↔TS |
| `npm run test:security` | Token non persistiti/loggati, SSRF, tenant binding, PKCE, segreti |
| `npm test` | Tutti i precedenti + `test-integrations.mjs` e `test-integration-tools.mjs` |

I test dei provider che richiedono una connessione reale non sono automatici:
`test-integrations.mjs` va eseguito con `AIRTABLE_CLIENT_ID`/ecc. configurati.

## Troubleshooting

| Sintomo | Causa probabile |
|---------|-----------------|
| `provider_not_configured` | Manca l'env `<PROVIDER>_CLIENT_ID`/`_SECRET`. |
| `Unsupported provider: <x>` | Il provider è nel catalogo ma non in `IMPLEMENTED_PROVIDERS`: manca l'adapter. |
| `redirect_uri_mismatch` (Google) | Redirect del layer generico non registrata sul client OAuth. |
| `redirect_uri_mismatch` sul **login Google** | Client di Supabase Auth non configurato: crea un client OAuth dedicato (separato da Gmail/Calendar) e registra `https://<project-ref>.supabase.co/auth/v1/callback`. |
| `state_mismatch` / `state_provider_mismatch` | Cookie di stato scaduto o provider diverso: riparti da Connetti. |
| "No … account connected" dal tool | Riga assente o `status <> 'connected'` in `tenant_integrations`. |
| Tool scadono con errore 401 | Refresh fallito: le env `<PROVIDER>_CLIENT_ID`/`_SECRET` mancano lato server, oppure il refresh token è stato revocato → va riconnesso dalla dashboard. |
| **"la connessione è scaduta e non emette refresh token"** | Trello (30 giorni) o un token senza rinnovo: ricollégati dalla dashboard. Il messaggio è esplicito per non lasciar arrivare un 401 al modello. |
| **Airtable `invalid_grant`** | Il refresh token è scaduto (`refresh_expires_in`, ~60 giorni) → ricollégati. |
| **Mailchimp "data center sconosciuto"** | `metadata.dc` vuoto in `tenant_integrations`: ricollégati. Non si può dedurre. |
| **WooCommerce 400 in authorize** | Manca `user_id`, oppure non è numerico, oppure l'URL non è https / ha porta / è un IP privato. |
| **WooCommerce "indirizzo non ammesso"** | L'host risolve a un IP privato o riservato: è il controllo SSRF. Verifica di aver scritto il dominio del tuo shop, non un indirizzo IP. |
| **Trello token non compare** | Trello rimanda `?token=`, non `?code=`: senza l'adapter con `authParam`/`tokenInRedirect` il callback non trova nulla. |
| `slack_read_channel` → `missing_scope` | Manca lo scope OAuth `channels:history` sull'app Slack. |
| `slack_post_message` → `channel_not_found` | Il bot non è nel canale: l'utente deve invitare l'app (`/invite @AgentCloud`). |
| `hubspot_create_contact` → 409 | Email già presente: usare `hubspot_get_contact` invece di creare un duplicato. |
| **Airtable: nessuna base** | Le basi vanno condivise con l'integrazione: apri la base → Share → aggiungi l'integrazione. |
| **Mailchimp: audience non visibile** | L'integrazione OAuth2 registrata è "Read Only" ma servono più permessi, oppure non è autorizzata per quell'account. |
