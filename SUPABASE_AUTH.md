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
   - **Authorized JavaScript origins**: `https://<tudominio>.supabase.co` (URL del progetto Supabase)
   - **Authorized redirect URIs**: `https://<tudominio>.supabase.co/auth/v1/callback`
2. Supabase Dashboard → **Authentication → Providers → Google**: inserisci **Client ID** e **Client Secret**, salva.

### 3. Redirect URLs

OAuth Google, conferma email e recovery passano dalla route **`/auth/callback`**
(`src/app/auth/callback/route.ts`), che scambia il codice PKCE con una sessione
via `exchangeCodeForSession` e reindirizza alla destinazione (`next`). In
**Authentication → URL Configuration → Redirect URLs** aggiungi:

```
https://tudominio.com/auth/callback
http://localhost:3000/auth/callback   (per lo sviluppo)
```

- Login Google → `redirectTo: /auth/callback`
- Conferma signup → `emailRedirectTo: /auth/callback?next=/dashboard`
- Reset password → `resetPasswordForEmail` → `/auth/callback?next=/reset-password`

### 4. Sito/email

- In **Authentication → URL Configuration** imposta il **Site URL**: `https://tudominio.com`
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
