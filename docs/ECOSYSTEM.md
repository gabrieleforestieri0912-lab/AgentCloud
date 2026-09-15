# AgentCloud — Ecosistema Multi-Piattaforma

AgentCloud è progettato come un ecosistema modulare e interconnesso di strumenti AI che permettono ad aziende, sviluppatori e team di interagire con gli agenti autonomi ovunque si trovino: dal browser al dispositivo mobile, dal terminale fino alle integrazioni web.

---

## Architettura dell'Ecosistema

```
                             ┌───────────────────────────────┐
                             │    AgentCloud Core Engine     │
                             │ (Next.js / Supabase / Claude) │
                             └───────────────┬───────────────┘
                                             │
                      ┌──────────────────────┼──────────────────────┐
                      │                      │                      │
                      ▼                      ▼                      ▼
           ┌─────────────────────┐┌─────────────────────┐┌─────────────────────┐
           │     Mobile App      ││  Chrome Extension   ││   AgentCloud CLI    │
           │  (Flutter/Dart)     ││    (Manifest V3)    ││ (TypeScript / Node) │
           │                     ││                     ││                     │
           │ - Dashboard mobile  ││ - Copilota browser  ││ - Dev pipeline      │
           │ - Voice & push notif││ - Context scraper   ││ - CI/CD automation  │
           │ - Quick agent chat  ││ - Quick prompt modal││ - Terminal agent run│
           └─────────────────────┘└─────────────────────┘└─────────────────────┘
```

---

## Componenti dell'Ecosistema

### 1. Web Platform (`src/`)
La piattaforma centrale accessibile da qualsiasi browser.
- **Tecnologie**: Next.js 15, React 19, Tailwind CSS v4, TypeScript.
- **Funzionalità**: Marketplace agenti, fatturazione abbonamenti Stripe con overage billing, gestione permessi e chiavi API, visualizzazione metriche di consumo token, live preview chat.

### 2. Mobile App (`mobile/`)
Client nativo multipiattaforma per iOS e Android.
- **Tecnologie**: Flutter 3.x, Dart.
- **Casi d'uso**:
  - Monitoraggio notifiche push in tempo reale sulle azioni completate dagli agenti (es. email inviate, lead qualificati).
  - Chat vocale e testuale istantanea in mobilità.
  - Switch rapido tra gli agenti abilitati del proprio workspace.

### 3. Chrome Extension (`extension/`)
Estensione per browser basata sulle più recenti specifiche Manifest V3.
- **Tecnologie**: JavaScript / Chrome Extension APIs (Manifest V3).
- **Casi d'uso**:
  - Lettura e analisi immediata del testo di una pagina web, email o ticket di supporto per passarlo all'agente selezionato.
  - Finestra popup fluttuante sempre a portata di mano con la scorciatoia da tastiera.
  - Iniezione di risposte suggerite nei portali web (Gmail, CRM, Shopify admin).

### 4. AgentCloud CLI (`cli/`)
Interfaccia da riga di comando per sviluppatori, sysadmin e pipeline automatizzate.
- **Tecnologie**: Node.js, TypeScript, Commander.js.
- **Casi d'uso**:
  - Esecuzione rapida di task dell'agente direttamente dal terminale: `agentcloud run <agent> "analizza questi log"`.
  - Integrazione in script Bash/PowerShell e job di CI/CD.
  - Autenticazione sicura tramite token e gestione dei profili locali.

---

## Specifiche API Unificate

Tutti i componenti client dell'ecosistema consumano la suite di API REST e SSE (Server-Sent Events) della piattaforma centrale:

| Endpoint | Metodo | Scopo | Autenticazione |
|----------|--------|-------|----------------|
| `/api/agent/run` | `POST` | Esecuzione agentica (streaming o standard) | Bearer Token / Supabase Session |
| `/api/chat` | `POST` | Chat interattiva streaming con memoria di conversazione | Bearer Token / Session |
| `/api/agents` | `GET` | Lista agenti attivi e configurazioni disponibili | Pubblico / Token |
| `/api/billing/usage` | `GET` | Consumo token mese corrente e limiti residui | Bearer Token / Session |
