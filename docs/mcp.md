# Integrazioni MCP (Model Context Protocol)

Come AgentCloud collega le app esterne: MCP è il livello standard, OAuth2
è il livello di autorizzazione, e per le app che non hanno un server MCP
esiste un percorso "nativo" (OAuth2 + API REST) con lo stesso contratto.

- Pagina utente: `/dashboard/apps`
- Registro: `src/lib/mcp/registry.ts`
- Moduli: `src/lib/mcp/*`
- API: `src/app/api/mcp/*`
- Tabella: `public.mcp_connections` (vedi `supabase/schema-mcp.sql`)

---

## 1. Aggiungere una nuova integrazione

**Per un server MCP remoto basta UNA VOCE nel registro.**

```ts
// src/lib/mcp/registry.ts
{
  id: "linear",
  name: "Linear",
  icon: "linear",                 // deve esistere in src/lib/brands.ts
  description: "Issue, progetti e cicli di sviluppo del tuo team.",
  category: "Project Management",
  type: "mcp",
  transport: "sse",               // streamable_http | sse | stdio
  url: "https://mcp.linear.app/sse",
  auth: "oauth2",                 // oauth2 | api_key | none
  scopes: [],
}
```

Nient'altro: la UI elenca le voci, la route OAuth costruisce l'authorize URL,
l'agente namespaccia i tool e la tabella delle connessioni si riempie da
sola. `npm run typecheck` segnala se una voce dichiara dati incoerenti.

**Per un server MCP senza Dynamic Client Registration** (quelli marcati 🔐
nella lista dei server remoti pubblici) serve un client OAuth statico:

```ts
staticClient: { clientIdEnv: "SLACK_MCP_CLIENT_ID", clientSecretEnv: "SLACK_MCP_CLIENT_SECRET" },
```

Le variabili d'ambiente contengono i valori, il codice contiene solo i nomi.

**Per un connettore nativo** (app senza server MCP) servono tre cose:

1. una voce nel registro con `type: "native"` e `native: { provider, toolPrefix }`;
2. la dichiarazione dei tool in `nativeTools` (con `write: true` su quelli che
   scrivono);
3. l'implementazione in `src/lib/mcp/native/execute.ts`.

Il flusso OAuth è riusato dagli adapter già presenti in
`src/lib/integrations/providers/`: non serve scrivere un client OAuth nuovo.

---

## 2. Come funziona il flusso OAuth2

```
/api/mcp/authorize?serverId=notion
   │  1. discovery RFC 9728 (protected resource metadata)
   │     + RFC 8414 (authorization server metadata)
   │  2. registrazione dinamica del client (RFC 7591), se supportata
   │  3. Authorization Code + PKCE S256
   │  4. `state` firmato (HMAC) → cookie httpOnly + riga della connessione
   ▼
provider (browser)
   ▼
/api/mcp/callback?code=…&state=…
   │  5. verifica dello `state`: cookie + riga + sessione utente
   │  6. scambio del codice → access token + refresh token
   │  7. cifratura (AES-256-GCM) e scrittura in mcp_connections
   ▼
/dashboard/apps?app=notion&status=connected
```

Lo `state` viene verificato tre volte: è firmato (non manipolabile), viene
confrontato con il cookie (anti-CSRF) e con lo `state` salvato sulla riga
della connessione (anti replay). Un `state` sbagliato fa fallire il
callback **prima** dello scambio del codice.

Il `code_verifier` del PKCE non attraversa mai la URL: resta sul server.

## 3. Token

- cifrati a riposo con AES-256-GCM (`INTEGRATIONS_TOKEN_ENCRYPTION_KEY`);
- mai nel frontend, mai nelle URL, mai nei log (l'audit mostra solo gli
  ultimi 4 caratteri);
- rinnovati 60 secondi prima della scadenza (`src/lib/mcp/tokens.ts`);
- se il provider ha revocato il token, la connessione passa a
  `reconnect_required` e l'agente lo dice all'utente invece di fallire;
- alla disconnessione vengono revocati (se il provider lo supporta) e
  cancellati: la riga sparisce e i suoi tool non sono più esposti.

I token sono per utente (`tenant_id` = `auth.uid()`): due utenti non si
vedono mai.

## 4. Tool esposti al modello

Il nome è namespaced: `mcp__<server>__<tool>`.

- evita le collisioni fra server (`create_page` esiste su Notion e su Linear);
- rispetta il limite di 64 caratteri e i caratteri ammessi da Anthropic
  (`[a-zA-Z0-9_-]`): se il nome è troppo lungo viene accorciato con un hash.

I tool che **scrivono** (creano, modificano, cancellano, inviano messaggi)
chiedono la conferma esplicita dell'utente prima di girare. Il segnale, in
ordine: lista `writeTools` del registro → annotation MCP del tool
(`readOnlyHint`, `destructiveHint`) → nome del tool.

L'utente può accendere e spegnere i singoli tool dalla pagina
`/dashboard/apps`. Di default restano attivi **solo** quelli di lettura.

## 5. Sicurezza

| Minaccia | Difesa |
|---|---|
| SSRF (server MCP personalizzato) | solo https, niente IP privati/loopback/metadata cloud, porte diverse da 443 rifiutate, DNS risolto e verificato, redirect seguiti a mano con limite e rivalidazione (`src/lib/mcp/security.ts`) |
| Prompt injection nei risultati | l'output è delimitato (`BEGIN/END UNTRUSTED DATA`) e dichiarato "dato, non istruzione" |
| Token nelle mani del browser | mai inviati al frontend, mai nelle URL, mai nei log |
| Abuso di un server MCP | rate limit per utente e per integrazione, audit log di ogni chiamata (senza dati sensibili) |
| Azioni distruttive | conferma esplicita dell'utente con riepilogo dei parametri |
| Output enormi | troncamento a 20.000 caratteri con indicazione del taglio |
| Server irraggiungibile | l'agente lo segnala e continua senza quel tool |
| Token revocato a metà conversazione | stato "da ricollegare" e messaggio chiaro, senza crash |
| Server che cambia i tool | la lista viene riletta a ogni run (cache invalidata) |

**stdio** è disabilitato di default in ambiente multiutente. Per abilitarlo:
`MCP_STDIO_ALLOWED_COMMANDS` (lista di comandi ammessi, separati da virgola)
e il comando deve essere esattamente uno di quelli.

## 6. Variabili d'ambiente

| Variabile | Serve per |
|---|---|
| `INTEGRATIONS_TOKEN_ENCRYPTION_KEY` | cifratura dei token (AES-256-GCM). **Obbligatoria in produzione.** |
| `INTEGRATIONS_STATE_SECRET` | firma dello `state` OAuth e dei token di conferma |
| `NEXT_PUBLIC_SITE_URL` | base per costruire il redirect URI OAuth |
| `MCP_ALLOW_HTTP_LOCALHOST` | `true` solo in sviluppo: ammette `http://` verso il loopback |
| `MCP_CONNECT_TIMEOUT_MS` | timeout della handshake (default 15000) |
| `MCP_CALL_TIMEOUT_MS` | timeout di una chiamata a un tool (default 30000) |
| `MCP_USER_CALLS_PER_MINUTE` | rate limit per utente (default 60) |
| `MCP_CONNECTION_CALLS_PER_MINUTE` | rate limit per integrazione (default 30) |
| `MCP_STDIO_ALLOWED_COMMANDS` | allowlist dei comandi stdio (disabilitati se assente) |

## 7. Test

```bash
node --import ./scripts/register-test-alias.mjs --test scripts/test-mcp.mjs
```

Copre il registro, il namespacing, il gestore dei token, la validazione
degli URL (SSRF), il confezionamento dell'output, la verifica dello `state`
e un'integrazione vera e propria contro `scripts/mock-mcp-server.mjs`.

## 8. Limiti noti

- **Il runtime è serverless**: ogni chiamata a un tool apre e chiude una
  sessione MCP. Va bene per il throughput attuale, ma un server che tiene
  stato (sessioni lunghe) non è supportato.
- **I tool che scrivono restano in attesa di conferma**: il meccanismo
  esiste ed è verificato lato server, ma la conferma dell'utente passa
  dal flusso `tool_confirm` già presente in chat.
- **I connettori nativi sono un esempio**: ne serve uno per app che non ha
  un server MCP.
- **Nessun refresh push**: il rinnovo avviene al momento dell'uso, non in
  background.
