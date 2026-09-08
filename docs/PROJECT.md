# AgentCloud

**v0.6.0** — Piattaforma di agenti AI: marketplace, chat, dashboard, billing **Stripe + PayPal** (Klarna/Amazon Pay) con overage, **42 integrazioni** (8 disponibili + 34 Prossimamente), backend Claude (Anthropic), **Shopify + Google OAuth multi-tenant + generic integrations (Stripe/Notion/Slack/HubSpot/Google Sheets)**, account unificato e i miei abbonamenti, i18n IT/EN.

---

## Stack

- **Next.js 16.2.9** (Turbopack) — framework
- **React 19.2.4** — UI
- **Tailwind CSS v4** — styling (`@theme`-based)
- **TypeScript ^5** — type safety
- **Supabase Auth** — autenticazione (email + password, Google OAuth, sessioni `@supabase/ssr`)
- **Supabase** — database (billing, usage, rate limits, `tenant_integrations`) + form storage
- **Stripe + PayPal** — payment links, abbonamenti, customer portal, **overage billing** (Billing Meter), **Klarna** e **Amazon Pay** abilitati su Stripe Checkout
- **Anthropic Claude** — backend LLM unico (agenti `/api/agent/run`, chat `/api/chat`), risposte in **streaming parola per parola** + indicatore *Sta lavorando su* app collegata
- **Resend** — email transazionali
- **Simple Icons** — icone brand originali (42 integrazioni/hero) · **Lucide** — icone UI

---

## Struttura (sintesi)

```
src/
├── proxy.ts                 # Supabase session middleware (route pubbliche vs protette, waitlist-only)
├── app/
│   ├── layout.tsx           # Metadata dinamici, LanguageProvider + CartProvider
│   ├── page.tsx             # Homepage (hero + sezioni landing)
│   ├── dashboard/page.tsx   # Dashboard (server, dati reali Supabase)
│   ├── dashboard/integrations/page.tsx # Integrazioni 42 app (generic OAuth, stato connesso, tenant_integrations)
│   ├── dashboard/subscriptions/page.tsx # I miei abbonamenti (attivi, storico, Stripe portal + PayPal)
│   ├── chat/page.tsx        # Chat generica (Claude + indicatore Sta lavorando su app collegata)
│   ├── agents/page.tsx      # Marketplace filtrato dai feature flag
│   ├── agents/[slug]/page.tsx        # Dettaglio agente (localizzato, già acquistato → Apri in chat)
│   ├── agents/[slug]/deploy/         # Gate server + wizard client (connesso via integrations status API)
│   ├── agent/[id]/page.tsx  # Chat di un agente (protetto)
│   ├── a/[slug]/            # Pagina pubblica agente + chat embed
│   ├── account/page.tsx     # Account unificato (profilo + piano + connessioni + impostazioni) — /settings redirect
│   ├── cart/page.tsx        # Carrello (agenti + bundle, svuota fixato, badge rosso)
│   ├── bundles/page.tsx     # Bundle con pricing coerente (sconti 12/22/35%)
│   ├── login | signup | waitlist | demo | contact | privacy | terms
│   └── api/
│       ├── agent/run/       # POST — esecuzione agente (Claude) + tool, limiti e rate limit
│       ├── billing/webhook/ # POST — webhook Stripe (attivazione, rinnovo, cancellazione)
│       ├── billing/paypal/create|webhook/ # PayPal Billing Subscriptions (mirror Stripe)
│       ├── billing/payment-link/ · billing/portal/ · billing/notify-expiring/
│       ├── checkout/        # Stripe Checkout Session (prezzo dinamico, Klarna/Amazon Pay)
│       ├── cart/ · cart/checkout/ # Carrello multi-agente (Stripe Checkout con Klarna/Amazon Pay)
│       ├── integrations/[provider]/{authorize,callback,disconnect} + status # Generic OAuth 5 provider + Edge Functions proxy
│       ├── user/owned/      # GET owned slugs per badge Già acquistato
│       ├── admin/           # Admin API (Bearer ADMIN_API_TOKEN)
│       ├── email/send/      # Admin-only
│       ├── notifications/   # Campanella (elenco + read)
│       ├── shopify/ · google/ # OAuth multi-tenant legacy (shopify_connections, google_connections)
│       └── waitlist | contact | demo/request | sitemap
├── components/              # Navbar (cart icon-only prima di campanella, pannelli link migliorati), ChatInterface (working-on), AgentCard (Già acquistato), IntegrationsGrid (42), BundleCard, CartProvider…
└── lib/
    ├── i18n/                # dictionaries (it/en), locale, api-errors, agentCatalog
    ├── billing/ · stripe/ · paypal/ # pricing, overage, PayPal REST (sandbox/live)
    ├── agents/ · integrations/ # registry, feature-flags, generic providers (stripe/notion/slack/hubspot/google_sheets) + Edge Functions _shared
    ├── brands.ts            # 42 brand (simple-icons + custom Microsoft)
    ├── integrations.ts      # Catalogo 42 integrazioni (8 disponibili + 34 Prossimamente: Microsoft/Google suite)
    └── site-url.ts          # getSiteUrl()
```

---

## Routes

| Path | Pagina | Accesso |
|------|--------|---------|
| `/` | Homepage | Pubblico |
| `/agents`, `/agents/[slug]`, `/agents/[slug]/deploy` | Marketplace / dettaglio / deploy | Pubblico |
| `/a/[slug]` | Chat pubblica agente (embed) | Pubblico |
| `/waitlist`, `/demo`, `/contact`, `/privacy`, `/terms`, `/login`, `/signup` | Landing/legal/auth | Pubblico |
| `/chat` | Chat generica (con indicatore app collegata) | Protetto (Supabase) |
| `/agent/[id]` | Chat agente | Protetto (Supabase) |
| `/dashboard` | Dashboard | Protetto |
| `/dashboard/integrations` | Integrazioni 42 app (generic OAuth) | Protetto |
| `/dashboard/subscriptions` | I miei abbonamenti (attivi, storico) | Protetto |
| `/account` | Account unificato (profilo + impostazioni) — `/settings` redirect | Protetto |
| `/cart`, `/bundles` | Carrello + Bundle (pricing coerente) | Pubblico (carrello sync) |

**API pubbliche**: `agent/run` (anon limitato), `billing/webhook`, `billing/paypal/webhook`, `billing/payment-link`, `checkout`, `cart`, `cart/checkout` (Klarna/Amazon Pay), `user/owned`, `email/webhook`, `email/send` (Bearer admin), `whatsapp/webhook`, `chat`, `embed/[slug]`, `notifications`, `shopify/install`, `shopify/callback`, `shopify/webhooks`, `shopify/status`, `admin/tenants` (Bearer admin), `waitlist`, `contact`, `demo/request`, `sitemap`.
**API protette (Supabase)**: `billing/portal`, `billing/paypal/create` (ri-verifica sessione), `integrations/[provider]/{authorize,callback,disconnect,status}` (generic OAuth, signed state).

---

## Design System

### Brand Colors
- **brand**: `#038bfe` (blu primario) — bottoni, link, gradienti
- **pink**: `#e879a8` · **purple**: `#c084fc` · **orange**: `#f97316` · **indigo**: `#a78bfa`
- **neutral**: grigi — testo, bordi, background

### Layout
- `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` · sezioni `py-24` · `rounded-xl/2xl/full`
- **Ultra-wide (≥1920px)**: breakpoint custom `3xl` (`--breakpoint-3xl` in `globals.css`) — contenitori principali fino a `3xl:max-w-[1720px]`, griglie marketplace/features a 4 colonne; sotto i 1920px i layout restano invariati
- Landing e pagine interne su **dark** (`bg-neutral-950`); deploy su light

### Font
- Primary: **Manrope** (400–900) · Fallback: **Inter**

### Animazioni
- `fade-in-up`, `fade-in-left`, `fade-in-right`, `scale-in` (reveal on scroll)
- Stagger `animate-stagger-1..6` (80ms) · typing indicator `typing-pulse`

---

## i18n

- **Default inglese**, switch EN/IT nella navbar (cookie `agentcloud_locale`, URL invariati).
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

- **Stripe + PayPal** — Checkout Session dinamico (`priceCents` agente) con **Klarna** e **Amazon Pay** abilitati (`payment_method_types: card,klarna,amazon_pay` in `checkout` e `cart/checkout`), Payment links via `billing/payment-link`, PayPal Billing Subscriptions via `billing/paypal/create` + webhook `billing/paypal/webhook` (mirror Stripe su `subscriptions`/`user_agents`, `config.paypal`).
- **Attivazione:** webhook `checkout.session.completed` (Stripe) / `BILLING.SUBSCRIPTION.ACTIVATED` (PayPal) → `subscriptions` + `user_agents` (status `active`, `current_period_end`), carrello svuotato, badge *Già acquistato* + bottone *Apri in chat* su marketplace/dettaglio.
- **Limiti token** mensili per agente (`tokenLimit`).
- **Overage:** oltre allowance → Billing Meter (`agentcloud_token_overage`, €0,30/1.000) fino a **cap 2x** (429).
- **Gestione:** `I miei abbonamenti` (`/dashboard/subscriptions`) + Customer Portal Stripe (`/api/billing/portal`), PayPal via dashboard PayPal; `cancel_at_period_end` visibile; webhook `canceled` → `user_agents` `canceled`.
- Senza `STRIPE_OVERAGE_PRICE_ID` overage disabilitato (429 al plafond).

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

Schema in `supabase/schema.sql` + `supabase/schema-shopify-oauth.sql` + `supabase/schema-google-oauth.sql` + `supabase/schema-integrations.sql` (unica fonte, rieseguibile). **Migrations folder rimossa** (`supabase/migrations/` ignorata via `.gitignore`) — single-file schema. Dopo deploy **rieseguire** gli schema.

| Tabella | Scopo |
|---------|-------|
| `profiles` | Profilo utente + `stripe_customer_id` |
| `agents_registry` | Mirror server-side del catalogo |
| `subscriptions` | Ledger Stripe/PayPal (una riga per subscription × agente, `stripe_subscription_id` riusato per PayPal `I-...`) |
| `user_agents` | Ownership autoritativa (limiti e stato per utente × agente, `config.paypal` per PayPal) |
| `agent_runs` | Log + conteggio token |
| `demo_requests`, `waitlist` | Form pubblici |
| `agent_notifications` | Azioni agenti — campanella, `read` badge |
| `shopify_connections` | OAuth Shopify multi-tenant (AES-256-GCM, `user_id text` per `__tenant__`) |
| `google_connections` | OAuth Google (Gmail/Calendar) multi-tenant |
| `tenant_integrations` | **Generic 5 provider** (`stripe,notion,slack,hubspot,google_sheets`) — `tenant_id text` (uuid o `__tenant__` per admin via code), `unique(tenant_id,provider)`, RLS `auth.uid()::text = tenant_id`, cifratura app-level, `metadata` |
| `carts`, `cart_items` | Carrello (uno `active` per utente, bundle gestiti via `localStorage` + merge, `status` converted) |
| **`rate_limits`** | Bucket rate limiting — PK `(bucket, key, window_start)`, RLS deny-all |

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
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | billing/usage/rate limits + `tenant_integrations` |
| `ANTHROPIC_API_KEY` | ✅ | Claude |
| `RESEND_API_KEY` | ✅ | email |
| `STRIPE_SECRET_KEY` | ✅ | `sk_live_…` |
| `STRIPE_WEBHOOK_SECRET` | ✅ | `whsec_…` |
| `STRIPE_OVERAGE_PRICE_ID` | ⚠️ | senza → overage disabilitato |
| `STRIPE_OVERAGE_METER_EVENT` | – | default `agentcloud_token_overage` |
| `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` | – (se PayPal attivo) | `BAA_...`/`EJk...` live, `BAAR...` sandbox, REST `PAYPAL_MODE=sandbox|live` |
| `PAYPAL_WEBHOOK_ID` | – | `53242420YL...` / `WH-...` |
| `ADMIN_API_TOKEN` | ✅ | admin API |
| `ACCESS_CODE` | – | waitlist (sblocca tutti gli agenti) |
| `DEMO_EMAIL_TO` | – | default `info@agentcloud.io` |

### Stripe Payment Links & Billing

| Variabile | Note |
|-----------|------|
| `STRIPE_PAYMENT_LINK_<AGENTE_UPPER>` | una per agente (es. `STRIPE_PAYMENT_LINK_SHOPIFY_AGENT`) — se assente, checkout dinamico `priceCents` |
| `STRIPE_PAYMENT_LINK_<VERTICAL>_<TIER>` | piani verticali |
| `PAYPAL_PLAN_<AGENTE_UPPER>` | opzionale: `P-...` PayPal Billing Plan già creato, altrimenti creato al volo via `lib/paypal/client` |
| Checkout | `payment_method_types: card,klarna,amazon_pay` su `checkout` e `cart/checkout` (Klarna/Amazon Pay abilitati via Dashboard + codice) |

### Tools / integrazioni (solo se attivi)

| Variabile | Uso |
|-----------|-----|
| `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `SHOPIFY_SCOPES`, `SHOPIFY_REDIRECT_URI`, `SHOPIFY_WEBHOOK_ADDRESS`, `SHOPIFY_TOKEN_ENCRYPTION_KEY` | OAuth Shopify (public app) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `GOOGLE_TOKEN_ENCRYPTION_KEY`, `GOOGLE_SCOPES` (= `gmail.modify calendar spreadsheets`) | OAuth Google (Gmail/Calendar/Sheets) |
| `STRIPE_CONNECT_CLIENT_ID` (`ca_...`), `NOTION_OAUTH_CLIENT_ID/SECRET` (`3d5d87...`), `SLACK_CLIENT_ID/SECRET` + `SLACK_SIGNING_SECRET`, `HUBSPOT_CLIENT_ID/SECRET` (`575f16...`), `GOOGLE_SHEETS` riusa Google client | Generic 5 provider (`tenant_integrations`, Edge Functions proxy) — vedi `docs/integrations-setup.md` |
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | JS SDK PayPal (client, non secret) |
| `LEAD_CAPTURE_ENDPOINT`, `SLACK_WEBHOOK_URL` | Lead capture (opzionale) |
| `WHATSAPP_API_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN` | WhatsApp (opzionale) |
| `TENANT_STORE_KEY` + `INTEGRATIONS_TOKEN_ENCRYPTION_KEY` / `GOOGLE_TOKEN_ENCRYPTION_KEY` | Cifratura AES-256-GCM app-level per `shopify_connections`, `google_connections`, `tenant_integrations` — mai `dev-tenant-key` in prod |

### Runtime / feature flags

| Variabile | Default | Note |
|-----------|---------|------|
| `AGENT_LLM_PROVIDER` | `anthropic` | backend del runtime agenti (unico supportato: Anthropic). Default: Anthropic se `ANTHROPIC_API_KEY` è configurata |
| `AGENT_LLM_MODEL` | `claude-sonnet-5` | modello usato dal backend Claude quando non specificato per-request |
| `AGENT_MAX_TOKENS` | `4096` | max_tokens per chiamata LLM (Claude) |
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
npm run test      # Vitest (162 test)
npm run typecheck # tsc --noEmit
```

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

---

## Google (Gmail + Calendar + Sheets) — OAuth multi-tenant

Gmail/Calendar/Sheets (stesso pattern Shopify: token AES-256-GCM in `google_connections` per Gmail/Calendar e `tenant_integrations` `google_sheets` per Sheets, RLS `auth.uid()::text = tenant_id` con `__tenant__` per admin via code). Codice `src/lib/google/*` + `src/lib/integrations/providers/googleSheets.ts`:

1. **Google Cloud Console** → OAuth consent screen (External), abilita **Gmail API**, **Calendar API**, **Sheets API**.
2. **Credentials → OAuth client ID** (Web): **Authorized redirect URIs** `https://<host>/api/auth/google/callback` (Gmail/Calendar) e `https://<host>/api/integrations/google_sheets/callback` (Sheets, ma per admin riusa il primo già whitelistato).
3. Scope: `gmail.modify`, `calendar`, `spreadsheets` (override `GOOGLE_SCOPES` = `gmail.modify calendar spreadsheets`).
4. Env: `GOOGLE_CLIENT_ID/SECRET`, `GOOGLE_REDIRECT_URI`, `GOOGLE_TOKEN_ENCRYPTION_KEY`, `INTEGRATIONS_TOKEN_ENCRYPTION_KEY`.

Flusso: `/api/auth/google/connect` (Gmail/Calendar) o `/api/integrations/google_sheets/authorize` (Sheets, per admin usa `__tenant__`) → callback → upsert cifrato. Refresh 5m (`lib/google/token.ts` e `supabase/functions/google-sheets-proxy`).

## Generic Integrations (Stripe/Notion/Slack/HubSpot/Google Sheets) — multi-tenant

Nuovo layer generico (separato da Shopify): tabella `tenant_integrations` (`tenant_id text` per `__tenant__`, `provider`, `status`, `access_token`/`refresh_token` cifrati, `unique(tenant_id,provider)`, RLS) + Edge Functions proxy (`supabase/functions/*-proxy`) + adapter `lib/integrations/providers/*` con interfaccia `IntegrationProvider`. Setup in `docs/integrations-setup.md` (5 provider, redirect `.../api/integrations/<provider>/callback`). UI: `/dashboard/integrations` (42 app, 8 disponibili + 34 Prossimamente, Microsoft/Google suite) e `/agents/[slug]` (card integrazioni con **Già connesso** se già in `tenant_integrations`).

Admin via codice (`ACCESS_CODE=T5PMY2R2`, `__tenant__`): nessun `auth.users`, connessioni su tenant condiviso, badge rimosso da `/account`, ma Google/Sheets ora funzionano anche da admin (fix `tenant_id text` + `hasPlatformAccess`).

## Billing — Stripe + PayPal

Stripe Checkout dinamico (`priceCents`) con **Klarna** e **Amazon Pay** (`payment_method_types: card,klarna,amazon_pay` su `checkout` e `cart/checkout`), PayPal Billing Subscriptions (`lib/paypal/client.ts` REST `sandbox|live` via `PAYPAL_MODE`, `PAYPAL_CLIENT_ID/SECRET`, `PAYPAL_WEBHOOK_ID=53242420YL...`) — `POST /api/billing/paypal/create` (riusa `PAYPAL_PLAN_*` o crea product/plan al volo) + webhook `POST /api/billing/paypal/webhook` mirror Stripe su `subscriptions`/`user_agents`. Gestione in **I miei abbonamenti** (`/dashboard/subscriptions`) + Stripe Customer Portal (`/api/billing/portal`).

## Account unificato + Carrello + Bundle

- **Account**: `/account` unifica profilo + piano/connessioni + impostazioni (lingua/notifiche/aspetto/privacy/dati) — `/settings` redirect a `/account`, nav `DashboardShell` aggiornata.
- **Carrello**: `CartProvider` con `localStorage` + `tenant_integrations` merge (bundle `bundle:slug` + `bundle_period_*`), badge rosso `bg-red-500` immediato, `Svuota carrello` pulisce anche `bundle_period_*`, checkout multi-agente `cart/checkout` con Klarna/Amazon Pay.
- **Bundle**: pricing coerente `calcPricing` con sconti `monthly 12% / quarterly 22% / yearly 35%` vs somma singoli (`€9,99/€14,99`), `BundleCard` `min-h-[100px] mode wait` senza overlap `AnimatedSavingsCounter`.
- **Marketplace**: `AgentCard` + `MarketplaceGrid` mostrano **Già acquistato** (emerald) e CTA **Apri in chat** (`/chat?agent=slug`) quando `user_agents` `status=active` (`GET /api/user/owned`), altrimenti `Aggiungi al carrello`.
