# AgentCloud Desktop

App desktop di AgentCloud: **il web app dentro una finestra nativa**, su
**macOS, Windows e Linux**. Electron + TypeScript + React, stesse API del sito
(niente backend dedicato).

## Come funziona

Il prodotto è il web app: la sua interfaccia è ~45× più grande di un client
nativo e continua a crescere ogni settimana. Reimplementarla in Electron
significherebbe scrivere ogni funzionalità due volte, con il desktop sempre
indietro. Quindi la finestra **carica il sito**: la parità è per costruzione e
il desktop resta un canale di distribuzione, non una seconda codebase.

Il renderer nativo non è sparito: è il **client leggero** (un agente, una
domanda veloce) e si attiva con `AGENTCLOUD_DESKTOP_MODE=native`.

## Cosa porta il guscio nativo

Tutto ciò che un browser non può fare, e che vale la pena tenere:

- **OAuth nel browser di sistema**: il login non lascia tracce nella finestra,
  e il deep link `agentcloud://auth` riporta il ritorno all'app;
- **link esterni nel browser di sistema**: marketplace, integrazioni, documenti;
- **anteprima file in sandbox**: `iframe sandbox="allow-scripts"` senza
  `allow-same-origin` (il web non lo fa);
- (Fase 2) tray, badge, notifiche native, auto-update, firma del codice.

## Configurazione

| Variabile | Default | Serve a |
|---|---|---|
| `AGENTCLOUD_DESKTOP_MODE` | `web` | `native` = renderer locale (client leggero) |
| `AGENTCLOUD_WEB_URL` | sito pubblico | URL del web app da caricare (dev, staging) |

In sviluppo, senza `AGENTCLOUD_WEB_URL`, la finestra punta al dev server Next
in locale (`http://localhost:3000`): si avvia `npm run dev` nella root del repo
e `npm run dev` qui dentro.

### Login

Gli URL di autenticazione **restano nella finestra** (non vengono aperti nel
browser di sistema): è il cookie jar dell'app a ricevere la sessione Supabase.
Tutto il resto si apre nel browser come sempre.

## Sviluppo

```bash
cd desktop
npm install
npm run dev        # Electron con hot-reload
npm run typecheck  # tsc main/preload/renderer
npm run build      # out/ senza pacchettizzare
```

## Pacchetti per OS

```bash
npm run dist:mac    # .dmg
npm run dist:win    # setup .exe (nsis)
npm run dist:linux  # .AppImage + .deb
```

La CI (`.github/workflows/desktop.yml`) compila su macOS, Windows e Ubuntu a
ogni modifica sotto `desktop/`. Nota: senza firma del codice, macOS Gatekeeper
e Windows SmartScreen mostrano un avviso al primo avvio (tasto destro → Apri
su macOS). Firma/notarizzazione e auto-update (`electron-updater`) sono Fase 2.

## Configurazione richiesta (una tantum)

1. **Supabase → Authentication → URL Configuration**: aggiungere
   `agentcloud://auth` ai Redirect URLs (altrimenti il login Google fallisce).
2. Nessuna chiave da configurare: l'app usa anon key pubblica + sessione utente,
   come l'app mobile.

## Sicurezza

- `contextIsolation` + `sandbox: true` + `nodeIntegration: false` nel renderer;
  il preload espone solo `openExternal`, deep-link e versioni;
- CSP restrittiva nell'`index.html` del renderer nativo; i link esterni si
  aprono sempre nel browser di sistema, mai nella finestra;
- anteprime HTML in `<iframe sandbox="allow-scripts">` senza `allow-same-origin`;
- token Supabase nello storage del renderer (come una SPA); logout li cancella.

## Volutamente fuori (Fase 2)

Auto-update, firma/notarizzazione, notifiche native di sistema, badge
dock/taskbar, scorciatoia globale, funzionamento offline.
