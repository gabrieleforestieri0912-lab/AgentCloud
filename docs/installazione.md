# Installazione della CLI — risoluzione dei problemi

La CLI AgentCloud (`agentcloud`) è un pacchetto npm globale. Su macOS e Linux c'è lo script rapido `cli/install.sh` (`curl | sh`), su Windows si passa da npm o da WSL2. Questa pagina raccoglie gli errori d'installazione per sistema operativo e come uscirne.

Se non trovi qui il tuo problema, apri una issue su [github.com/gabrieleforestieri0912-lab/AgentCloud](https://github.com/gabrieleforestieri0912-lab/AgentCloud/issues) includendo l'output di:

```bash
agentcloud doctor        # se la CLI è installata
```

oppure, se non lo è:

```bash
curl -fsSL https://raw.githubusercontent.com/gabrieleforestieri0912-lab/AgentCloud/main/cli/install.sh | sh -s --diagnose
```

La diagnostica stampa OS, versioni di Node/npm, prefisso npm, PATH, spazio e permessi sulla home: nessun token, nessuna credenziale.

## Prima di iniziare

Requisiti:

- **Node.js >= 20** — il campo `engines` di `agentcloud-cli` lo richiede; la CLI si rifiuta di avviarsi su versioni precedenti (ink 6 e altre dipendenze non funzionano con Node 18)
- **npm** — arriva con Node, ma alcune distribuzioni Linux lo distribuiscono in un pacchetto separato
- **una connessione a Internet** — l'installazione scarica da `registry.npmjs.org`; login e chat parlano con `www.agentcloud.agency`

Verifica:

```bash
node -v    # atteso: v20.x o superiore
npm -v
```

Se `node -v` risponde con una versione sotto la 20, **aggiorna prima di installare** (vedi la sezione del tuo sistema). Con Node vecchio capita quasi sempre una di queste due cose:

- installando via npm diretta: npm **avverte ma procede**, poi la CLI non si avvia

```
npm warn EBADENGINE Unsupported engine {
npm warn EBADENGINE   package: 'agentcloud-cli'
npm warn EBADENGINE   required: { node: '>=20.0.0' }
npm warn EBADENGINE   current: { node: 'v18.19.1' }
npm warn EBADENGINE }
```

```
AgentCloud CLI richiede Node.js >= 20 (trovato 18.19.1).
Aggiorna Node: https://nodejs.org/ (o `nvm install 20`).
```

- installando con lo script `curl | sh`: il blocco avviene **prima** di `npm install`, con un messaggio che include i comandi per aggiornare

```
agentcloud: ERRORE: Trovato Node 18.19.1: serve la 20+. Aggiorna Node PRIMA di installare (così eviti i warning EBADENGINE e la CLI che poi non si avvia):
  nvm:    nvm install 20 && nvm use 20        (consigliato se sviluppi su più progetti)
  fnm:    fnm install 20 && fnm use 20
  ...
```

Nota: gli stessi errori possono riferirsi a `ink`, o sue altre dipendenze con versioni richieste più recenti — l'origine è comunque la versione di Node.

## Linux (Ubuntu/Debian, Fedora/RHEL, Arch)

Prima di tutto, capisci **da dove viene il tuo Node** — la maggior parte dei problemi su Linux nasce lì:

```bash
which -a node
node -v
```

### EACCES / permission denied su `npm install -g`

**Sintomo**

```
npm ERR! code EACCES
npm ERR! syscall mkdir
npm ERR! path /usr/local/lib/node_modules/agentcloud-cli
npm ERR! errno -13
npm ERR! Error: EACCES: permission denied, mkdir '/usr/local/lib/node_modules/agentcloud-cli'
```

Con lo script rapido lo stesso errore arriva già "tradotto": il log di npm viene mostrato e sotto compaiono direttamente i due rimedi qui sotto.

**Causa** — il prefisso npm (`/usr/local` con Node di sistema, `/usr` con il Node di alcune distro) appartiene a root, e `npm install -g` gira con i tuoi permessi. È il caso normale con Node installato via apt/dnf/pacman/NodeSource senza prefisso utente.

**Soluzione** — due vie, scegli una. **Non usare `sudo npm install -g`**: sembra la via più corta, ma i pacchetti di proprietà di root eseguono script di installazione arbitrari, e in più finisce per corrompere i permessi di `~/.npm` e della cartella globale.

Via (a), prefisso utente: i pacchetti globali finiscono nella tua home, niente root necessario.

```bash
mkdir -p ~/.npm-global
npm config set prefix ~/.npm-global

# bash:
echo 'export PATH="$HOME/.npm-global/bin:$PATH"' >> ~/.bashrc
# zsh (se `echo $SHELL` è /bin/zsh):
echo 'export PATH="$HOME/.npm-global/bin:$PATH"' >> ~/.zshrc

export PATH="$HOME/.npm-global/bin:$PATH"   # vale finché non riapri il terminale
```

```fish
# fish:
fish_add_path ~/.npm-global/bin
npm config set prefix ~/.npm-global
```

Poi riavvia l'installazione:

```bash
curl -fsSL https://raw.githubusercontent.com/gabrieleforestieri0912-lab/AgentCloud/main/cli/install.sh | sh
```

Via (b), nvm: ogni versione di Node vive in `~/.nvm` con il suo prefisso, quindi i permessi non sono più un problema per costruzione.

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
exec "$SHELL"      # oppure chiudi e riapri il terminale
nvm install 20
nvm use 20
curl -fsSL https://raw.githubusercontent.com/gabrieleforestieri0912-lab/AgentCloud/main/cli/install.sh | sh
```

In alternativa a nvm c'è **fnm** (`fnm install 20 && fnm use 20`), più veloce e con il modulo shell per zsh/fish/powershell.

### Node troppo vecchio (18.x)

**Sintomo** — uno dei due messaggi mostrati in [Prima di iniziare](#prima-di-iniziare): `npm warn EBADENGINE` (e di solito anche warning per `ink@6` e altre dipendenze, che richiedono Node moderno), poi `AgentCloud CLI richiede Node.js >= 20` all'avvio. Con lo script rapido: `agentcloud: ERRORE: Trovato Node 18.19.1: serve la 20+`.

**Causa** — Node 18 è fuori supporto e `agentcloud-cli` richiede >= 20. Su Ubuntu/Debian il problema è sistemico: la versione di Node nella repo della distro è **congelata** all'uscita della versione di Ubuntu (Ubuntu 24.04 include Node 18), quindi `apt upgrade` non ti porterà mai alla 20.

**Soluzione** — dipende da dove viene il tuo Node; **non mescolare** gestori (vedi [Conflitti tra più installazioni di Node/npm](#conflitti-tra-più-installazioni-di-nodenpm)).

Se il Node viene da **apt o snap**, disinstallalo prima, altrimenti avrai due `node` in concorrenza sul PATH:

```bash
sudo apt-get remove -y nodejs libnode-dev   # se lo hai preso via apt
sudo snap remove node                       # se lo hai preso via snap
```

Poi una delle vie corrette:

```bash
# NodeSource (utile se vuoi Node gestito da apt, ad esempio su un server):
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# nvm (consigliata per chi sviluppa: niente sudo, versioni a piacere):
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
exec "$SHELL"
nvm install 20 && nvm alias default 20
```

**Fedora/RHEL**: `sudo dnf install nodejs` di solito porta una LTS recente — controlla con `dnf info nodejs` prima di installare, e se la repo è ferma sotto la 20 usa nvm. Su RHEL con flussi di modulo vecchi (`nodejs:18`): `sudo dnf module reset nodejs && sudo dnf module enable nodejs:20` prima di `dnf install nodejs`.

**Arch**: `sudo pacman -S nodejs npm` è quasi sempre a giorno (Arch segue lo stabile corrente); se fosse più vecchio, nvm.

### Snap confinato (Ubuntu)

**Sintomo** — hai Node via snap: le installazioni globali con `npm i -g` "spariscono" (il binario non si trova nemmeno riaprendo il terminale), o danno errori di permesso anche dove la home è scrivibile. Controlla con `which node`: se il percorso è `/snap/…`, è questo il problema.

**Causa** — lo snap di Node è confinato: vede la tua home, ma non `/usr/local/lib/node_modules`, e le sue installazioni globali restano dentro l'ambiente dello snap.

**Soluzione** — abbandona lo snap e passa a nvm o NodeSource (come sopra):

```bash
sudo snap remove node
nvm install 20 && nvm use 20
```

### SELinux / AppArmor

Con **SELinux in enforcing** (predefinito su Fedora/RHEL), se l'errore sembra un EACCES anche con permessi posix corretti, il dubbio ragionevole è lo *security context*: controlla con `ls -Z $(which node)`. Con AppArmor (predefinito su Ubuntu, profilo di Node non restrittivo) non è noto alcun caso con `agentcloud-cli`.

**Nota di trasparenza**: nessuno dei due casi è stato osservato con questa CLI — è documentato per completezza; se ti capita, apri una issue includendo l'output di `agentcloud doctor`.

## macOS

### Xcode Command Line Tools mancanti

**Sintomo**

```
xcode-select: note: No developer tools were found, requesting install.
```

o Homebrew che si impunta sui developer tools durante l'installazione di Node.

**Causa** — lanci `brew install node` (o un altro tool che compila) senza Xcode CLT installate. La CLI stessa **non** ha dipendenze native (è tutta JavaScript): per far girare `agentcloud` non servono, servono agli strumenti di Homebrew.

**Soluzione**

```bash
xcode-select --install
```

e poi `brew install node`.

### Homebrew vs nvm

Entrambe le vie vanno bene. Homebrew gestisce un solo Node globale:

```bash
brew install node       # oppure: brew upgrade node
```

nvm conviene se gestisci più versioni di Node tra progetti diversi: `nvm install 20 && nvm alias default 20`. Non miscolarle: se hai Node sia da brew sia da nvm, usa `which -a node` per capire quale vince e, se serve, disinstallane una (`brew uninstall node`).

### Apple Silicon (M1 e successivi) e Rosetta

**Sintomo** — `node -p "process.arch"` risponde `x64` invece di `arm64`, e la CLI gira visibilmente più lenta.

**Causa** — hai installato Node con una Homebrew Intel eseguita sotto Rosetta, che mette i binari in `/usr/local/bin` invece che in `/opt/homebrew/bin`.

**Soluzione** — usa Homebrew nativo (ARM), che mette Node in `/opt/homebrew`: `/opt/homebrew/bin/brew install node`. Se hai entrambe le versioni, disinstalla quella Intel e controlla che il PATH punti a `/opt/homebrew/bin`. La CLI funziona anche sotto Rosetta, solo più lenta: niente nel pacchetto richiede il build Intel.

### Gatekeeper / quarantena

**Nota onesta**: la CLI non contiene binari scritti da noi — tutto ciò che gira è Node + pacchetti npm, e né `curl | sh` né npm assegnano l'attributo `com.apple.quarantine`. Se vedi il blocco di Gatekeeper ("cannot be opened because the developer cannot be verified"), riguarda quasi certamente il browser o Homebrew, non la CLI: riporta l'errore esatto in una issue, con l'output di `agentcloud doctor`.

### zsh come shell predefinita (da Catalina)

macOS ha zsh predefinito: le aggiunte al PATH vanno in `~/.zshrc`, non in `~/.bashrc`:

```zsh
echo 'export PATH="$HOME/.npm-global/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

Se usi bash su macOS, il file delle shell di login è `~/.bash_profile` (`~/.bashrc` non viene caricato dalle finestre del Terminale).

## Windows

Non esiste un `install.sh` per Windows nativo: in PowerShell e cmd la via è **npm** (con Node già installato) o **WSL2**.

### `curl | sh` non funziona in PowerShell / cmd

**Sintomo** — con `curl -fsSL <url> | sh`: `sh : The term 'sh' is not recognized...` (PowerShell) oppure `sh: not found` o output binario a schermo (cmd); o `curl` che scarica lo script invece di eseguirlo.

**Causa** — `install.sh` è uno script POSIX: serve `sh`, che sul Windows nativo non esiste, e PowerShell/cmd non glielo può dare in pipe.

**Soluzione** — usa npm. Prima assicurati di avere Node >= 20 (`node -v`), poi:

```powershell
npm i -g agentcloud-cli
agentcloud --version
```

In alternativa (consigliata se lavori già con il terminale Unix) **WSL2**:

```powershell
wsl --install
# riavvia, apri Ubuntu e poi:
```

```bash
curl -fsSL https://raw.githubusercontent.com/gabrieleforestieri0912-lab/AgentCloud/main/cli/install.sh | sh
```

### Execution Policy (PowerShell)

**Sintomo**

```
npm : File C:\Program Files\nodejs\npm.ps1 cannot be loaded because
running scripts is disabled on this system.
```

**Causa** — la *ExecutionPolicy* di PowerShell blocca gli script `.ps1` (npm ne include uno, `npm.ps1`).

**Soluzione**

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
npm i -g agentcloud-cli
```

oppure salta lo script PowerShell usando `npm.cmd` direttamente:

```powershell
npm.cmd i -g agentcloud-cli
```

### PATH della cartella globale di npm

**Sintomo**

```
agentcloud : The term 'agentcloud' is not recognized as a name of a cmdlet, function,
script file, or executable program.
```

**Causa** — i binari globali di npm stanno in `%APPDATA%\npm` (di solito `C:\Users\<tuonome>\AppData\Roaming\npm`); se quella cartella manca dal PATH, il comando non viene trovato. Accade di solito per installare Node con un terminale già aperto prima dell'installazione (il PATH era più corto), o dopo manipolazioni a mano del PATH.

**Soluzione** — individua la cartella e falla rientrare nel PATH utente:

```powershell
"$env:APPDATA\npm"                                  # cartella dei bin globali
[Environment]::SetEnvironmentVariable("Path",
  $env:Path + ";" + "$env:APPDATA\npm", "User")
```

Poi **riapri il terminale**: il PATH si legge all'avvio della shell.

### nvm-windows

Su Windows l'equivalente di nvm è [nvm-windows](https://github.com/coreybutler/nvm-windows) (progetto diverso dal nvm Unix):

```powershell
nvm install 20
nvm use 20
```

`nvm use` richiede un terminale avviato come amministratore. Poi:

```powershell
npm i -g agentcloud-cli
```

### Terminale che non supporta bene ink (vecchio host console)

**Sintomo** — la TUI a schermo intero si disegna male nel cmd classico: cursore che sfugge, frame sovrapposti, schermo che "sfarfalla".

**Causa** — il vecchio host console (`conhost`) gestisce le sequenze ANSI in modo limitato rispetto a Windows Terminal.

**Soluzione** — usa Windows Terminal (predefinito su Windows 11, installabile da Microsoft Store su Windows 10):

```powershell
wt.exe
```

Se non puoi cambiarlo, ripiega sul loop riga per riga:

```powershell
$env:AGENTCLOUD_NO_TUI = "1"    # permanente: [Environment]::SetEnvironmentVariable("AGENTCLOUD_NO_TUI","1","User")
agentcloud chat
```

### Percorsi con spazi o caratteri accentati nel nome utente

**Sintomo** — il nome utente Windows contiene spazi o accenti (es. `C:\Users\Paolo Neri`, `C:\Users\José`): errori tipo `ENOENT` o `EACCES` durante `npm i -g`, o binari globali che non partono.

**Causa** — il percorso utente con spazi o accenti: in linea di principio npm lo regge, ma ci sono bug noti (encoding, spazi nel percorso cache/prefix) che colpiscono node/npm in generale.

**Soluzione** — sposta prefix e cache fuori dal percorso utente:

```powershell
npm config set prefix "C:\npm\global"
npm config set cache  "C:\npm\cache"
```

poi aggiungi `C:\npm\global` al PATH (vedi [PATH della cartella globale di npm](#path-della-cartella-globale-di-npm)).

**Nota onesta**: non ci sono segnalazioni specifiche su `agentcloud-cli` — il limite riguarda node/npm su Windows. Se persiste con prefix e cache spostati, apri una issue con l'output di `agentcloud doctor`.

## Problemi comuni a tutti i sistemi

### `agentcloud: command not found` dopo l'installazione

**Sintomo**

```console
$ agentcloud
bash: agentcloud: command not found
```

oppure `zsh: command not found: agentcloud`, `fish: Unknown command 'agentcloud'`, `agentcloud : The term 'agentcloud' is not recognized…` (PowerShell).

**Causa** — il pacchetto è installato, ma la cartella `bin` del prefisso npm non è nel PATH della shell corrente: la shell legge il PATH solo all'avvio.

**Soluzione** — tre controlli in ordine:

1. riapri il terminale e riprova: è il caso più frequente;
2. se non basta, il binario sta dove il prefisso npm dice:

```bash
npm config get prefix           # es. ~/.npm-global oppure /usr/local
ls "$(npm config get prefix)/bin" | grep agentcloud
```

e se non c'è, aggiungi quella `bin` al PATH nel giusto file di inizializzazione (`~/.bashrc` per bash, `~/.zshrc` per zsh, `fish_add_path <bin-dir>` per fish, `setx PATH "%PATH%;<bin-dir>"` per Windows);

3. per confermare che il problema sia solo il PATH, chiama il binario col percorso completo:

```bash
"$(npm config get prefix)/bin/agentcloud" --version
```

### curl o wget mancanti (macOS / Linux)

**Sintomo**

```
sh: curl: command not found
```

(riferito alla pipeline `curl … | sh`).

**Causa** — la pipe passa prima da `curl`, che non è installato.

**Soluzione** — installalo, o usa wget:

```bash
sudo apt-get install curl          # Ubuntu/Debian
sudo dnf install curl              # Fedora/RHEL
sudo pacman -S curl                # Arch
apk add curl                       # Alpine

# alternativa con wget:
wget -qO- https://raw.githubusercontent.com/gabrieleforestieri0912-lab/AgentCloud/main/cli/install.sh | sh
```

### Errori SSL / proxy aziendale / firewall

**Sintomo** — durante `npm install`:

```
npm ERR! code SELF_SIGNED_CERT_IN_CHAIN
npm ERR! code UNABLE_TO_VERIFY_LEAF_SIGNATURE
```

oppure `ETIMEDOUT` / `ENOTFOUND` su `registry.npmjs.org`; durante `curl`:

```
curl: (60) SSL certificate problem: unable to get local issuer certificate
```

**Causa** — un proxy aziendale che ispeziona il TLS con un certificato proprio, o un firewall che blocca la connessione al registry npm.

**Soluzione** — dichiara il proxy (controlla con il tuo reparto IT host e porta esatti):

```bash
# per curl e per lo script rapido:
export HTTPS_PROXY=http://proxy.aziendale:porta
export HTTP_PROXY=http://proxy.aziendale:porta

# per npm:
npm config set proxy http://proxy.aziendale:porta
npm config set https-proxy http://proxy.aziendale:porta
```

Se il proxy sostituisce il certificato, dai a npm il bundle CA aziendale:

```bash
npm config set cafile /percorso/della/ca.pem
```

**Evita `npm config set strict-ssl false`** come soluzione fissa: disattiva la verifica dei certificati per tutte le operazioni di npm. Solo se ti serve per un test rapido, rimuovila subito dopo:

```bash
npm config delete strict-ssl
```

### Cache npm corrotta o installazione parziale

**Sintomo** — durante l'installazione:

```
npm ERR! code EINTEGRITY
npm ERR! sha512-… integrity checksum failed when using sha512: wanted sha512-… but got sha512-…
```

oppure `tarpack: Unexpected end of file`; o la CLI installata che si spezza a metà di un comando con errori dentro `dist/`.

**Causa** — un download interrotto (connessione instabile) ha lasciato nella cache un pacchetto a metà; reinstallarci sopra non lo ripara.

**Soluzione** — pulizia e reinstallazione completa:

```bash
npm uninstall -g agentcloud-cli
npm cache verify
npm i -g agentcloud-cli
agentcloud --version
```

`npm cache clean --force` solo se `verify` non basta: svuota l'intera cache, di tutti i progetti.

### Conflitti tra più installazioni di Node/npm

**Sintomo** — `node -v` dà versioni diverse a seconda del terminale (o dopo aver aggiornato Node alla 20 la CLI si rifiuta ancora di avviarsi, lamentando una versione vecchia).

**Causa** — più sorgenti di Node coesistono sul PATH (apt + nvm, snap + nvm, brew + nvm, nvm-windows + nodejs.org…): la prima trovata vince silenziosamente.

**Soluzione** — inventario e pulizia:

```bash
which -a node      # macOS/Linux
where.exe node     # Windows (PowerShell/cmd)
```

Lascia **una sola sorgente** (di solito nvm, se ne hai due) e disinstalla le altre:

```bash
sudo apt-get remove -y nodejs   # la copia apt
sudo snap remove node           # la copia snap
brew uninstall node             # la copia brew
```

Con nvm fissa il default, così resta attivo anche a terminale nuovo:

```bash
nvm alias default 20
```

### Spazio su disco o permessi sulla home insufficienti

**Sintomo**

```
npm ERR! code ENOSPC
npm ERR! syscall write
```

**Causa** — l'installazione scrive nella home (cache in `~/.npm`, globali sotto il prefisso configurato, sessioni in `~/.agentcloud`): se la home è piena o non scrivibile, tutto va in blocco.

**Verifica e soluzione**

```bash
df -h ~          # spazio libero
[ -w "$HOME" ] && echo "home scrivibile" || echo "home NON scrivibile"
```

Se lo spazio manca: liberalo, o sposta prefix e cache npm fuori dalla home (vedi la soluzione al punto [EACCES](#eacces--permission-denied-su-npm-install--g) o alla sezione Windows). Se la home non è scrivibile (caso raro: gestione aziendale o manutenzione mal riuscita):

```bash
sudo chown -R "$(whoami)": "$HOME"     # solo se la home è davvero tua
```

## Se le istruzioni qui non bastano

1. raccogli la diagnostica:

```bash
agentcloud doctor
# oppure, senza CLI installata:
curl -fsSL https://raw.githubusercontent.com/gabrieleforestieri0912-lab/AgentCloud/main/cli/install.sh | sh -s --diagnose
```

2. apri una issue su [github.com/gabrieleforestieri0912-lab/AgentCloud](https://github.com/gabrieleforestieri0912-lab/AgentCloud/issues): incolla l'output della diagnostica, il comando esatto che hai usato e l'errore integrale (non parafrasato).
