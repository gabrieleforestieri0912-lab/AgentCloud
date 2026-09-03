# Supabase Authentication Setup

AgentCloud uses **Supabase Auth** for authentication:
- **Email + password** (conferma via email opzionale)
- **Google OAuth** (Sign in with Google)

Clerk è stato completamente rimosso (vedi `CLERK_SETUP.md` → eliminato).

## Come funziona

- **Sessioni**: cookie `sb-<ref>-auth-token` gestiti da `@supabase/ssr`
  - `src/lib/supabase/server.ts` — `createClient()` per server components / route handlers (legge i cookie)
  - `src/lib/supabase/client.ts` — `createClient()` per i component client (browser, `onAuthStateChange`)
- **Middleware**: `src/proxy.ts` valida/aggiorna la sessione e protegge le route non pubbliche (redirect a `/login`)
- **Pagine auth**: `/login` e `/signup` sono form custom (stile landing) con email+password e bottone Google
- **Utente**: `supabase.auth.getUser()` restituisce `user.id` (UUID), `user.email` e `user.user_metadata.full_name`
- **Profilo**: `supabase/schema.sql` crea una riga in `profiles` automaticamente a ogni nuova registrazione (trigger `handle_new_user`)

## Configurazione

### 1. Abilita Email/Password

Supabase Dashboard → **Authentication → Providers**:

- **Email**: attiva e scegli il flusso:
  - *Confirm email* ON: dopo la registrazione l'utente riceve una email di conferma (consigliato)
  - *Confirm email* OFF: la registrazione logga direttamente
- Configura il template email **Confirm signup** (se il confirmation è attivo)

### 2. Abilita Google

1. Google Cloud Console → crea un progetto (o usane uno esistente) → **APIs & Services → Credentials → Create credentials → OAuth client ID** (tipo **Web application**)
   - **Authorized JavaScript origins**: `https://<ref>.supabase.co` (URL del progetto Supabase, es. `https://umnvmlfzclkuorwnevpu.supabase.co`)
   - **Authorized redirect URIs**: `https://<ref>.supabase.co/auth/v1/callback`
2. Supabase Dashboard → **Authentication → Providers → Google**: inserisci **Client ID** e **Client Secret**, salva.

### 3. Redirect URLs

OAuth Google, conferma email e recovery passano dalla route **`/auth/callback`**
(`src/app/auth/callback/route.ts`), che scambia il codice PKCE con una sessione
via `exchangeCodeForSession` e reindirizza alla destinazione (`next`). In
**Authentication → URL Configuration → Redirect URLs** aggiungi **entrambe** le
varianti del dominio: in produzione `agentcloud.agency` fa un redirect 308 verso
`www.agentcloud.agency`, quindi la variante `www` è quella effettivamente usata
(il client costruisce `redirectTo` da `window.location.origin`):

```
https://www.agentcloud.agency/auth/callback
https://agentcloud.agency/auth/callback
http://localhost:3000/auth/callback   (per lo sviluppo)
```

- Login Google → `redirectTo: /auth/callback`
- Conferma signup → `emailRedirectTo: /auth/callback?next=/dashboard`
- Reset password → `resetPasswordForEmail` → `/auth/callback?next=/reset-password`

### 4. Sito/email

- In **Authentication → URL Configuration** imposta il **Site URL**: `https://www.agentcloud.agency`
  (o `https://agentcloud.agency`: il redirect 308 verso `www` continua a funzionare, ma il valore
  canonico evita redirect superflui nei link delle email)
- Per le email transazionali di Supabase (conferma account) personalizza il mittente con un dominio verificato (Auth → SMTP o Branding)

## Variabili d'ambiente

```env
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...   # server-side (billing, usage, rate limits)
```

Non serve alcuna chiave OAuth nel frontend: il flusso Google è gestito interamente da Supabase.

## Route protette

| Route | Comportamento |
|-------|---------------|
| `/dashboard`, `/chat`, `/agent/[id]` | redirect a `/login` se non autenticati |
| `/api/billing/portal` | **401 JSON** se non autenticati (API) |
| `/auth/callback` | pubblica — scambia il codice PKCE e redirige |
| `/api/agent/run` | anonimo = preview; autenticato = limiti abbonamento |
| API pubbliche / webhook | senza sessione (token admin o firma webhook) |

## Database

`supabase/schema.sql` (rieseguibile) include:
- `profiles` (id → `auth.users`, email, full_name, stripe_customer_id) + **trigger `handle_new_user`**
- RLS: gli utenti vedono/aggiornano solo il proprio profilo; il service role gestisce tutto

## Waitlist → utenti già registrati

Chi inserisce l'email nella waitlist viene **subito registrato in Supabase Auth**: il
route `/api/waitlist` crea l'utente con `auth.admin.createUser` (email confermata,
password casuale mai rivelata, `user_metadata.source = "waitlist"`), quindi compare in
**Authentication → Users** e il trigger `handle_new_user` crea anche la riga in
`profiles`. All'apertura della piattaforma queste persone sono già utenti:
- **Login con Google** (stessa email) → Supabase collega l'account automaticamente
- **Password dimenticata** → impostano una password propria e accedono

Se l'email è già registrata (es. un utente che aveva già un account) la creazione viene
saltata senza errori: l'iscrizione alla waitlist riesce comunque.

### Posti rimanenti

Il contatore dei posti (`getRemainingSpots`) conta gli **utenti in Supabase Auth**
(Authentication → Users): ogni utente = una persona = un posto. Quindi:
- a ogni iscrizione alla waitlist viene creato subito l'utente Auth → il posto cala;
- **cancellare un utente in Authentication → Users libera subito il posto** (il modo
  più semplice per ripulire iscrizioni di test/spam);
- la tabella `waitlist` è il registro delle email (serve per il controllo "già
  iscritto" e come backup): le righe senza utente Auth corrispondente vengono
  ripulite automaticamente al conteggio.

Il backfill è **automatico e solo per le nuove iscrizioni**: la creazione dell'utente
Auth avviene dentro `POST /api/waitlist`, al momento dell'iscrizione — le email
storiche in tabella non vengono toccate.

## Migrazione da Clerk

> ⚠️ Gli ID utente cambiano: Clerk usava `user_2…`, Supabase usa UUID (`auth.users.id`).
> Le righe esistenti di `user_agents` / `subscriptions` / `agent_runs` riferite agli ID Clerk
> **non** corrispondono ai nuovi utenti Supabase. Prima del lancio, in produzione:
> 1. Chiedi agli utenti di rifare l'accesso (o crea una mappatura email → nuovo UUID)
> 2. Aggiorna `user_agents.user_id` / `subscriptions.user_id` con i nuovi UUID
> 3. Il webhook Stripe riscriverà le righe corrette al prossimo evento

## Troubleshooting

- **Google login non parte**: verifica Client ID/Secret e gli Authorized redirect URIs in Google Cloud Console (deve finire con `/auth/v1/callback` del tuo progetto Supabase)
- **"Invalid login credentials"**: email non confermata (controlla la casella spam) o password errata
- **La navbar non vede la sessione**: la sessione Supabase è in cookie `sb-…-auth-token`; dopo il login il client aggiorna via `onAuthStateChange`. Se il cookie è mancante, controlla che `NEXT_PUBLIC_SUPABASE_ANON_KEY` punti al progetto giusto
- **Redirect dopo Google**: controlla i **Redirect URLs** nel dashboard Supabase
- **"Error 403: redirect_uri_mismatch"**: la URL di redirect nel Google Cloud Console non è `https://<ref>.supabase.co/auth/v1/callback` (quella di Supabase, non il tuo dominio)
- **Redirect URLs non accettati da Supabase**: in produzione la variante effettiva è `www` (redirect 308 da `agentcloud.agency`); se manca `https://www.agentcloud.agency/auth/callback` il flusso fallisce con "Invalid redirect"
