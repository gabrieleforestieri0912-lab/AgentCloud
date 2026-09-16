# AgentCloud CLI

CLI ufficiale di **AgentCloud** — stessa autenticazione web e stesso DB Supabase di web/mobile. **Eseguibile su qualsiasi terminale** (PowerShell, CMD, Git Bash, bash/zsh macOS/Linux).

## Installazione — gira su terminale

**Da npm (pubblico):**
```bash
npm install -g @agentcloud/cli
agentcloud --help   # verifica
ac --help           # alias breve
```

**Da sorgente (locale):**
```bash
cd cli
npm install
npm run build        # compila dist/index.js + chmod 755
npm link             # crea shim globale agentcloud/ac
# oppure senza link:
node dist/index.js --help
npx agentcloud --help
```

**Requisiti:** Node.js ≥18. Funziona su **Windows 10/11** (PowerShell/CMD/Git Bash), **macOS** (Terminal/iTerm + zsh/bash) e **Linux** (bash).

**Verifica installazione:**
```bash
agentcloud config           # mostra API URL e token mascherato
agentcloud --version
```

## Autenticazione — porta al login web

La CLI condivide lo stesso DB Supabase del web/mobile. Al primo uso si autentica via browser:

```bash
agentcloud login            # apre https://agentcloud.agency/cli/auth?port=...&state=...
# 1. il browser si apre su /cli/auth (se non loggato → redirect a /login)
# 2. dopo il login, la pagina reindirizza il token a http://127.0.0.1:PORT/callback
# 3. il token viene salvato in ~/.agentcloud/config.json
```

Alternativa legacy (token già in possesso):
```bash
agentcloud login <SUPABASE_ACCESS_TOKEN>
```

**Logout / whoami:**
```bash
agentcloud whoami            # verifica token via /api/user/owned
agentcloud logout             # rimuove token
```

## Comandi principali

```bash
agentcloud list
agentcloud run support-agent "Come configuro il webhook per un nuovo utente?"
agentcloud run email-assistant "Scrivi una bozza cordiale per cliente insoddisfatto."
agentcloud config --url http://localhost:3000  # test locale
```

**File di config:** `~/.agentcloud/config.json` (`apiUrl`, `token`, `defaultAgent`). Su Windows: `C:\Users\<TU>\.agentcloud\config.json`.
