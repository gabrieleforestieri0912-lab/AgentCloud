# AgentCloud CLI

CLI unificata di AgentCloud: comandi utente e comandi admin in un unico binario `agentcloud`. Usa solo le API del sito, non accede direttamente a Supabase DB o Anthropic.

## Requisiti e installazione

Node.js 18+.

```bash
cd cli
npm install
npm run build
node dist/index.js --help
```

Per uso globale, dopo il build:

```bash
npm link
agentcloud --help
```

Il package è configurato per `npm i -g @agentcloud/cli` quando verrà pubblicato. Non contiene segreti e non è pubblicato automaticamente.

## Autenticazione utente

La CLI usa email/password Supabase e salva soltanto i token nella home dell'utente:

```bash
agentcloud login
agentcloud whoami
agentcloud logout
```

Prima del login configura le chiavi pubbliche Supabase nell'ambiente:

```bash
# PowerShell
$env:NEXT_PUBLIC_SUPABASE_URL="https://<project>.supabase.co"
$env:NEXT_PUBLIC_SUPABASE_ANON_KEY="<anon-key>"

# bash/zsh
export NEXT_PUBLIC_SUPABASE_URL="https://<project>.supabase.co"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="<anon-key>"
```

La password viene letta senza echo quando il terminale lo consente e non viene mai scritta su disco. Le credenziali sono in `~/.agentcloud/credentials.json` con permessi `600` dove supportato; su Windows il comportamento di `chmod` dipende dal filesystem/ACL.

Google OAuth non è gestito direttamente dalla CLI: gli account Google devono impostare una password dal sito tramite il recupero password.

## Comandi utente

```bash
agentcloud agents list
agentcloud agents catalog
agentcloud run support-agent "Analizza questa richiesta"
agentcloud chat support-agent
agentcloud usage
agentcloud config
agentcloud config --url http://localhost:3000
```

`run` e `chat` ricevono le risposte SSE dell'agente in streaming. `usage` mostra uso mensile e piano disponibili all'API.

Il catalogo e i prezzi rimandano sempre al marketplace web: la CLI non esegue checkout.

## Comandi admin

I comandi admin hanno un'autenticazione separata e non usano mai il token utente:

```bash
# PowerShell
$env:AGENTCLOUD_ADMIN_TOKEN="<admin-token>"

# bash/zsh
export AGENTCLOUD_ADMIN_TOKEN="<admin-token>"

agentcloud admin tenants list
agentcloud admin email send --to user@example.com --subject "Oggetto" --body "Testo"
agentcloud admin email send --to user@example.com --subject "Oggetto" --html "<p>Testo</p>" --yes
agentcloud admin integrations status
agentcloud admin integrations status --tenant tenant-id
agentcloud admin flags show
```

`AGENTCLOUD_ADMIN_TOKEN` non viene mai salvato, stampato o incluso nei log. L'invio email richiede conferma interattiva, salvo `--yes` per automazioni esplicite.

`flags show` è volutamente read-only: indica solo le variabili disponibili nell'ambiente dove gira la CLI; per Vercel vanno controllate dalla dashboard.

## Contratti API

I contratti verificati sono in [`docs/api-contracts.md`](docs/api-contracts.md).

## Verifiche

```bash
npm run build
node dist/index.js --help
node dist/index.js agents --help
node dist/index.js admin --help
```
