# Billing Implementation — Stripe + PayPal (Klarna / Amazon Pay)

## Summary

AgentCloud billing now supports **Stripe + PayPal** on the same Supabase ledger (`subscriptions` / `user_agents`, PayPal flagged via `config.paypal`). Stripe Payment Links remain for manual sales, while **Stripe Checkout (dynamic)** and **PayPal Billing Subscriptions** are the primary code-driven flows. Stripe Checkout enables **Klarna** and **Amazon Pay** alongside Card via `payment_method_types: card,klarna,amazon_pay` in both `src/app/api/checkout/route.ts:74` and `src/app/api/cart/checkout/route.ts:54` (requires enabling both methods in Stripe Dashboard → Payments → Payment methods).

## What Was Changed

### 1. New Files Created

- **`src/app/api/billing/payment-link/route.ts`**: API endpoint that generates payment links with metadata (creates the Stripe Payment Link directly; a dedicated `src/lib/stripe/payment-links.ts` module was removed in a cleanup as dead code)
- **`src/app/api/billing/paypal/create/route.ts`**: Creates PayPal Billing Subscription (+ plan/product on the fly, reuses `PAYPAL_PLAN_*` if set) — `src/lib/paypal/client.ts` REST `sandbox|live` via `PAYPAL_MODE`
- **`src/app/api/billing/paypal/webhook/route.ts`**: PayPal webhook mirror of Stripe (verifies via `PAYPAL_WEBHOOK_ID`, handles `BILLING.SUBSCRIPTION.ACTIVATED`/`CANCELLED`/`SUSPENDED` → same `subscriptions`/`user_agents` with `config.paypal`)
- **`src/lib/paypal/client.ts`**: Server-only PayPal REST client (OAuth, product/plan/subscription, `verifyPayPalWebhook`)
- **`src/app/dashboard/subscriptions/page.tsx`**: **I miei abbonamenti** — unified view for Stripe + PayPal (PayPal badge when `config.paypal`, invoices via Stripe portal vs PayPal dashboard)
- **`STRIPE_SETUP.md`**: Complete setup guide for Stripe + PayPal + Klarna/Amazon Pay configuration
- **`PAYMENT_IMPLEMENTATION.md`**: This file

### 2. Modified Files

- **`.env` / `.env.local.example`**: Added 10 `STRIPE_PAYMENT_LINK_*` + PayPal vars (`PAYPAL_CLIENT_ID/SECRET`, `PAYPAL_MODE`, `PAYPAL_WEBHOOK_ID`, `NEXT_PUBLIC_PAYPAL_CLIENT_ID`, optional `PAYPAL_PLAN_*`) — no secrets hardcoded, placeholders only
- **`src/app/api/billing/webhook/route.ts`**: Enhanced webhook to handle payment link metadata and auto-activate subscriptions
- **`src/app/api/checkout/route.ts`**: Stripe Checkout Session (dynamic `priceCents`) with `payment_method_types: ["card","klarna","amazon_pay"]` (`src/app/api/checkout/route.ts:74`)
- **`src/app/api/cart/checkout/route.ts`**: Cart Checkout (N line_items) with same `payment_method_types` (`src/app/api/cart/checkout/route.ts:54`) — Klarna/Amazon Pay enabled via Dashboard + code
- **`src/proxy.ts`**: Removed `/checkout` from public routes (no longer needed)

### 3. Deleted Files (poi reintrodotti in altra forma)

- **`src/app/api/billing/checkout/route.ts`**: Il vecchio checkout che reindirizzava alla demo è stato rimosso; il checkout è poi stato reintrodotto come **`src/app/api/checkout/route.ts`** — Stripe Checkout Session con **prezzo dinamico** derivato da `priceCents` del catalogo (nessun prodotto Stripe pre-creato necessario) e metadata per l'attivazione via webhook. Oggi coesistono: **payment links** (prezzi pre-creati, vendita manuale via email) e **checkout dinamico** (dalla card dell'agente).

## How It Works

### Payment Flow — Stripe Payment Links (manual)

```
1. Sales person closes deal via email
   ↓
2. Customer clicks payment link (from email)
   ↓
3. Stripe hosted payment page (secure, PCI compliant)
   ↓
4. Customer completes payment
   ↓
5. Stripe sends webhook to /api/billing/webhook
   ↓
6. Webhook activates subscription in Supabase
   ↓
7. Customer can now access the agent
```

### Payment Flow — Stripe Checkout (dynamic, Klarna / Amazon Pay)

```
1. POST /api/checkout {agentId} or POST /api/cart/checkout (cart N items)
   ↓
2. stripe.checkout.sessions.create {mode: subscription,
   payment_method_types: card,klarna,amazon_pay,
   price_data: {currency: eur, unit_amount: priceCents, recurring: month}}
   ↓
3. Redirect to Stripe Checkout (Card + Klarna + Amazon Pay if enabled in Dashboard)
   ↓
4. checkout.session.completed → webhook → subscriptions + user_agents, cart cleared
```

### Payment Flow — PayPal Billing Subscriptions

```
1. POST /api/billing/paypal/create {agentId} → plan reused (PAYPAL_PLAN_*) or
   created via lib/paypal/client (product + plan) → subscription → {approveUrl}
   ↓
2. Redirect to approveUrl (PayPal)
   ↓
3. BILLING.SUBSCRIPTION.ACTIVATED → POST /api/billing/paypal/webhook (verified
   via PAYPAL_WEBHOOK_ID if set) → same subscriptions/user_agents (config.paypal)
```

> **Unified storage:** Stripe and PayPal both write to `subscriptions` (ledger, `stripe_subscription_id` reused for PayPal `I-...`) and `user_agents` (authoritative ownership). PayPal rows are flagged `config: {paypal: true, subscriptionId}` and shown with a **PayPal** badge in `/dashboard/subscriptions`; Stripe rows may have `config.stripeSubscriptionItemId`. Management: `/dashboard/subscriptions` for both + Stripe Customer Portal (`/api/billing/portal`); PayPal managed via PayPal dashboard.

### API Endpoints

#### Stripe — Payment Links

**GET** `/api/billing/payment-link?agentId=xxx&userId=xxx&email=xxx`

**Parameters:**

- `agentId` (required): Agent slug (e.g., `shopify-agent`, `email-manager`)
- `userId` (optional): Supabase user ID (`auth.users` UUID) for logged-in users
- `email` (optional): Customer email for guest checkout

**Response:** Redirects to Stripe payment page with metadata

**Example:**

```bash
GET /api/billing/payment-link?agentId=email-manager&userId=user_123&email=customer@example.com
```

**Redirects to:**

```
https://buy.stripe.com/...?
  client_reference_id=user_123&
  prefilled_email=customer@example.com&
  metadata[agent_id]=email-manager&
  metadata[source]=agentcloud
```

#### Stripe — Checkout (dynamic, Klarna / Amazon Pay)

**POST** `/api/checkout` `{agentId}` → `{url}` and **POST** `/api/cart/checkout` (cart N items) → `{url}`

Creates **Stripe Checkout Session** (`mode: subscription`) with `payment_method_types: ["card","klarna","amazon_pay"]` (`src/app/api/checkout/route.ts:74`, `src/app/api/cart/checkout/route.ts:54`), `line_items` with dynamic `price_data: {currency: eur, unit_amount: priceCents, recurring: month}`, `subscription_data.metadata: {agent_id(s), user_id, source, cart_id}` and `client_reference_id`/`customer_email`. Requires **Klarna** and **Amazon Pay** enabled in **Stripe Dashboard → Settings → Payments → Payment methods** plus the code — otherwise Checkout rejects the types.

#### PayPal — Billing Subscriptions

**POST** `/api/billing/paypal/create` `{agentId}` → `{url: approveUrl, subscriptionId}`

Server-only (`src/app/api/billing/paypal/create/route.ts`), verifies `isPayPalConfigured()` (`PAYPAL_CLIENT_ID/SECRET`), reuses `PAYPAL_PLAN_<AGENT>` env if present else creates product (`/v1/catalogs/products`) + billing plan (`/v1/billing/plans`, `MONTH`, `total_cycles: 0`) via `src/lib/paypal/client.ts` (`PAYPAL_MODE=sandbox|live`), then subscription (`/v1/billing/subscriptions` with `custom_id: {agent_id, user_id}`, `return_url: /dashboard?paypal=success`). Activation is async via webhook.

### Webhook Handling

#### Stripe — **POST** `/api/billing/webhook`

Handles four Stripe events:

1. **checkout.session.completed**: Activates subscription when payment is complete
   - Reads `agent_id` from metadata
   - Reads `client_reference_id` or `email` for user identification
   - Creates/updates subscription in Supabase
   - Creates/updates user_agents entry

2. **invoice.paid**: Aggiorna i periodi di fatturazione e salva `current_period_end`

3. **customer.subscription.updated**: Updates subscription status
   - Handles status changes (past due, paused, cancel_at_period_end, etc.)

4. **customer.subscription.deleted**: Marks subscription as canceled
   - Updates status to "canceled"

#### PayPal — **POST** `/api/billing/paypal/webhook` (`src/app/api/billing/paypal/webhook/route.ts`)

Verifies via `verifyPayPalWebhook` (`/v1/notifications/verify-webhook-signature` with `PAYPAL_WEBHOOK_ID`; if not set, best-effort skip), then mirrors Stripe on the same tables:

1. **BILLING.SUBSCRIPTION.ACTIVATED**: `upsert` `subscriptions: {user_id, agent_id, stripe_subscription_id: I-..., status: active}` + `user_agents: {user_id, agent_slug, stripe_subscription_id: I-..., status: active, config: {paypal: true, subscriptionId}, cancelled_at: null}`
2. **BILLING.SUBSCRIPTION.CANCELLED / SUSPENDED**: `update` both tables `status: canceled` by `stripe_subscription_id`

## Configuration

### Environment Variables

Add to `.env.local` (placeholders only — never hardcode real secrets):

```env
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_URL=http://localhost:3000

# Payment Links (one per agent)
STRIPE_PAYMENT_LINK_SHOPIFY_AGENT=https://buy.stripe.com/...
STRIPE_PAYMENT_LINK_EMAIL_MANAGER=https://buy.stripe.com/...
# ... (una per agente del catalogo, slug → underscore maiuscolo)

# Stripe Checkout — Klarna / Amazon Pay (no extra env)
# Enabled via Stripe Dashboard → Settings → Payments → Payment methods (Klarna + Amazon Pay)
# + code: payment_method_types: ["card","klarna","amazon_pay"] in
# src/app/api/checkout/route.ts:74 and src/app/api/cart/checkout/route.ts:54

# PayPal — Billing Subscriptions (alongside Stripe, same subscriptions/user_agents)
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
PAYPAL_MODE=sandbox # sandbox | live
PAYPAL_WEBHOOK_ID=WH-... # PayPal webhook ID (e.g. WH-... or 53242420YL...)
NEXT_PUBLIC_PAYPAL_CLIENT_ID=your_paypal_client_id # JS SDK, client only (no secret)
# Optional reuse of pre-created plans (one per agent, else created on the fly via lib/paypal/client.ts)
# PAYPAL_PLAN_SHOPIFY_AGENT=P-...
# PAYPAL_PLAN_EMAIL_MANAGER=P-...
```

### Creating Payment Links in Stripe

1. Create Product and Price in Stripe Dashboard
2. Create Payment Link from Price page
3. Copy payment link URL
4. Add to environment variables

See **STRIPE_SETUP.md** for detailed instructions.

## Usage Examples

### From Email Template

```html
<p>Perfect! To activate your Email Manager subscription, click here:</p>
<a
  href="https://yourdomain.com/api/billing/payment-link?agentId=email-manager&email=customer@example.com"
>
  Activate Subscription - €39/month
</a>
```

### From Frontend (Logged-in User)

```typescript
const paymentLink = `/api/billing/payment-link?agentId=email-manager&userId=${user.id}`;
window.location.href = paymentLink;
```

### From Frontend (Guest Checkout)

```typescript
const paymentLink = `/api/billing/payment-link?agentId=email-manager&email=customer@example.com`;
window.location.href = paymentLink;
```

### Stripe Checkout (dynamic, Klarna / Amazon Pay)

```typescript
// Single agent
const { url } = await fetch("/api/checkout", {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ agentId: "email-manager" }),
}).then(r => r.json());
window.location.href = url; // Stripe Checkout with card,klarna,amazon_pay

// Cart (all items)
const { url: cartUrl } = await fetch("/api/cart/checkout", { method: "POST" }).then(r => r.json());
window.location.href = cartUrl;
```

### PayPal Billing Subscription

```typescript
const { url } = await fetch("/api/billing/paypal/create", {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ agentId: "email-manager" }),
}).then(r => r.json());
window.location.href = url; // PayPal approveUrl — activation via BILLING.SUBSCRIPTION.ACTIVATED webhook
```

## Database Schema

Both providers update the **same** Supabase tables (PayPal reuses `stripe_subscription_id` for `I-...`, flagged via `config.paypal`):

### subscriptions (ledger — one row per subscription × agent)

- `user_id`: Customer identifier (Supabase user ID or email)
- `agent_id`: Agent slug
- `stripe_subscription_id`: Stripe `sub_...` **or** PayPal `I-...` (same column, same unique constraint `stripe_subscription_id, agent_id`)
- `status`: "active", "canceled", "past_due", etc.

### user_agents (authoritative ownership — one row per user × agent)

- `user_id`: Customer identifier
- `agent_slug`: Agent slug
- `stripe_subscription_id`: Stripe `sub_...` or PayPal `I-...`
- `status`: "active" or "canceled"
- `activated_at`: Timestamp of activation
- `config`: `{paypal: true, subscriptionId}` for PayPal, `{stripeSubscriptionItemId}` for Stripe metered overage; used by `/dashboard/subscriptions` to render **PayPal** / **Stripe** badges

## Testing

### Local Testing with Stripe CLI

```bash
# Install Stripe CLI
# https://stripe.com/docs/stripe-cli

# Forward webhooks to localhost
stripe listen --forward-to localhost:3000/api/billing/webhook

# Trigger test event
stripe trigger checkout.session.completed
```

### Test Payment Link Generation

```bash
curl "http://localhost:3000/api/billing/payment-link?agentId=email-manager&email=test@example.com"
```

### Test Checkout (Klarna / Amazon Pay)

```bash
curl -X POST http://localhost:3000/api/checkout -H "Content-Type: application/json" -d '{"agentId":"email-manager"}'
# Open returned url in test mode — Card + Klarna + Amazon Pay should appear if enabled in Dashboard
curl -X POST http://localhost:3000/api/cart/checkout
```

### Test PayPal (sandbox)

```bash
PAYPAL_MODE=sandbox PAYPAL_CLIENT_ID=... PAYPAL_CLIENT_SECRET=... PAYPAL_WEBHOOK_ID=WH-...
curl -X POST http://localhost:3000/api/billing/paypal/create -H "Content-Type: application/json" -d '{"agentId":"email-manager"}'
# Open approveUrl, approve in sandbox → BILLING.SUBSCRIPTION.ACTIVATED hits /api/billing/paypal/webhook → check subscriptions/user_agents (config.paypal)
```

### Test Full Flow

1. Create test payment link in Stripe (test mode)
2. Add to `.env.local`
3. Start dev server: `npm run dev`
4. Visit payment link URL
5. Complete payment with test card: `4242 4242 4242 4242`
6. Check Supabase for new subscription entry (also visible in `/dashboard/subscriptions` → Active + Invoice history)

## Security

- ✅ Webhook signature verification — Stripe (`Stripe-Signature` header, `STRIPE_WEBHOOK_SECRET`) and PayPal (`verify-webhook-signature` with `PAYPAL_WEBHOOK_ID`; best-effort skip if not set — `src/lib/paypal/client.ts:115`)
- ✅ No exposed secrets in client-side code (`STRIPE_SECRET_KEY`, `PAYPAL_CLIENT_SECRET` server-only; `NEXT_PUBLIC_PAYPAL_CLIENT_ID` is client ID only)
- ✅ HTTPS required for production webhooks
- ✅ Metadata/custom_id validation in webhooks (`agent_id`, `user_id`, `custom_id` JSON)
- ✅ Upsert operations prevent duplicate subscriptions
- ✅ No secrets hardcoded — only env placeholders in docs/code

## Advantages of This Approach

1. **Simple**: Payment links created once in Stripe Dashboard
2. **Secure**: Stripe/PayPal handle all payment data (PCI compliant, hosted pages)
3. **No embedded forms**: Customers see trusted payment pages
4. **Automatic activation**: Webhooks (Stripe `checkout.session.completed`, PayPal `BILLING.SUBSCRIPTION.ACTIVATED`) connect payment to tenant on same tables
5. **Recurring billing**: Providers handle renewals, retries, cancellations
6. **Choice + conversion**: Card vs **Klarna** (pay later/installments) vs **Amazon Pay** vs **PayPal** on the same ledger; Checkout toggles via `payment_method_types` + Dashboard
7. **Unified management**: Single `/dashboard/subscriptions` + Stripe portal; PayPal via its dashboard — low maintenance

## Subscription Management

Unified in **I miei abbonamenti** (`/dashboard/subscriptions`): lists active/history from `user_agents` + `subscriptions` (last 20 transactions), shows **PayPal** badge (`config.paypal`) vs **Stripe** badge, next renewal/period end, and actions: **Gestisci su Stripe** (`/api/billing/portal` → Customer Portal for payment methods/invoices/cancel-at-period-end) + **Vai al carrello**. PayPal subscriptions are managed via the **PayPal dashboard** after activation (note in page); Stripe's `cancel_at_period_end` chip is driven by `customer.subscription.updated`.

## Next Steps

1. Create Stripe account (or use existing)
2. Create 10 Products and Prices in Stripe (una per agente del catalogo)
3. Create 10 Payment Links in Stripe
4. Add payment links to `.env.local`
5. Enable **Klarna** + **Amazon Pay** in Stripe Dashboard → Settings → Payments → Payment methods (code already sets `payment_method_types` in `checkout` + `cart/checkout`)
6. Configure webhook endpoint in Stripe (4 events: `checkout.session.completed`, `invoice.paid`, `customer.subscription.updated`, `customer.subscription.deleted`)
7. **PayPal** (optional): create PayPal app (sandbox + live), set `PAYPAL_CLIENT_ID/SECRET`, `PAYPAL_MODE`, `PAYPAL_WEBHOOK_ID` (+ `NEXT_PUBLIC_PAYPAL_CLIENT_ID`), optionally `PAYPAL_PLAN_*` per agent; webhook `BILLING.SUBSCRIPTION.ACTIVATED/CANCELLED/SUSPENDED`
8. Run Supabase schema migration (`supabase/schema.sql` — covers `subscriptions`/`user_agents`)
9. Test with Stripe test mode (Card + Klarna/Amazon Pay) and PayPal sandbox
10. Deploy to production (set `PAYPAL_MODE=live`, `PAYPAL_WEBHOOK_ID` live, `NEXT_PUBLIC_PAYPAL_CLIENT_ID` live)
11. Switch to live mode in Stripe + create live payment links and update env vars

## Support

- Full setup guide: **STRIPE_SETUP.md**
- Stripe Payment Links docs: <https://stripe.com/docs/payment-links>
- Stripe Webhooks docs: <https://stripe.com/docs/webhooks>
