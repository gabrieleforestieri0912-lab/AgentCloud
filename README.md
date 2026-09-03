# AgentCloud

Piattaforma di **agenti AI** per le aziende: marketplace di agenti pronti al lancio, chat, dashboard con monitoraggio token, abbonamenti Stripe con overage billing. **Default italiano** con switch EN dalla navbar.

## Funzionalità

- 🤖 **Marketplace agenti** — catalogo filtrato dai feature flags (verticale Shopify/Services/full)
- 💬 **Chat** — chat pubblica per agente (`/a/[slug]`), chat generica e widget embed, con risposte in streaming parola per parola
- 📊 **Dashboard** — agenti installati, utilizzo mensile token, stato abbonamento
- 💳 **Billing Stripe** — payment links, attivazione automatica via webhook, customer portal (cancellazione self-service), **overage billing** con tetto di sicurezza a 2x l'allowance
- 🌐 **i18n** — italiano di default, inglese via cookie `agentcloud_locale` (niente URL `/en`)
- 🔐 **Auth Supabase** — email + password e Google OAuth (sessioni `@supabase/ssr`)
- 🛡️ **Rate limiting distribuito** — Supabase (`rate_limits` + RPC), fail-open
- 🔌 **Shopify OAuth multi-tenant** — App pubblica installabile da qualsiasi merchant (install/callback/webhooks, token cifrati AES-256-GCM)

## Stack

Next.js 16 (Turbopack) · React 19 · Tailwind CSS v4 · TypeScript · Supabase (Auth + DB) · Stripe · Google Gemini · Resend · Vitest

## Avvio rapido

```bash
npm install
cp .env .env.local                 # adatta i valori: vedi PROJECT.md → Environment Variables
npm run dev
```

## Script

| Comando | Scopo |
|---------|-------|
| `npm run dev` | sviluppo |
| `npm run build` | build produzione (con typecheck) |
| `npm run start` | avvio produzione |
| `npm run lint` | ESLint |
| `npm run test` | Vitest (161 test) |
| `npm run typecheck` | `tsc --noEmit` |

## Environment Variables

L'elenco completo e aggiornato è in **[PROJECT.md → Environment Variables](PROJECT.md#environment-variables-produzione)**. In sintesi per la produzione:

```env
# Supabase (Auth + DB) — vedi SUPABASE_AUTH.md per Google OAuth
NEXT_PUBLIC_SUPABASE_URL=…
NEXT_PUBLIC_SUPABASE_ANON_KEY=…
SUPABASE_SERVICE_ROLE_KEY=…

# Site URL (canonical, sitemap, embed, WhatsApp, portal)
NEXT_PUBLIC_SITE_URL=https://tuodominio.com

# AI + Email
GEMINI_API_KEY=…
RESEND_API_KEY=re_…

# Stripe (live!) — vedi STRIPE_SETUP.md per payment links, webhook e metered price
STRIPE_SECRET_KEY=sk_live_…
STRIPE_WEBHOOK_SECRET=whsec_…
STRIPE_OVERAGE_PRICE_ID=price_…
STRIPE_PAYMENT_LINK_<AGENTE>=https://buy.stripe.com/…
STRIPE_PAYMENT_LINK_<VERTICAL>_<TIER>=https://buy.stripe.com/…

# Admin
ADMIN_API_TOKEN=…

# Facoltativi: AGENTCLOUD_VERTICAL, AGENTCLOUD_FEATURE_FLAGS, tool Shopify/Calendar/Lead/WhatsApp, SHOPIFY_API_KEY/SECRET/SCOPES, TENANT_STORE_KEY
```

## Database

Gli schemi Supabase sono separati per fase:

- **`supabase/schema-waitlist.sql`** — fase waitlist: registra solo l'utente (`profiles` + trigger auth), raccoglie le email (`waitlist`) e include `rate_limits` con le RPC per il rate limiting dell'endpoint waitlist.
- **`supabase/schema.sql`** — piattaforma completa (quando è disponibile): aggiunge agenti, billing/usage (`subscriptions`, `user_agents`, `agent_runs`), notifiche azioni agenti (`agent_notifications`), `demo_requests`, `waitlist`, `rate_limits` e il bootstrap di `agents_registry`.
- **`supabase/schema-shopify-oauth.sql`** — tabelle dell'OAuth multi-tenant Shopify (`shopify_connections`, token cifrati).

Esegui lo schema scelto (Supabase SQL Editor o `supabase db push`) — **rieseguilo dopo ogni aggiornamento** (idempotente).

## Documentazione

- **[PROJECT.md](PROJECT.md)** — architettura, routes, i18n, billing, rate limiting, env vars complete
- **[SUPABASE_AUTH.md](SUPABASE_AUTH.md)** — setup autenticazione (email/password + Google OAuth)
- **[STRIPE_SETUP.md](STRIPE_SETUP.md)** — payment links, webhook, overage meter, customer portal
- **[FEATURE_FLAGS.md](FEATURE_FLAGS.md)** — verticali e configurazione agenti/tool
- **[PRICING.md](PRICING.md)** — piani e token allowance

## Deploy

Consigliato su Vercel (o qualsiasi host Node). Prima del lancio: Google OAuth configurato in Supabase (vedi `SUPABASE_AUTH.md`), chiavi **live** Stripe, webhook Stripe configurato (4 eventi), `NEXT_PUBLIC_SITE_URL` valorizzata, dominio email verificato su Resend, `supabase/schema.sql` eseguito.
