# Il piano gratuito: un solo contatore, un solo numero

Come funziona oggi il freemium di AgentCloud e **perché** è fatto così.
Ogni decisione qui sotto è already implementata e verificata.

## Il modello in una riga

> **Il piano gratuito è 5 messaggi al giorno, in totale. La demo della home non
> è un piano a sé: è il piano gratis visto da fuori.**

Tre superfici, un solo contatore, un solo numero.

| Superficie | Endpoint | Chi consuma il contatore |
|---|---|---|
| Demo della home | `/api/chat` con `surface: "demo"` | sì (è la prova del piano) |
| Chat generica in `/chat` | `/api/chat` | sì (usa il provider vero) |
| Chat con un agente | `/api/agent/run` | sì |
| Pagine agente pubbliche | `/api/agent/run` | sì |

Per gli abbonati il vincolo non è il numero di messaggi ma il **pool di token**
del piano (vedi `src/lib/billing/token-pool.ts`).

## Perché un solo contatore

Prima c'erano tre buchi diversi e la home prometteva due numeri:

- la demo aveva 10 messaggi contati **nel browser**: un refresh li azzerava
  (uso di fatto illimitato) e la home mostrava "10 messaggi demo" accanto a
  "5 messaggi gratuiti al giorno" — due numeri per la stessa idea;
- la chat generica in `/chat` **non aveva alcun limite**: `/api/chat` non
  registrava uso;
- gli agenti avevano 5/giorno, server-side: l'unico contatore vero.

Ora il contatore è unico, server-side, e la copy dice 5 ovunque.

## Le decisioni (e perché)

### 1. La demo passa da 10 a 5 messaggi

**Scelta: un numero solo.** Due numeri in homepage ("10 demo" + "5 al giorno")
erano la causa diretta della confusione, e il contatore della demo non era
nemmeno un limite (era lato client).

La demo resta la prova più generosa del funnel perché **costa poco**: gira sul
provider economico (`provider: "xt"`, il default di `AGENT_LLM_PROVIDER`) e una
risposta vale ~5k token contro i ~17k di un agente con tool.

Se un domani serve più generoso nella demo, la leva è `FREE_MESSAGES_PER_DAY`:
cambia per tutte le superfici e non richiede deploy.

### 2. Il numero 5 è configurabile

`FREE_MESSAGES_PER_DAY` (env, default 5). Il free tier è una scelta di
business e il suo costo va poter tarare senza deploy:

```
FREE_MESSAGES_PER_DAY=5      # messaggi gratuiti al giorno per utente
```

Con 5 il costo massimo teorico del free tier è ~85k token/giorno per utente
(5 messaggi da ~17k token col provider degli agenti).

### 3. La chat generica consuma il piano gratuito

**Scelta: sì, consuma.** È il prodotto di default dell'app e usa il provider
vero: lasciarla illimitata era un buco di costo aperto. Un utente free che
scrive 5 messaggi all'assistente generico non ha più messaggi per gli agenti:
è il prezzo della trasparenza ("in totale").

Se in futuro la generica deve essere "in omaggio", si esclude il suo slug
(`assistant`) dal conteggio: una riga in `checkFreeUsage`.

### 4. Gli abbonati pagano la chat generica col pool

**Scelta: sì, dal pool principale.** Il pool è un budget di token, non
un'abbonamento per singolo agente: tutto ciò che costa token esce dallo stesso
budget. Il consumo della chat generica è visibile nella riga di budget sopra
l'input ("212.3k / 1.0M token") e nelle card della dashboard.

La demo della home, invece, **non** consuma il pool (è un assaggio del
prodotto su provider economico): per un abbonato è illimitata.

### 5. Il limite per gli ospiti è per dispositivo, non solo per IP

Un contatore solo per IP penalizza chi sta dietro una NAT (albergo, ufficio,
rete mobile): cinque messaggi di un collega esauriscono la quota di tutti.

Oggi l'ospite ha due contatori:

- **il contatore del dispositivo** — un cookie firmato dal server (HMAC), che
  il browser non può gonfiare dichiarando un numero più basso. È il metro
  quando il visitatore ha il cookie: è esatto e non penalizza la NAT;
- **il contatore per IP** — il bucket `free-chat` su `rate_limits`, la rete di
  sicurezza per chi non ha il cookie (bot, client che non lo conservano) o
  per chi lo cancella per ripartire da zero.

Perché il cookie vince quando c'è: il contatore per IP arriva dal DB e soffre
di replica-lag (una richiesta può leggere il valore di una richiesta
precedente), quindi usarlo come metro renderebbe l'arbitraggio anche per i
browser normali. Il cookie è letto dalla richiesta: è esatto.

Limite noto: chi cancella i cookie **e** cambia IP aggira il contatore. Il
danno è limitato dal provider economico della demo.

Un dettaglio che sembra un difetto ma non lo è: **il primo messaggio di un
ospite che ha ancora l'IP condiviso con altri (albergo, ufficio) è giudicato
dall'IP**, quindi può essere rifiutato se l'IP è già esaurito. La risposta
`402` registra comunque il cookie del dispositivo: al tentativo successivo
l'ospite è giudicato dal proprio contatore e non è più penalizzato dai
colleghi. Un solo messaggio perso, non cinque.

### 6. Gli agenti: 5/giorno, invariato

Il free tier degli agenti era già 5 messaggi al giorno con reset a mezzanotte
UTC e resta così. L'unica novità è che ora lo condivide con la demo e con la
chat generica.

### 7. Il bonus da referral: 3 messaggi extra per invito

Chi non ha abbonamento attivo e finisce i suoi 5 può continuare a scrivere
consumando un **pool di crediti una tantum**: 3 messaggi per ogni persona che si
registra completando l'auth partendo dal suo link (`/signup?ref=<codice>`).

- **Una tantum, non giornaliero**: i crediti non si ricaricano a mezzanotte e
  non scadono. Con 4 inviti validi il totale è 12 messaggi extra, una volta.
- **Solo dopo i 5 base**: il limite del giorno diventa `5 + crediti disponibili`
  (es. 8 con un invito). Il pool si consuma nell'ordine giusto perché è un
  solo numero, non due code.
- **Il referral conta alla registrazione completata**: lo scatto è il passaggio
  del profilo invitato a `auth_method_completed = true` (la stessa soglia del
  referral della waitlist), non la visita al link. Autoreferral e codici
  inesistente li normalizza il database, non l'app.
- **Solo utenti autenticati**: gli ospiti non hanno un profilo su cui
  accumulare inviti.
- **Chi si abbona non brucia il pool**: le run fatte con un piano attivo non
  consumano crediti (in quei giorni non c'era alcun limite).
- **Il link compare nel banner paywall della chat** (`/chat`), quello che
  appare quando i 5 sono finiti: bottone "Copia link" + contatore dei crediti
  già guadagnati.

Il moltiplicatore (3) e il tetto di sicurezza (300 messaggi) vivono in
`src/lib/billing/referral-bonus.ts`; lo schema è in
`supabase/schema-referral-message-bonus.sql` (idempotente). Senza la migrazione
applicata il modulo resta muto e il freemium è identico a prima: 5 messaggi,
niente inviti.

## Come si comporta

- **Reset**: a mezzanotte UTC (come prima).
- **Il contatore è server-side**: un refresh non lo azzera, un'altra scheda non
  lo aggira.
- **La UI mostra il residuo**: la chat mostra "4 / 5 messaggi gratuiti rimasti
  oggi" (il numero viene dal server, non da un conteggio nel browser) e la
  home mostra lo stesso.
- **Al limite**: `402 FREE_LIMIT_REACHED` → la chat apre il paywall, la home
  apre il modal di accesso.
- **La chat generica in `/chat`** con l'agente scelto passa da
  `/api/agent/run` (contatore free o pool); senza agente passa da `/api/chat`
  (stessi limiti, e per gli abbonati è il pool).

## Codice

| File | Ruolo |
|---|---|
| `src/lib/billing/free-window.ts` | la soglia (`FREE_MESSAGES_PER_DAY`, da env) e la finestra giornaliera |
| `src/lib/billing/free-limit.ts` | il contatore (run di oggi per gli autenticati, bucket per IP per gli ospiti) |
| `src/lib/billing/free-usage.ts` | la decisione "posso ancora scrivere?" e il residuo |
| `src/lib/billing/referral-bonus.ts` | il bonus da referral (crediti maturati, spesi, codice invito) |
| `src/lib/billing/guest-counter.ts` | il contatore del dispositivo (cookie firmato) |
| `src/lib/billing/token-pool.ts` | il pool di token dei piani (abbonati) |
| `src/lib/billing/usage-tracking.ts` | l'enforcement (diritto → pool → overage) |
| `src/app/api/chat/route.ts` | superficie `demo` / `chat`, enforcement, quota residua nel flusso SSE |
| `src/app/api/agent/run/route.ts` | enforcement del piano gratuito per gli agenti |
| `src/app/api/v1/run/route.ts` | enforcement della stessa regola per le API key |
| `src/app/api/agent/limit/route.ts` | residuo + bonus + codice invito per la UI |
| `src/app/signup/page.tsx` | ?ref= → cookie `ac_ref` → `referred_by` sul profilo |
| `src/app/auth/callback/route.ts` | stessa attribuzione per Google OAuth e conferma email |
| `supabase/schema-referral-message-bonus.sql` | colonne, trigger di accredito e RPC di stato |
| `src/components/HeroSection.tsx` | il contatore viene dal server; il 402 apre il modal |

## Variabili d'ambiente

| Variabile | Default | Serve a |
|---|---|---|
| `FREE_MESSAGES_PER_DAY` | `5` | messaggi gratuiti al giorno per utente |
| `GUEST_COUNTER_SECRET` | fallback a `INTEGRATIONS_STATE_SECRET` / `TENANT_STORE_KEY` | firma del cookie del contatore dispositivo |
