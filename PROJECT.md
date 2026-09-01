# AgentCloud

**v0.5.0** — Piattaforma di agenti AI: marketplace, chat, dashboard, billing Stripe con overage, backend Gemini, Shopify OAuth multi-tenant e i18n IT/EN.

---

## Stack

- **Next.js 16.2.9** (Turbopack) — framework
- **React 19.2.4** — UI
- **Tailwind CSS v4** — styling (`@theme`-based)
- **TypeScript ^5** — type safety
- **Supabase Auth** — autenticazione (email + password, Google OAuth, sessioni `@supabase/ssr`)
- **Supabase** — database (billing, usage, rate limits) + form storage
- **Stripe** — payment links, abbonamenti, customer portal, **overage billing** (Billing Meter)
- **Google Gemini** — backend LLM unico (agenti `/api/agent/run`, chat `/api/chat`)
- **Resend** — email transazionali
- **Simple Icons** — icone brand originali (integrazioni/hero) · **Lucide** — icone UI

---

## Struttura (sintesi)

```
src/
├── proxy.ts                 # Supabase session middleware (route pubbliche vs protette)
├── app/
│   ├── layout.tsx           # Metadata dinamici, LanguageProvider
│   ├── page.tsx             # Homepage (hero + sezioni landing)
│   ├── dashboard/page.tsx   # Dashboard (server component, dati reali Supabase)
│   ├── chat/page.tsx        # Chat generica (Gemini → fallback locale)
│   ├── agents/page.tsx      # Marketplace filtrato dai feature flags
│   ├── agents/[slug]/page.tsx        # Dettaglio agente (localizzato)
│   ├── agents/[slug]/deploy/page.tsx # Wizard di deploy
│   ├── agent/[id]/page.tsx  # Chat di un agente (protetto)
│   ├── a/[slug]/            # Pagina pubblica agente + chat embed
│   ├── login | signup | waitlist | demo | contact | privacy | terms
│   └── api/
│       ├── agent/run/       # POST — esecuzione agente (Gemini) + tool, limiti e rate limit
│       ├── billing/webhook/ # POST — webhook Stripe (attivazione, rinnovo, cancellazione)
│       ├── billing/payment-link/ · billing/portal/ · billing/notify-expiring/
│       ├── checkout/        # Stripe Checkout Session (prezzo dinamico da priceCents)
│       ├── admin/           # Admin API (Bearer ADMIN_API_TOKEN)
│       ├── email/send/      # Admin-only (Bearer ADMIN_API_TOKEN)
│       ├── email/webhook/ · whatsapp/webhook/ · chat/ · embed/[slug]/
│       ├── notifications/   # Campanella in-app (elenco + read per il badge)
│       ├── shopify/         # OAuth multi-tenant install/callback/webhooks/status
│       └── waitlist | contact | demo/request | sitemap
├── components/              # Navbar, Hero, sezioni landing, ChatInterface, AgentCard…
└── lib/
    ├── i18n/                # dictionaries (it/en), locale, api-errors, agentCatalog
    ├── billing/             # pricing, usage-tracking (limiti token, overage)
    ├── stripe/              # overage (meter), webhook-helpers
    ├── agents/              # registry runtime, feature-flags, tools
    ├── rate-limit.ts        # Rate limiting distribuito (Supabase RPC)
    ├── request-ip.ts        # Client IP condiviso
    └── site-url.ts          # getSiteUrl() — unica fonte della URL pubblica
```

---

## Routes

| Path | Pagina | Accesso |
|------|--------|---------|
| `/` | Homepage | Pubblico |
| `/agents`, `/agents/[slug]`, `/agents/[slug]/deploy` | Marketplace / dettaglio / deploy | Pubblico |
| `/a/[slug]` | Chat pubblica agente (embed) | Pubblico |
| `/waitlist`, `/demo`, `/contact`, `/privacy`, `/terms`, `/login`, `/signup` | Landing/legal/auth | Pubblico |
| `/chat` | Chat generica | Protetto (Supabase) |
| `/agent/[id]` | Chat agente | Protetto (Supabase) |
| `/dashboard` | Dashboard | Protetto (Supabase) |

**API pubbliche**: `agent/run` (anon limitato), `billing/webhook`, `billing/payment-link`, `checkout`, `email/webhook`, `email/send` (Bearer admin), `whatsapp/webhook`, `chat`, `embed/[slug]`, `notifications`, `shopify/install`, `shopify/callback`, `shopify/webhooks`, `shopify/status`, `admin/tenants` (Bearer admin), `waitlist`, `contact`, `demo/request`, `sitemap`.
**API protette (Supabase)**: `billing/portal` (ri-verifica sessione + redirect a login).

---

## Design System

### Brand Colors
- **brand**: `#038bfe` (blu primario) — bottoni, link, gradienti
- **pink**: `#e879a8` · **purple**: `#c084fc` · **orange**: `#f97316` · **indigo**: `#a78bfa`
- **neutral**: grigi — testo, bordi, background

### Layout
- `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` · sezioni `py-24` · `rounded-xl/2xl/full`
- Landing e pagine interne su **dark** (`bg-neutral-950`); deploy su light

### Font
- Primary: **Manrope** (400–900) · Fallback: **Inter**

### Animazioni
- `fade-in-up`, `fade-in-left`, `fade-in-right`, `scale-in` via `useInView`
- Stagger `animate-stagger-1..6` (80ms) · typing indicator `typing-pulse`

---

## i18n

- **Default italiano**, switch IT/EN nella navbar (cookie `agentcloud_locale`, URL invariati).
- Dizionari `it`+`en` in `src/lib/i18n/dictionaries.ts` (`Dictionary = typeof it`, test di allineamento delle shape).
- Overlay italiani per tutto il catalogo agenti in `agentCatalog.ts` + `localizeAgent`.
- Errori delle API localizzati via `src/lib/i18n/api-errors.ts` (legge la stessa cookie).

## Autenticazione

- **Supabase Auth** (email + password e Google OAuth) — guida completa in `SUPABASE_AUTH.md`.
- Sessioni SSR con `@supabase/ssr`: `src/lib/supabase/server.ts` (server), `client.ts` (browser), proxy in `src/proxy.ts`.
- `profiles` popolati automaticamente dal trigger `handle_new_user` (vedi `schema.sql`).
- ID utente = UUID `auth.users.id` (niente più `user_2…` di Clerk).

---

## Billing

- **Payment links Stripe** → webhook `checkout.session.completed` attiva la subscription e crea le righe in `subscriptions` + `user_agents`.
- **Limiti sui token** (input+output) mensili per agente (`tokenLimit` in config).
- **Overage billing**: oltre l'allowance i token extra vanno al Billing Meter (`agentcloud_token_overage`, €0,30/1.000) finché non si raggiunge il **cap di sicurezza a 2x** (429).
- **Cancellazione self-service** via Customer Portal (`/api/billing/portal`); `cancel_at_period_end` mostrato nel dashboard; alla scadenza il webhook passa gli agenti a `canceled` (blocco 402).
- Senza `STRIPE_OVERAGE_PRICE_ID` l'overage è disabilitato: si torna al blocco 429 al plafond.

---

## Rate limiting (distribuito)

Backed da **Supabase** (tabella `rate_limits` + RPC atomici) — vale su tutte le istanze, a differenza dei limiti in-memory.

| Endpoint | Limite | Note |
|----------|--------|------|
| `/api/agent/run` (anonimi) | **30/min per IP** | burst filter in-memory + limite distribuito; header `Retry-After` |
| `/api/contact` | **5/h per IP** | 429 localizzato |
| `/api/demo/request` | **5/h per IP** | 429 localizzato |
| `/api/waitlist` | **3/h per IP** | email comunque deduplicata dal DB |

- **Fail-open**: se il DB non è raggiungibile la richiesta passa (un guasto al rate limiter non blocca mai il traffico).
- La pulizia delle finestre scadute avviene opportunisticamente (~1% delle chiamate).

---

## Database

Schema completo in `supabase/schema.sql` (rieseguibile: idempotente). **Dopo il deploy va rieseguito** per creare le nuove tabelle. Per la fase waitlist esiste `supabase/schema-waitlist.sql`; le tabelle dell'OAuth Shopify (`shopify_connections`) vivono in `supabase/schema-shopify-oauth.sql` (vedi sezione Shopify).

| Tabella | Scopo |
|---------|-------|
| `profiles` | Profilo utente + `stripe_customer_id` |
| `agents_registry` | Mirror server-side del catalogo |
| `subscriptions` | Ledger Stripe (una riga per subscription × agente) |
| `user_agents` | Ownership autoritativa (limiti e stato per utente × agente) |
| `agent_runs` | Log di esecuzione + conteggio token |
| `demo_requests`, `waitlist` | Form pubblici |
| `agent_notifications` | Azioni importanti compiute dagli agenti (file creato, prodotto pubblicato, evento prenotato, lead catturato…) — campanella in-app, `read` per il badge |
| **`rate_limits`** | **Bucket del rate limiting distribuito** — PK `(bucket, key, window_start)`, RLS deny-all (solo service role) |

**RPC rate limits** (definiti in `schema.sql`):
- `bump_rate_limit(p_bucket, p_key, p_window_start) → int` — incremento atomico (`insert … on conflict … count+1`), ritorna il nuovo contatore.
- `cleanup_rate_limits(p_older_than) → void` — elimina le finestre scadute.

Auth: gli utenti sono gestiti da **Supabase Auth** (UUID di `auth.users.id`, colonne `user_id text`); l'app legge/scrive col **service role** e le policy RLS restano come difesa in profondità.

---

## Environment Variables (produzione)

### Client (`NEXT_PUBLIC_*`)

| Variabile | Obbligatoria | Note |
|-----------|:---:|------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | |
| `NEXT_PUBLIC_SITE_URL` | ✅ (prod) | canonical/sitemap/robots/embed/WhatsApp/portal. Fallback: `NEXT_PUBLIC_URL` → `http://localhost:3000` |
| `NEXT_PUBLIC_URL` | legacy | fallback di `NEXT_PUBLIC_SITE_URL` (mantenuto per compatibilità) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | – | documentata ma non ancora usata nel codice |

### Server — core

| Variabile | Obbligatoria | Note |
|-----------|:---:|------|
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | usata per billing/usage/rate limits |
| `GEMINI_API_KEY` | ✅ | esecuzione agenti (backend Gemini) |
| `RESEND_API_KEY` | ✅ | email transazionali |
| `STRIPE_SECRET_KEY` | ✅ | prod: `sk_live_…` |
| `STRIPE_WEBHOOK_SECRET` | ✅ | `whsec_…` |
| `STRIPE_OVERAGE_PRICE_ID` | ⚠️ | senza → overage disabilitato (blocco 429 al plafond) |
| `STRIPE_OVERAGE_METER_EVENT` | – | default `agentcloud_token_overage` |
| `ADMIN_API_TOKEN` | ✅ | admin API + `email/send` (fail-closed se assente) |
| `DEMO_EMAIL_TO` | – | default `info@agentcloud.io` |

### Stripe Payment Links

| Variabile | Note |
|-----------|------|
| `STRIPE_PAYMENT_LINK_<AGENTE_UPPER>` | una per agente del catalogo (slug → `_` maiuscolo, es. `STRIPE_PAYMENT_LINK_EXECUTIVE_ASSISTANT`) |
| `STRIPE_PAYMENT_LINK_<VERTICAL>_<TIER>` | piani: `SHOPIFY_STARTER`, `SHOPIFY_GROWTH`, `SERVICES_STARTER`, `SERVICES_GROWTH` |

### Tools / integrazioni (solo se attivi)

| Variabile | Uso |
|-----------|-----|
| `SHOPIFY_SHOP_DOMAIN`, `SHOPIFY_ADMIN_ACCESS_TOKEN` | tool Shopify |
| `GOOGLE_CALENDAR_ACCESS_TOKEN`, `GOOGLE_CALENDAR_CALENDAR_ID`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | tool Calendar |
| `LEAD_CAPTURE_ENDPOINT`, `LEAD_CAPTURE_ENRICH_ENDPOINT`, `SLACK_WEBHOOK_URL` | tool Lead capture |
| `WHATSAPP_API_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN` | webhook WhatsApp |
| `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `SHOPIFY_SCOPES` | OAuth multi-tenant dell'App pubblica Shopify (vedi sezione Shopify) |
| `TENANT_STORE_KEY` | cifratura tenant store — **mai usare il default `dev-tenant-key` in prod** (store su filesystem: non persistente su serverless) |

### Runtime / feature flags

| Variabile | Default | Note |
|-----------|---------|------|
| `AGENT_LLM_PROVIDER` | `gemini` | backend del runtime agenti (unico supportato: Gemini). Default: Gemini se `GEMINI_API_KEY`/`GOOGLE_API_KEY` è valida |
| `AGENT_LLM_MODEL` | `gemini-3.6-flash` | modello usato dal backend Gemini quando non specificato per-request |
| `AGENT_MAX_TOKENS` | `4096` | max_tokens per chiamata LLM (Gemini) |
| `AGENT_ANON_RATE_LIMIT` | `30` | richieste/min per IP per i preview anonimi |
| `AGENTCLOUD_VERTICAL` | `shopify` | `shopify` \| `services` \| `full` — filtra marketplace e tool |
| `AGENTCLOUD_FEATURE_FLAGS` | – | JSON: `enabledAgents`, `enabledTools`, `agentToolOverrides`, `enableOptionalToolsByDefault` |

> **Checklist produzione** (dettagli in `SUPABASE_AUTH.md`, `STRIPE_SETUP.md`, `FEATURE_FLAGS.md`, `PRICING.md`):
> Google OAuth configurato in Supabase, webhook Stripe con i 4 eventi (`checkout.session.completed`, `invoice.paid`, `customer.subscription.updated`, `customer.subscription.deleted`), metered price per l'overage, `NEXT_PUBLIC_SITE_URL` valorizzata, dominio email verificato su Resend, riesecuzione di `supabase/schema.sql` (incluso il trigger `handle_new_user`).

---

## Comandi

```bash
npm run dev       # sviluppo
npm run build     # build produzione (con typecheck)
npm run start     # avvio produzione
npm run lint      # ESLint
npm run test      # Vitest (149 test)
npm run typecheck # tsc --noEmit

---

## Shopify (OAuth multi-tenant) — distribuzione PUBLIC APP

Il codice (`src/lib/shopify/*`, `/api/shopify/*`) supporta un'app **pubblica**
installabile da qualsiasi merchant. Passi manuali nel **Shopify Partner Dashboard**
(non automatizzabili da codice):

1. **App setup → App URL** = `NEXT_PUBLIC_URL`; in **Allowed redirection URLs**
   aggiungi `https://<host>/api/shopify/callback`.
2. Imposta la **distribuzione su "Public"** e invia l'app per la **review Shopify**.
3. **Scopes**: quelli in `SHOPIFY_SCOPES` (default: read/write products, orders,
   inventory). Chiedi solo ciò che serve.
4. **Webhook**: l'endpoint `https://<host>/api/shopify/webhooks` è
   **auto-registrato** a ogni install (APP_UNINSTALLED + 3 GDPR). In alternativa
   configurali nel Dashboard.
5. Inserisci **privacy policy** e **termini** richiesti da Shopify.
6. Usa `SHOPIFY_API_KEY` / `SHOPIFY_API_SECRET` del Partner Dashboard.

Flusso runtime: `/api/shopify/install` (CSRF state + redirect) →
`/api/shopify/callback` (verifica HMAC + exchange token, cifrato AES-256-GCM in
`shopify_connections`) → i tool dell'agente leggono il token cifrato e lo
revocano su 401 (APP_UNINSTALLED / shop/redact). La tabella
`shopify_connections` è creata da `supabase/schema-shopify-oauth.sql`
(rieseguire dopo il deploy).
```
