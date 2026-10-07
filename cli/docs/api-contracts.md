# AgentCloud CLI — API contracts verificati

## Base URL

Produzione: `https://www.agentcloud.agency`. La CLI permette override con `AGENTCLOUD_API_URL` o `agentcloud config --url ...`.

## Auth utente

`src/lib/supabase/server.ts` implementa `getSessionUser()` usando prima i cookie e poi `Authorization: Bearer <Supabase access token>`. La CLI usa il fallback Bearer.

Il login CLI usa direttamente Supabase Auth password grant:

```http
POST {NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password
apikey: {NEXT_PUBLIC_SUPABASE_ANON_KEY}
Content-Type: application/json

{"email":"...","password":"..."}
```

Access e refresh token sono salvati in `~/.agentcloud/credentials.json`; la password non viene mai salvata. Il refresh viene eseguito prima delle chiamate quando l'access token è scaduto.

## Agenti posseduti

```http
GET /api/user/owned
Authorization: Bearer <supabase_access_token>
```

Risposta verificata:

```json
{"owned":["support-agent","shopify-agent"]}
```

## Run agente

```http
POST /api/agent/run
Authorization: Bearer <supabase_access_token>
Content-Type: application/json

{"agentId":"support-agent","messages":[{"role":"user","content":"..."}]}
```

Per riprendere una run in pausa (conferma umana, vedi sotto) si rimanda lo
stesso body con in più il token firmato dal server:

```json
{"agentId":"support-agent","messages":[{"...":"..."}],"approval":{"token":"<token firmato HMAC>"}}
```

Risposta `text/event-stream`, con righe SSE JSON:

- `type: "text", content: string`
- `type: "tool_start", toolName: string, toolInput: object`
- `type: "tool_done", toolName: string`
- `type: "file", filename: string, content: string`
- `type: "connection", provider: string` — card "Connetti <provider>" (OAuth dal sito)
- `type: "tool_confirm", toolName: string, toolInput: object, toolUseId: string, token: string` — il server mette in pausa la run: un tool modifica contenuto esistente
- `type: "awaiting_confirmation"` — fine dello stream in attesa della conferma
- `type: "done"`
- `type: "error", message: string`

### Conferma umana dei tool che modificano documenti esistenti

Quando il batch di tool include un'azione distruttiva (es. `word_append`),
`/api/agent/run` **non esegue nulla**: manda `tool_confirm` con un `token`
firmato lato server e chiude lo stream con `awaiting_confirmation`. La CLI
chiede conferma all'utente e, se approva, ripete la chiamata con
`approval: { token }`. Il token è firmato: la CLI non può cambiare né tool né
argomenti, può solo approvare o annullare.

- In terminale interattivo la CLI chiede `Confermi l'esecuzione di "<tool>"? [y/N]`.
- In pipeline non interattive la conferma è negata (a meno di `--yes`), per non
  bloccare gli script in attesa di input.

## Uso

La CLI usa `GET /api/user/usage`, aggiunto per esporre in modo minimale run e token del mese senza replicare la dashboard. La risposta contiene `plan`, `tokensUsed`, `tokenLimit` e `runs`.

## Admin

Gli endpoint admin verificano esclusivamente:

```http
Authorization: Bearer <ADMIN_API_TOKEN>
```

La CLI legge questo valore soltanto da `AGENTCLOUD_ADMIN_TOKEN`; non lo salva mai su disco e non lo stampa.

- `GET /api/admin/tenants` → elenco senza credenziali (`id`, presenza Google/Shopify)
- `POST /api/email/send` → `{ to, subject, text|html }`
- `GET /api/admin/integrations/status?tenant=<id>` → stato integrazioni senza token
- `agentcloud admin flags show` è locale e read-only: mostra soltanto se le variabili sono disponibili nell'ambiente CLI, non modifica Vercel.
