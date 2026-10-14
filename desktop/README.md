# AgentCloud Desktop

App desktop di AgentCloud (come Claude Desktop): chat con i 15 agenti dal tuo
computer, su **macOS, Windows e Linux**. Electron + TypeScript + React, stesse
API del sito (niente backend dedicato).

## Funzioni v1

- Login email/password + Google (browser di sistema + deep-link `agentcloud://`)
- Sidebar agenti + assistente generico, streaming SSE parola per parola
- Markdown sanitizzato, card file con anteprima (HTML in iframe sandbox)
- Approvazioni tool (`tool_confirm` → Approva/Annulla, come web e mobile)
- Card di connessione: l'OAuth si completa nel browser di sistema
- Condivisione chat in sola lettura (link copiato negli appunti)

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
  il preload espone solo `openExternal`, deep-link e versioni.
- CSP restrittiva nell'`index.html`; i link esterni si aprono sempre nel
  browser di sistema, mai nella finestra.
- Anteprime HTML in `<iframe sandbox="allow-scripts">` senza `allow-same-origin`.
- Token Supabase nello storage del renderer (come una SPA); logout li cancella.

## Volutamente fuori (Fase 2)

Auto-update, firma/notarizzazione, allegati/immagini in chat, notifiche
native di sistema, badge dock/taskbar, scorciatoia globale, funzionamento
offline, skill e plugin nel client.
