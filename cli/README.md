# AgentCloud CLI

Interfaccia a riga di comando per interagire con la suite di agenti AI di **AgentCloud**.

## Installazione Locale

1. Accedi alla cartella della CLI:
   ```bash
   cd cli
   npm install
   npm run build
   ```

2. Collega il comando globalmente nel tuo sistema:
   ```bash
   npm link
   ```

## Comandi Principali

- **Login**: Configura il tuo Bearer Token o API Key:
  ```bash
  agentcloud login <TUO_TOKEN>
  ```

- **Elenco agenti**: Visualizza gli agenti disponibili:
  ```bash
  agentcloud list
  ```

- **Esecuzione agente**:
  ```bash
  agentcloud run support-agent "Come posso configurare il webhook per un nuovo utente?"
  agentcloud run email-assistant "Scrivi una bozza di risposta cordiale per un cliente insoddisfatto."
  ```

- **Configurazione**:
  ```bash
  agentcloud config
  agentcloud config --url http://localhost:3000   # per testare in locale
  ```
