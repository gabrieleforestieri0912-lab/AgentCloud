#!/bin/sh
# AgentCloud CLI — installazione rapida per macOS e Linux.
#
# Uso:
#   curl -fsSL https://raw.githubusercontent.com/gabrieleforestieri0912-lab/AgentCloud/main/cli/install.sh | sh
#   curl -fsSL https://raw.githubusercontent.com/gabrieleforestieri0912-lab/AgentCloud/main/cli/install.sh | sh -s --diagnose
#   sh install.sh --diagnose   # se hai già scaricato il file
#
# Cosa fa: verifica Node.js 20+, installa il pacchetto npm globale
# `agentcloud-cli` e verifica che `agentcloud --version` risponda.
# Non installa Node da solo: se manca o è troppo vecchio, dice come metterlo.
# Se l'installazione fallisce, analizza il log di npm e stampa il rimedio
# (es. EACCES → prefisso utente o nvm).
set -eu

PKG="agentcloud-cli"
MIN_NODE=20
SCRIPT_URL="https://raw.githubusercontent.com/gabrieleforestieri0912-lab/AgentCloud/main/cli/install.sh"
DOCS="docs/installazione.md nel repo (guida completa: https://github.com/gabrieleforestieri0912-lab/AgentCloud/blob/main/docs/installazione.md)"

fail() {
  echo "agentcloud: ERRORE: $1" >&2
  exit 1
}

info() {
  echo "agentcloud: $1"
}

# --- --diagnose: ambiente da incollare in una issue (nessun segreto) --------
if [ "${1:-}" = "--diagnose" ]; then
  info "Diagnostica installazione — incolla tutto questo nella issue (non contiene token)"
  echo "---"
  echo "os:      $(uname -a)"
  echo "shell:   ${SHELL:-non rilevata}"
  echo "home:    ${HOME}"
  if [ -w "$HOME" ]; then echo "home scrivibile: sì"; else echo "home scrivibile: NO"; fi
  if command -v node >/dev/null 2>&1; then
    echo "node:    $(node -v)  ($(command -v node))"
  else
    echo "node:    NON TROVATO"
  fi
  if command -v npm >/dev/null 2>&1; then
    echo "npm:     $(npm -v)"
    echo "prefix:  $(npm config get prefix)"
    echo "cache:   $(npm config get cache)"
  else
    echo "npm:     NON TROVATO"
  fi
  echo "path:    $PATH"
  echo "spazio sulla home:"
  df -h "$HOME" 2>/dev/null || echo "  (df non disponibile)"
  npm list -g --depth=0 2>/dev/null | grep agentcloud || echo "  ($PKG non risulta installata)"
  echo "---"
  exit 0
fi

# --- Requisiti: node e npm --------------------------------------------------
command -v node >/dev/null 2>&1 || fail "Node.js non trovato. Installalo e riprova:
  macOS:   brew install node
  Ubuntu:  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt-get install -y nodejs
  Altro:   nvm install 20   (oppure https://nodejs.org, versione LTS 20+)"

NODE_VERSION=$(node -p "process.versions.node" 2>/dev/null) || NODE_VERSION=""
NODE_MAJOR=${NODE_VERSION%%.*}
case "$NODE_MAJOR" in
  ''|*[!0-9]*) NODE_MAJOR=0 ;;
esac
if [ "$NODE_MAJOR" -lt "$MIN_NODE" ]; then
  fail "Trovato Node ${NODE_VERSION:-di versione non leggibile}: serve la $MIN_NODE+. Aggiorna Node PRIMA di installare (così eviti i warning EBADENGINE e la CLI che poi non si avvia):
  nvm:    nvm install 20 && nvm use 20        (consigliato se sviluppi su più progetti)
  fnm:    fnm install 20 && fnm use 20
  macOS:  brew upgrade node
  Ubuntu: curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt-get install -y nodejs
          (apt e snap aggiungono Node vecchio: se il tuo viene da lì, prima
           disinstallalo: sudo apt-get remove nodejs oppure sudo snap remove node)
  Fedora/Arch: le repo di solito hanno Node recente; se la tua è sotto la 20, usa nvm.
Guida per sistema operativo: $DOCS"
fi

command -v npm >/dev/null 2>&1 || fail "npm non trovato (dovrebbe venire con Node). Reinstalla Node >= $MIN_NODE."

info "Node v$NODE_VERSION ok, installo $PKG…"

# --- Installazione ----------------------------------------------------------
# Il log va su file: dopo l'eventuale fallimento viene mostrato e ispezionato
# (es. EACCES) per stampare la soluzione giusta invece di un suggerimento
# generico.
LOG=$(mktemp 2>/dev/null) || LOG="${TMPDIR:-/tmp}/agentcloud-install.$$.log"
trap 'rm -f "$LOG"' EXIT INT TERM

NPM_PREFIX=$(npm config get prefix 2>/dev/null) || NPM_PREFIX=""

if npm install -g "$PKG" >"$LOG" 2>&1; then
  cat "$LOG"
  info "Pacchetto installato."
else
  echo "agentcloud: npm install è fallito. Output:" >&2
  cat "$LOG" >&2
  if grep -q "EACCES" "$LOG" 2>/dev/null; then
    fail "Installazione negata per i permessi (EACCES)${NPM_PREFIX:+ sul prefisso npm $NPM_PREFIX}.
NON usare sudo npm: corrompe i permessi di ~/.npm e della cartella di installazione.
Scegli una via:
  (a) Prefisso utente (i pacchetti globali finiscono nella tua home):
      npm config set prefix \"\$HOME/.npm-global\"
      bash/zsh:  echo 'export PATH=\"\$HOME/.npm-global/bin:\$PATH\"' >> ~/.bashrc   # con zsh usa ~/.zshrc
      fish:      fish_add_path ~/.npm-global/bin
      poi chiudi e riapri il terminale e rilancia questo script
  (b) nvm (i globali stanno nella home, quindi niente EACCES di nuovo):
      curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
      exec \"\$SHELL\"  # o chiudi e riapri il terminale
      nvm install 20 && npm install -g $PKG
$DOCS"
  fi
  fail "Installazione fallita (vedi l'output qui sopra).
Se parla di rete (ETIMEDOUT, ENOTFOUND, ECONNREFUSED) controlla proxy o firewall.
Se parla di integrità o tar corrotti: npm cache verify e riprova.
$DOCS"
fi

# --- Verifica finale: il comando risponde, con la versione ------------------
if command -v agentcloud >/dev/null 2>&1; then
  info "Verifica: agentcloud $(agentcloud --version 2>/dev/null || echo 'installato (versione non leggibile)')"
  info "Prossimo passo: agentcloud login"
else
  fail "$PKG risulta installato ma il comando 'agentcloud' non è nel PATH.
Chiudi e riapri il terminale (la shell legge il PATH solo all'avvio).
Se riaperto non c'è ancora, aggiungi al PATH la cartella bin del prefisso npm${NPM_PREFIX:+ ($NPM_PREFIX/bin)}:
  bash/zsh: echo 'export PATH=\"\$HOME/.npm-global/bin:\$PATH\"' >> ~/.bashrc   # con zsh ~/.zshrc
  fish:     fish_add_path ~/.npm-global/bin   # (o il bin del prefisso indicato sopra)
$DOCS"
fi
