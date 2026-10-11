# AgentCloud CLI

CLI unificata di AgentCloud: comandi utente e comandi admin in un unico binario `agentcloud`. Usa solo le API del sito, non accede direttamente a Supabase DB o Anthropic.

## Requisiti e installazione

Node.js 18+.

```bash
npm i -g agentcloud-cli
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

La CLI controlla da sola gli aggiornamenti all'avvio di ogni comando (al
massimo una volta al giorno, mai negli script): se c'è una versione nuova,
lo dice e propone di installarla subito e ripartire con lo stesso comando.
Per disattivare l'avviso: `AGENTCLOUD_NO_UPDATE_CHECK=1`.

## Pubblicazione di una nuova versione (manutentori)

Il pacchetto non si pubblica da solo: dopo ogni modifica che deve arrivare
agli utenti, aggiorna `version` in `cli/package.json`, commita e poi:

```bash
cd cli
npm login                  # solo la prima volta (account npm del team)
npm publish                # pubblica agentcloud-cli
```

`prepublishOnly` ricompila `dist/` in automatico, quindi pubblica sempre il
codice aggiornato. Non committare mai segreti: il pacchetto contiene solo
`dist/`, README e LICENSE. Dopo la pubblicazione, gli utenti aggiornano con
`agentcloud update`.

## Autenticazione utente

Senza argomenti la CLI mostra il banner di benvenuto con la guida rapida:

```bash
agentcloud
```

Il login apre il browser e riceve il token da solo (nessuna password da
digitare):

```bash
agentcloud login
agentcloud whoami
agentcloud logout
```

Come funziona: la CLI apre `/cli/auth?port=...&state=...` nel browser e resta
in ascolto su `127.0.0.1`; la pagina rimanda access token + refresh token al
terminale. Lo `state` casuale impedisce a un altro processo locale di
iniettare un token.

Fallback senza browser (server, email/password):

```bash
agentcloud login --password
```

Prima del login con password configura le chiavi pubbliche Supabase
nell'ambiente:

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
agentcloud chat                    # scegli l'agente dentro la chat
agentcloud chat support-agent
agentcloud chat support-agent --resume 7c6aa8c2
agentcloud usage
agentcloud config
agentcloud config --url http://localhost:3000
```

Senza slug, `chat` mostra il selettore (frecce + Invio sul terminale,
elenco numerato se l'input è ridiretto): solo agenti disponibili, con
categoria e prezzo. I colori si spengono da soli fuori dal terminale
(pipe, script) o con `NO_COLOR=1`.

`run` e `chat` ricevono le risposte SSE dell'agente in streaming. `usage` mostra uso mensile e piano disponibili all'API.

## TUI a schermo intero

Su terminale interattivo `agentcloud chat` apre la TUI stile OpenCode:
conversazione con markdown e streaming, input multilinea (Invio invia,
Maiusc+Invio o Ctrl+J a capo, Esc interrompe), barra di stato
(agente · cartella · online), sidebar con titolo e modifiche ai file
(Ctrl+B per mostrarla/nasconderla, sparisce sotto i 100 colonne).

Senza terminale interattivo (pipe, CI) o con `AGENTCLOUD_NO_TUI=1` gira il
loop classico riga per riga. I colori si spengono da soli fuori dal
terminale o con `NO_COLOR=1`. Tema `dark`/`light` con `/theme` (persistito).

### Comandi `/`

Digitando `/` si apre il menu filtrabile (frecce, Tab/Invio, Esc):

| Comando | Cosa fa |
|---|---|
| `/help` | comandi e scorciatoie |
| `/new` | nuova chat (azzera tutto) |
| `/sessions` | chat precedenti e ripresa |
| `/rename <titolo>` | rinomina la chat |
| `/undo` · `/redo` | annulla/ripristina modifiche file |
| `/diff [file]` | tutte le modifiche o un file |
| `/clear` | pulisce la conversazione |
| `/theme [nome]` | cambia tema |
| `/login` · `/logout` | account |
| `/exit` | esce (salva la sessione) |

Scorciatoie: Tab sposta il focus (input/sidebar), ↑↓ navigano,
Ctrl+B sidebar, Ctrl+C esce salvando.

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
