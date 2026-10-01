# AgentCloud

Piattaforma di **agenti AI** per le aziende: marketplace di agenti pronti al lancio, chat, dashboard con monitoraggio token, abbonamenti Stripe con overage billing. **Default inglese** con switch IT dalla navbar.

## Funzionalità

- 🤖 **Marketplace agenti** — catalogo filtrato dai feature flags (verticale Shopify/Services/full)
- 💬 **Chat** — chat pubblica per agente (`/a/[slug]`), chat generica e widget embed, con risposte in streaming parola per parola
- 📊 **Dashboard** — agenti installati, utilizzo mensile token, stato abbonamento
- 💳 **Billing Stripe** — checkout dinamico, attivazione automatica via webhook, customer portal (cancellazione self-service), **overage billing** con tetto di sicurezza a 2x l'allowance
- 🌐 **i18n** — inglese di default, italiano via cookie `agentcloud_locale` (niente URL `/en`)
- 🔐 **Auth Supabase** — email + password e Google OAuth (sessioni `@supabase/ssr`)
- 🔑 **Accesso con codice** — durante la fase waitlist si entra con un codice di accesso (niente più email admin): elimina il vincolo del login (niente account Supabase) e sblocca **tutte** le pagine e **tutti** gli agenti, anche quelli “in arrivo”
- 🛡️ **Rate limiting distribuito** — Supabase (`rate_limits` + RPC), fail-open
- 🔌 **Shopify OAuth multi-tenant** — App pubblica installabile da qualsiasi merchant (install/callback/webhooks, token cifrati AES-256-GCM)
- 🔗 **Integrazioni generiche multi-tenant** — 7 provider (Notion, Slack, HubSpot, Google Sheets, GitHub, ClickUp, Asana) con OAuth e token cifrati in `tenant_integrations`; **10 app live** nel catalogo. Tool agente per GitHub/ClickUp/Asana (`lib/integrations/api-proxy.ts`) e Google Sheets (`lib/google/sheets.ts`) con chiamate **dirette** alle API: nessuna Edge Function proxy per le integrazioni

## Stack

Next.js 16 (Turbopack) · React 19 · Tailwind CSS v4 · TypeScript · Supabase (Auth + DB) · Stripe · Anthropic Claude · Resend · Vitest

## Avvio rapido

```bash
npm install
cp .env .env.local                 # adatta i valori: vedi docs/PROJECT.md → Environment Variables
npm run dev
```

## Script

| Comando | Scopo |
|---------|-------|
| `npm run dev` | sviluppo |
| `npm run build` | build produzione (con typecheck) |
| `npm run start` | avvio produzione |
| `npm run lint` | ESLint |
| `npm run test` | Vitest (162 test) |
| `npm run typecheck` | `tsc --noEmit` |

## Environment Variables

L'elenco completo e aggiornato è in **[docs/PROJECT.md → Environment Variables](docs/PROJECT.md#environment-variables-produzione)**. In sintesi per la produzione:

```env
# Supabase (Auth + DB)
NEXT_PUBLIC_SUPABASE_URL=…
NEXT_PUBLIC_SUPABASE_ANON_KEY=…
SUPABASE_SERVICE_ROLE_KEY=…

# Site URL (canonical, sitemap, embed, portal)
NEXT_PUBLIC_SITE_URL=https://tuodominio.com

# AI + Email
ANTHROPIC_API_KEY=sk-ant-…
RESEND_API_KEY=re_…

# Stripe (live!) — webhook e metered price (checkout dinamico)
STRIPE_SECRET_KEY=sk_live_…
STRIPE_WEBHOOK_SECRET=whsec_…
STRIPE_OVERAGE_PRICE_ID=price_…

# Admin
ADMIN_API_TOKEN=…

# Accesso fase waitlist — codice che sblocca la piattaforma e tutti gli agenti
# (default generato in src/lib/access-code.ts)
ACCESS_CODE=…

# Facoltativi: AGENTCLOUD_VERTICAL, tool Shopify/Calendar/Lead, SHOPIFY_API_KEY/SECRET/SCOPES, TENANT_STORE_KEY
```

## Database

Gli schemi Supabase sono separati per fase:

- **`supabase/schema-waitlist.sql`** — fase waitlist: registra solo l'utente (`profiles` + trigger auth), raccoglie le email (`waitlist`) e include `rate_limits` con le RPC per il rate limiting dell'endpoint waitlist.
- **`supabase/schema.sql`** — piattaforma completa (quando è disponibile): aggiunge agenti, billing/usage (`subscriptions`, `user_agents`, `agent_runs`), notifiche azioni agenti (`agent_notifications`), `waitlist`, `rate_limits` e il bootstrap di `agents_registry`.
- **`supabase/schema-shopify-oauth.sql`** — tabelle dell'OAuth multi-tenant Shopify (`shopify_connections`, token cifrati).
- **`supabase/schema-integrations.sql`** — layer generico multi-tenant (`tenant_integrations`, provider consentiti `notion/slack/hubspot/google_sheets/github/clickup/asana`, RLS).

Esegui lo schema scelto (Supabase SQL Editor o `supabase db push`) — **rieseguilo dopo ogni aggiornamento** (idempotente).

## Documentazione

Tutta la documentazione del progetto è raccolta in **`docs/`**:

- **[docs/PROJECT.md](docs/PROJECT.md)** — architettura complessiva, routes, stack tecnologico, billing, rate limiting, env vars
- **[docs/ECOSYSTEM.md](docs/ECOSYSTEM.md)** — architettura dell'ecosistema multi-piattaforma (Web, Mobile Flutter, Chrome Extension, CLI)
- **[docs/AGENT_CATALOG.md](docs/AGENT_CATALOG.md)** — catalogo completo degli agenti AI e relative capacità
- **[docs/integrations-setup.md](docs/integrations-setup.md)** — setup OAuth dei 7 provider generici, tool agente e chiamate dirette alle API (nessun Edge proxy)
- **[docs/FEATURE_FLAGS.md](docs/FEATURE_FLAGS.md)** — verticali, configurazioni e feature flags di AgentCloud
- **[docs/PRICING.md](docs/PRICING.md)** — modelli di prezzo, piani di abbonamento e token allowance

## Deploy

Consigliato su Vercel (o qualsiasi host Node). Prima del lancio: Google OAuth abilitato in Supabase con brand verificato e un **client OAuth dedicato** al sign-in, separato da quello di Gmail/Calendar (tra le sue Authorized redirect URIs deve esserci `https://<project-ref>.supabase.co/auth/v1/callback`, altrimenti il login Google dà **`Error 400: redirect_uri_mismatch`** — vedi [docs/PROJECT.md → Google sign-in](PROJECT.md#google-sign-in-redirect-uri)), chiavi **live** Stripe, webhook Stripe configurati, `NEXT_PUBLIC_SITE_URL` valorizzata, dominio email verificato su Resend, `supabase/schema.sql` eseguito. In **Supabase → Authentication → URL Configuration** imposta **Site URL** = `NEXT_PUBLIC_SITE_URL` e aggiungi `<host>/auth/callback` tra le Redirect URLs.

