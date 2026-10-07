# AgentCloud — Ecosistema Multi-Piattaforma

AgentCloud è un ecosistema di client che parlano con un'unica piattaforma
centrale: gli agenti autonomi sono disponibili dal browser, dal dispositivo
mobile, dal terminale (CLI/desktop) e sul web.

**Fonte di verità**: la piattaforma web (`src/`) definisce contratti e cataloghi.
I client devono restare allineati a:

- **Agenti e prezzi** → `src/lib/agents.ts`
- **Integrazioni** → `src/lib/integrations.ts`
- **Contratto API/SSE e conferma umana** → `src/app/api/agent/run/route.ts`

Il test `node scripts/test-clients-alignment.mjs` fallisce quando CLI, estensione
o mobile divergono da queste fonti.

---

## Architettura dell'Ecosistema

```
                             ┌───────────────────────────────┐
                             │    AgentCloud Core Engine     │
                             │ (Next.js / Supabase / Claude) │
                             └───────────────┬───────────────┘
                                             │
                      ┌──────────────────────┼──────────────────────┐
                      │                      │                      │
                      ▼                      ▼                      ▼
           ┌─────────────────────┐┌─────────────────────┐┌─────────────────────┐
           │     Mobile App      ││  Chrome Extension   ││   AgentCloud CLI    │
           │  (Flutter/Dart)     ││    (Manifest V3)    ││ (TypeScript / Node) │
           │                     ││                     ││  (client desktop)   │
           │ - Dashboard agenti   ││ - Side panel        ││ - Run in terminale  │
           │ - Chat SSE + push    ││ - Contesto pagina   ││ - Script e CI/CD    │
           │ - Marketplace        ││ - Cursore reattivo  ││ - Comandi admin     │
           └─────────────────────┘└─────────────────────┘└─────────────────────┘
```

---

## Componenti dell'Ecosistema

### 1. Web Platform (`src/`)

La piattaforma centrale, accessibile da qualsiasi browser: marketplace agenti,
chat con activity feed, `/dashboard/integrations` (OAuth, token cifrati
AES-256-GCM), fatturazione Stripe, consumo token.

- **Tecnologie**: Next.js 16, React 19, Tailwind CSS v4, TypeScript, Supabase.

### 2. Mobile App (`mobile/`)

Client nativo multipiattaforma per iOS e Android (annunciato, non ancora sugli
store — vedi `/mobile`).

- **Tecnologie**: Flutter 3.x, Dart.
- **Casi d'uso**: dashboard e marketplace, chat SSE contro `/api/agent/run` con
  conferma umana, token in `flutter_secure_storage`, notifiche push (in arrivo).

### 3. Chrome Extension (`extension/`)

Estensione Manifest V3 per Chrome, Edge, Brave, Opera e Firefox.

- **Tecnologie**: JavaScript vanilla + Chrome Extension APIs (MV3).
- **UI**: un unico **side panel** persistente accanto alla pagina. Non esiste un
  popup: il click sull'icona apre (`sidePanel.open`) o mette a fuoco il pannello.
- **Casi d'uso**: usa gli agenti posseduti sulla pagina attiva, contesto
  privacy-first (titolo/URL/selezione solo su richiesta), cursore reattivo sulla
  pagina operativa, chat SSE via `/api/agent/run`.

### 4. AgentCloud CLI (`cli/`) — client desktop/terminale

Interfaccia da riga di comando per sviluppatori, sysadmin e pipeline automatizzate.

- **Tecnologie**: Node.js, TypeScript, Commander.js.
- **Casi d'uso**: `agentcloud run <agent> "<prompt>"` (con `--yes` per le
  automazioni), `agentcloud chat <agent>`, `agentcloud usage`, comandi admin.
- **Login**: email/password Supabase; i token vivono solo in
  `~/.agentcloud/credentials.json`, la password non viene mai salvata.

---

## Specifiche API Unificate

Tutti i client consumano le stesse API REST e SSE. L'autenticazione è via cookie
di sessione (web/estensione) o `Authorization: Bearer <supabase_access_token>`
(CLI/mobile).

| Endpoint | Metodo | Scopo | Autenticazione |
|----------|--------|-------|----------------|
| `/api/agent/run` | `POST` | Esecuzione agentica in streaming | Bearer o sessione |
| `/api/chat` | `POST` | Chat interattiva in streaming | Bearer o sessione |
| `/api/extension/session` | `GET` | Sessione + agenti posseduti per l'estensione/CLI | Bearer o sessione |
| `/api/user/usage` | `GET` | Consumo token del mese e piano | Bearer o sessione |

### Contratto SSE di `/api/agent/run`

Body della richiesta:

```json
{ "agentId": "support-agent", "messages": [{ "role": "user", "content": "..." }], "files": {} }
```

Eventi (`text/event-stream`, una riga JSON per evento):

- `text` — `{ content }`
- `tool_start` — `{ toolName, toolInput }`
- `tool_done` — `{ toolName }`
- `file` — `{ filename, content }`
- `connection` — `{ provider }` (card "Connetti <provider>")
- `tool_confirm` — `{ toolName, toolInput, toolUseId, token }`
- `awaiting_confirmation` — fine dello stream, in attesa della conferma
- `done` — `{}`
- `error` — `{ message }`

### Conferma umana (HITL)

Quando il batch di tool include un'azione che **modifica contenuto esistente**
(es. `word_append`, `excel_write_range`, `onenote_append`), il server **non
esegue nulla**: emette `tool_confirm` con un `token` firmato lato server e chiude
lo stream con `awaiting_confirmation`. Il client mostra Approva/Annulla e, se
approva, ripete la stessa richiesta con:

```json
{ "agentId": "...", "messages": [ "..." ], "approval": { "token": "<token firmato>" } }
```

Il token è firmato: il client non può cambiare tool né argomenti, può solo
approvare o annullare. Questo flusso è implementato in `src/components/ChatInterface.tsx`
(web), `extension/sidepanel`, `cli/src/index.ts` e `mobile/lib/src/screens/chat/chat_screen.dart`.
