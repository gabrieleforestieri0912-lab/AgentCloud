# AgentCloud CLI

CLI unificata di AgentCloud: comandi utente e comandi admin in un unico binario `agentcloud`. Usa solo le API del sito, non accede direttamente a Supabase DB o Anthropic.

## Requisiti e installazione

Node.js 18+.

```bash
npm i -g @agentcloud/cli
agentcloud --help
```

In alternativa, dai sorgenti:

```bash
cd cli
npm install
npm run build
node dist/index.js --help
```

Per uso globale dai sorgenti, dopo il build:

```bash
npm link
agentcloud --help
```

## Aggiornamento

```bash
agentcloud update          # installa l'ultima versione pubblicata
agentcloud update --check  # controlla soltanto, senza installare
```

## Pubblicazione di una nuova versione (manutentori)

Il pacchetto non si pubblica da solo: dopo ogni modifica che deve arrivare
agli utenti, aggiorna `version` in `cli/package.json`, commita e poi:

```bash
cd cli
npm login                  # solo la prima volta (account npm del team)
npm publish                # pubblica @agentcloud/cli (access: public)
```

`prepublishOnly` ricompila `dist/` in automatico, quindi pubblica sempre il
codice aggiornato. Non committare mai segreti: il pacchetto contiene solo
`dist/`, README e LICENSE. Dopo la pubblicazione, gli utenti aggiornano con
`agentcloud update`.

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
agentcloud chat support-agent --resume 7c6aa8c2
agentcloud usage
agentcloud config
agentcloud config --url http://localhost:3000
```

`run` e `chat` ricevono le risposte SSE dell'agente in streaming. `usage` mostra uso mensile e piano disponibili all'API.

### Riprendere una chat interrotta

La cronologia della chat vive in memoria finché non esci. All'uscita
(`exit`, Ctrl+D, Ctrl+C, o anche in caso di errore) la CLI salva tutto in
`~/.agentcloud/sessions/` e stampa il codice per tornarci:

```bash
agentcloud chat support-agent
# ...
# Sessione salvata. Per tornare a questa chat:
#   agentcloud chat support-agent --resume 7c6aa8c2
```

Le sessioni restano sul computer dove sono state create e non seguono
l'account su altri PC. Se il codice è di un altro agente, la CLI indica il
comando giusto invece di mescolare le cronologie.

Il catalogo e i prezzi rimandano sempre al marketplace web: la CLI non esegue checkout.

### Conferma umana delle azioni che modificano documenti

Quando un agente vuole modificare contenuto esistente (es. appendere testo a un documento Word), la run si mette in pausa e la CLI chiede conferma:

```bash
agentcloud run email-manager "Aggiungi il riepilogo al report"
# ...
# Confermi l'esecuzione di "word_append"? [y/N]
```

Il token di ripresa è firmato dal server: la CLI non può cambiare tool né argomenti, può solo approvare o annullare. In pipeline non interattive passa `--yes` per approvare automaticamente; senza terminale interattivo e senza `--yes` la conferma è negata per non bloccare gli script.

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
