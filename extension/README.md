# AgentCloud Copilot — Estensione Browser

Estensione MV3 per Chrome, Edge, Brave, Opera e Firefox. Usa la sessione del sito AgentCloud e mostra un **pannello laterale** persistente con cui far lavorare gli agenti acquistati sulla pagina attiva.

Il pannello laterale è **l'unica UI** dell'estensione: non esiste più il popup, quindi il click sull'icona nella barra strumenti apre (o mette a fuoco) il pannello accanto alla pagina.

## Flussi supportati

- **Apertura:** click sull'icona → `action.onClicked` → `chrome.sidePanel.open()` (Chrome 116+). Su Chrome 114/115 il service worker attiva `sidePanel.setPanelBehavior({ openPanelOnActionClick: true })`; sui browser senza Side Panel API il pannello si apre in una finestra dedicata (`sidepanel/sidepanel.html`) e, in ultima istanza, nella chat web.
- **Sessione condivisa:** il pannello verifica `GET /api/extension/session` con i cookie del dominio `www.agentcloud.agency`; non salva password, token o credenziali.
- **Login:** il pulsante apre il login web e il background rileva automaticamente il ritorno su una qualsiasi pagina AgentCloud (anche `/waitlist` in pre-lancio), aggiorna la sessione e notifica il pannello.
- **Account senza agenti:** mostra il catalogo statico (`shared/catalog.js`, sincronizzato con `src/lib/agents.ts` e `docs/PRICING.md`). Il checkout non è mai eseguito nell'estensione: ogni card apre il marketplace web.
- **Account con agenti:** lista degli agenti posseduti con bottone **Usa** che porta al pannello di chat. La selezione è persistita in `chrome.storage.local` (`ac_selected_agent`).
- **Chat reale:** `POST /api/agent/run` con il contratto web `{ agentId, messages }`, streaming SSE inoltrato parola per parola al pannello tramite `AGENT_STREAM`.
- **Contesto privacy-first:** il pulsante "Usa selezione" legge solo su richiesta titolo, URL e testo selezionato della scheda attiva via `chrome.scripting`, quindi serve il permesso `activeTab` concesso dal click sull'icona: non esiste alcun content script sempre attivo e non viene fatto scraping automatico del DOM.
- **Gestione limiti:** gli errori 401, 402 e 429 vengono mostrati con invito ad accedere o gestire il piano dalla dashboard.
- **Errori diagnostici:** se l'endpoint risponde un redirect (es. il gate pre-lancio che manda a `/waitlist`) o un content-type diverso da JSON/`text/event-stream`, il pannello mostra stato HTTP, content-type e URL finale del redirect invece di un generico "connessione non disponibile".

## Installazione locale

### Chromium (Chrome / Edge / Brave / Opera)

1. Apri `chrome://extensions/` (o la pagina equivalente).
2. Attiva **Modalità sviluppatore**.
3. Seleziona **Carica estensione non pacchettizzata**.
4. Scegli questa cartella `extension/`.
5. Apri `www.agentcloud.agency`, accedi, poi clicca sull'icona dell'estensione: si apre il pannello laterale.
6. Dopo ogni modifica al codice, ricarica l'estensione da `chrome://extensions/` e riapri il pannello.

Chrome 114+ è richiesto per il Side Panel API. Da Chrome 116 il pannello si apre dal click sull'icona; su 114/115 viene usato il comportamento nativo del side panel.

### Firefox

1. Apri `about:debugging#/runtime/this-firefox`.
2. Seleziona **Carica componente aggiuntivo temporaneo…**.
3. Scegli `extension/manifest.json`.

Firefox non supporta il Side Panel API: il click sull'icona apre il pannello in una finestra popup dedicata.

## Prerequisito obbligatorio lato backend

Il pannello non può funzionare se il deployment di `www.agentcloud.agency` non espone **entrambe** queste cose:

1. il route handler `src/app/api/extension/session/route.ts` (`GET /api/extension/session`);
2. l'esenzione dal gate pre-lancio in `src/proxy.ts`: `/api/extension/*`, `/api/agent/run` e `/api/user/usage` devono passare anche prima del 1 ottobre 2026.

Senza di esse il gate risponde `307 → /waitlist` (HTML) e l'estensione mostra nel pannello:

```
Le API dell'estensione non sono raggiungibili su https://www.agentcloud.agency
(/api/extension/session → HTTP 200, content-type text/html).
Il server ha reindirizzato la richiesta a /waitlist. ...
```

Diagnosi rapida da terminale (atteso: JSON con 401/200, non un redirect):

```bash
curl -s -o /dev/null -w '%{http_code} %{content_type}\n' https://www.agentcloud.agency/api/extension/session
# 307 text/html  → il deployment non ha ancora le API dell'estensione
# 401 application/json → corretto (utente non autenticato)
```

## Verifica locale

I file JavaScript sono vanilla per evitare di includere il bundle Next.js nell'estensione:

```bash
node --check extension/background/service-worker.js
node --check extension/shared/catalog.js
node --check extension/sidepanel/sidepanel.js
npm run typecheck
```

## Contratti backend

- `GET /api/extension/session` → `401 { authenticated:false, owned:[] }` oppure `200 { authenticated:true, owned:string[], email, name }`.
- `POST /api/agent/run` → `{ agentId, messages, files? }`, risposta `text/event-stream` con eventi `text`, `tool_start`, `tool_done`, `done` o `error`.
- Autenticazione API → cookie di sessione AgentCloud inviati con `credentials: include`.

Nessuna chiave Anthropic, Stripe, Supabase service role o password deve essere inserita nel bundle dell'estensione.

## Struttura

```
extension/
  manifest.json            # MV3: action senza default_popup + side_panel
  background/service-worker.js  # apre il pannello, sessione, run agente SSE
  sidepanel/               # unica UI (login, agenti, chat)
  shared/catalog.js        # catalogo agenti condiviso
  content/content.js       # helper di lettura pagina (non registrato come content script)
  icons/
```
