# AgentCloud CLI

CLI unificata di AgentCloud: comandi utente e comandi admin in un unico binario `agentcloud`. Usa solo le API del sito, non accede direttamente a Supabase DB o Anthropic.

## Requisiti e installazione

Node.js 20+ (la CLI si rifiuta di avviarsi con versioni precedenti, con un
messaggio chiaro). Funziona identica su **Linux, macOS e Windows**.

Installazione rapida (macOS e Linux):

```bash
curl -fsSL https://raw.githubusercontent.com/gabrieleforestieri0912-lab/AgentCloud/main/cli/install.sh | sh
```

Lo script verifica Node 20+, installa il pacchetto globale e controlla che il
comando `agentcloud` risponda. Se Node manca, dice come installarlo (brew su
macOS, nodesource su Ubuntu, nodejs.org per il resto).

Via npm (tutti i sistemi):

```bash
npm i -g agentcloud-cli
agentcloud --help
```

Oppure senza installare nulla (npx):

```bash
npx agentcloud-cli
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

## La chat: `agentcloud` e basta

```bash
agentcloud
```

Si apre **direttamente la chat** a schermo intero (alternate screen), senza
menu intermedi e senza attese: header con logo, versione, utente, piano e
agente attivo; area messaggi scrollabile con markdown, syntax highlight nei
blocchi di codice, streaming token per token con cursore animato e card
compatte per le azioni dell'agente (Shopify, Gmail, Calendar…); input
multilinea centrato (Invio invia, Maiusc+Invio a capo, ↑↓ cronologia);
footer con scorciatoie e residuo di messaggi gratuiti quando l'API lo espone.

Se non sei autenticato la chat si apre comunque: il messaggio di invio ti
ricorda di usare `/login` (basta digitare `/` per il menu dei comandi).

### Tasti

| Tasto | Azione |
|---|---|
| `/` | apre il menu dei comandi (autocompletamento) |
| Invio | invia · Maiusc+Invio o Ctrl+J va a capo |
| ↑ ↓ | cronologia dei messaggi / navigazione del menu |
| Esc | interrompe la risposta in corso · chiude gli overlay |
| Ctrl+B | mostra/nasconde la sidebar |
| Ctrl+C | esce pulito (il terminale viene sempre ripristinato) |

### Comandi `/`

Digitando `/` si apre il menu con **tutti** i comandi della CLI, in ordine di
priorità; il menu scorre con le frecce (`↑`/`↓`) e mostra sempre la riga
evidenziata. Ogni comando della CLI ha il suo equivalente slash:

| Comando | Equivalente CLI | Cosa fa |
|---|---|---|
| `/help` | `agentcloud --help` | elenco comandi e scorciatoie |
| `/version` | `agentcloud --version` | versione della CLI, di Node e dell'API |
| `/agents` | `agentcloud agents list` | elenca e cambia agente attivo |
| `/catalog` | `agentcloud agents catalog` | catalogo agenti e prezzi |
| `/run <agente> <prompt>` | `agentcloud run <agente> "<prompt>"` | run isolata: non entra in cronologia |
| `/whoami` | `agentcloud whoami` | utente autenticato e suoi agenti |
| `/usage` | `agentcloud usage` | piano, consumi e messaggi gratuiti residui |
| `/config` | `agentcloud config` | URL API, agente predefinito, credenziali |
| `/update` | `agentcloud update` | controlla se c'è una versione nuova |
| `/login` | `agentcloud login` | accedi col browser o incolla un token |
| `/logout` | `agentcloud logout` | esci dall'account (la chat resta aperta) |
| `/new` | — | nuova chat (azzera conversazione, file e titolo) |
| `/sessions` | `agentcloud chat --resume <codice>` | chat precedenti e ripresa |
| `/rename <titolo>` | — | rinomina la chat corrente |
| `/undo` · `/redo` | — | annulla/ripristina modifiche ai file |
| `/diff [file]` | — | mostra le modifiche (tutte o di un file) |
| `/clear` | — | pulisce la conversazione |
| `/theme` | — | tema attivo |
| `/chat` | `agentcloud chat` | sei già in chat: parla con l'agente attivo |
| `/exit` | — | esce (salva la sessione) |
| `/admin tenants list` | `agentcloud admin tenants list` | tenant registrati |
| `/admin integrations status` | `agentcloud admin integrations status` | stato integrazioni |
| `/admin flags show` | `agentcloud admin flags show` | feature flag della CLI |
| `/admin email send --to … --subject … --body …` | `agentcloud admin email send …` | email transazionali |

L'output dei comandi (versione, catalogo, usage…) compare nella chat in un
riquadro: resta a schermo ma **non** entra nella cronologia inviata all'agente.

## Login

```bash
agentcloud login          # apre il browser (scelta consigliata)
agentcloud whoami
agentcloud logout         # cancella le credenziali e revoca il token
```

Come funziona (loopback + PKCE, come `gh`): la CLI avvia un server locale su
`127.0.0.1` con porta casuale, genera uno `state` e una challenge PKCE, apre
`/cli/login?port=…&state=…&code_challenge=…` nel browser e resta in ascolto.
Dopo l'accesso sul sito la pagina reindirizza a
`http://127.0.0.1:<porta>/callback?code=…&state=…`: la CLI verifica lo
`state`, scambia `code` + `code_verifier` con i token via
`POST /api/cli/token` e salva le credenziali.

Nel browser non passa mai un token in chiaro: gira un `code` firmato, valido
2 minuti e spendibile una volta sola. Nel terminale la schermata di login
mostra l'URL completo, così se il browser non si apre basta copiarlo a mano.

Timeout: 5 minuti. In quel caso la schermata di login propone `R` (riprova
col browser) o `T` (incolla un token).

**Senza browser (SSH, WSL, container)**: la CLI passa da sola al device code
flow — mostra un codice breve e l'indirizzo `https://www.agentcloud.agency/device`:
approvi da un secondo dispositivo e il terminale riceve l'accesso. Puoi
forzarlo con `agentcloud login --device`.

**Incolla un token** (campo mascherato, validato prima di salvare):

```bash
agentcloud login --token act_...
```

Il token si genera in `/account` → “Token API per la CLI” e si revoca dallo
stesso posto (o con `agentcloud logout`, che revoca lato server).

**Nei script e in CI** non serve nessun login: basta la variabile d'ambiente.

```bash
AGENTCLOUD_TOKEN=act_... agentcloud run support-agent "ciao"
```

### Login con email e password (senza browser)

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

Fallback senza browser (server, email/password):

```bash
agentcloud login --password
```

Token API personale (consigliato su server headless e CI): generalo in
`/account` → “Token API per la CLI”, poi usalo una tantum o via env — nessun
browser, nessuna scadenza, revocabile in qualsiasi momento:

```bash
agentcloud login --token act_...

# oppure senza salvare nulla su disco:
AGENTCLOUD_TOKEN=act_... agentcloud run <slug> "ciao"
```

## Comandi utente

```bash
agentcloud --version
agentcloud whoami
agentcloud agents list
agentcloud agents catalog
agentcloud run support-agent "Analizza questa richiesta"
agentcloud chat                    # scegli l'agente dentro la chat
agentcloud chat support-agent
agentcloud chat support-agent --resume 7c6aa8c2
agentcloud usage
agentcloud config
agentcloud config --url http://localhost:3000
agentcloud run support-agent "ciao" --json   # output JSON, per script
```

Ogni comando qui sopra ha anche il suo equivalente slash dentro la chat
(`/version`, `/whoami`, `/agents`, `/catalog`, `/run`, `/usage`, `/config`…):
vedi la tabella completa in [Comandi `/`](#comandi-).

Senza slug, `chat` mostra il selettore (frecce + Invio sul terminale,
elenco numerato se l'input è ridiretto): solo agenti disponibili, con
categoria e prezzo. I colori si spengono da soli fuori dal terminale
(pipe, script) o con `NO_COLOR=1`.

`run` e `chat` ricevono le risposte SSE dell'agente in streaming. `usage` mostra uso mensile e piano disponibili all'API.

## TUI a schermo intero

Su terminale interattivo `agentcloud` (e `agentcloud chat`) apre la TUI stile
OpenCode: conversazione con markdown e streaming, input multilinea centrato
(Invio invia, Maiusc+Invio o Ctrl+J a capo, Esc interrompe), barra di stato
(agente · cartella · online · scorciatoie), sidebar con titolo e modifiche ai
file (Ctrl+B per mostrarla/nasconderla, sparisce sotto i 100 colonne).

I colori seguono la palette del sito (bg #0A0A0F, brand #038BFE) e degradano
da soli: truecolor → 256 → 16 colori, e si spengono del tutto con
`NO_COLOR=1` o quando l'output non è un terminale.

Senza terminale interattivo (pipe, CI) o con `AGENTCLOUD_NO_TUI=1` gira il
loop classico riga per riga. I colori si spengono da soli fuori dal
terminale o con `NO_COLOR=1`. Tema scuro fisso (il chiaro arriverà insieme a
quello del sito).

### Comandi `/`

Digitando `/` si apre il menu filtrabile (frecce, Tab/Invio, Esc) con
**tutti** i comandi della CLI: l'elenco completo è nella sezione
[Comandi `/`](#comandi-) qui sopra, con l'equivalente CLI di ognuno.

Il menu scorre: con molti comandi la finestra segue la riga evidenziata e
indica quanti ce ne sono sopra e sotto.

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
npm run typecheck
npm run build
node dist/index.js --help
node dist/index.js agents --help
node dist/index.js admin --help
```

Prova manuale della TUI (serve un terminale vero):

```bash
cd cli && npm run build && node dist/index.js
```
