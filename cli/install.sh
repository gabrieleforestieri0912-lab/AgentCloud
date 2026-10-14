#!/bin/sh
# AgentCloud CLI — installazione rapida per macOS e Linux.
#
# Uso:
#   curl -fsSL https://raw.githubusercontent.com/gabrieleforestieri0912-lab/AgentCloud/main/cli/install.sh | sh
#
# Cosa fa: verifica Node.js 18+, installa il pacchetto npm globale
# `agentcloud-cli` e verifica che il comando `agentcloud` risponda.
# Non installa Node da solo: se manca, dice come metterlo.
set -eu

PKG="agentcloud-cli"
MIN_NODE=18

fail() {
  echo "agentcloud: ERRORE: $1" >&2
  exit 1
}

info() {
  echo "agentcloud: $1"
}

command -v node >/dev/null 2>&1 || fail "Node.js non trovato. Installalo e riprova:
  macOS:   brew install node
  Ubuntu:  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt-get install -y nodejs
  Altro:   https://nodejs.org (versione LTS, 18+)"

NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo 0)
case "$NODE_MAJOR" in
  ''|*[!0-9]*) fail "Versione di Node non leggibile. Aggiorna Node alla 18+." ;;
esac
if [ "$NODE_MAJOR" -lt "$MIN_NODE" ]; then
  fail "Trovato Node v$(node -p 'process.versions.node'), serve la $MIN_NODE+. Aggiorna Node e riprova."
fi

command -v npm >/dev/null 2>&1 || fail "npm non trovato (dovrebbe venire con Node). Reinstalla Node."

info "Node $(node -p 'process.versions.node') ok, installo $PKG…"
if npm install -g "$PKG"; then
  :
else
  fail "Installazione fallita (spesso sono i permessi: riprova con 'sudo sh' oppure configura un prefisso utente:
  mkdir -p ~/.npm-global && npm config set prefix ~/.npm-global
  poi aggiungi ~/.npm-global/bin al PATH e rilancia questo script)."
fi

if command -v agentcloud >/dev/null 2>&1; then
  info "Installato: $(agentcloud --version 2>/dev/null || echo ok)"
  info "Prossimo passo: agentcloud login"
else
  fail "Pacchetto installato ma il comando 'agentcloud' non è nel PATH. Chiudi e riapri il terminale, poi riprova."
fi
