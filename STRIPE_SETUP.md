# Stripe Payment Links Setup Guide

## Overview

AgentCloud uses **Stripe Payment Links** for billing. This is a simple, secure system where:

- Payment links are created once in Stripe Dashboard (no code)
- Links are stored as environment variables
- Customers are redirected to Stripe's hosted payment page
- Webhooks automatically activate subscriptions

## Step 1: Create Stripe Account

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/register)
2. Complete account setup
3. Get your API keys from **Developers → API keys**:
   - `STRIPE_SECRET_KEY` (starts with `sk_test_` or `sk_live_`)
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (starts with `pk_test_` or `pk_live_`)

## Step 2: Create Products and Prices

For each agent, create a Product and Price in Stripe:

1. Go to **Products → Add Product**
2. Product details:
   - **Name**: Agent name (e.g., "Executive Assistant")
   - **Description**: Agent description
   - **Pricing**: Recurring → Monthly → Set price in EUR
3. Save the **Price ID** (starts with `price_`)

Repeat for all agents (30 total).

### Overage Price (Billing Meter) — obbligatorio per l'overage billing

Per addebitare automaticamente i token oltre il plafond mensile servono un
**Meter** e un **Price metered** dedicati (l'SDK Stripe v22 usa i Billing
Meters, non più gli usage records classici):

1. **Billing → Meters → Create meter**:
   - Nome: "AgentCloud Token Overage"
   - **Event name**: `agentcloud_token_overage` (deve corrispondere a
     `STRIPE_OVERAGE_METER_EVENT`)
   - Customer mapping: `stripe_customer_id` (default)
   - Value: `value`, Aggregation: **Sum**
2. **Products → Add product** → "AgentCloud Token Overage":
   - Pricing → **Metered usage** (seleziona il meter creato)
   - Unit amount: **€0,30**, unit label: **"1.000 tokens"**
   - Billing period: **Monthly** → Salva
3. Copia il **Price ID** e l'event name in `.env.local`:

```env
STRIPE_OVERAGE_PRICE_ID=price_xxxxxxxxxxxx
STRIPE_OVERAGE_METER_EVENT=agentcloud_token_overage
```

Come funziona: al checkout il webhook allega questo Price alla subscription
del cliente (`getOrCreateMeterItem`, idempotente); quando un run supera
l'allowance i token extra vengono riportati come **meter events**
(`billing.meterEvents.create`, con `stripe_customer_id` nel payload e un
`identifier` unico per run contro i retry). Stripe somma gli eventi del
periodo e fattura a fine periodo insieme al rinnovo. Senza queste env var
l'overage è disabilitato e il comportamento torna al blocco 429 al
raggiungimento del plafond.

## Step 3: Create Payment Links

For each agent price, create a Payment Link:

1. Go to the Price detail page
2. Click **"Create payment link"** or go to **Products → Payment links → Create payment link**
3. Configure:
   - **Product**: Select your agent product
   - **Price**: Select the recurring price
   - **Payment collection**: Automatic (recurring)
4. **Copy the payment link URL** (starts with `https://buy.stripe.com/...`)

### Important: Add Metadata

When creating payment links, Stripe allows you to add metadata. However, since Payment Links are static, we'll add metadata dynamically via URL parameters in the API.

## Step 4: Configure Environment Variables

Add these to your `.env.local` file:

```env
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_URL=http://localhost:3000

# Payment Links (one per agent)
STRIPE_PAYMENT_LINK_EXECUTIVE_ASSISTANT=https://buy.stripe.com/...
STRIPE_PAYMENT_LINK_PROJECT_MANAGER=https://buy.stripe.com/...
# ... (repeat for all 30 agents)
```

### Agent Slug Mapping

Use these slugs for environment variable names:

| Agent                | Slug                   | Env Variable                               |
| -------------------- | ---------------------- | ------------------------------------------ |
| Executive Assistant  | `executive-assistant`  | `STRIPE_PAYMENT_LINK_EXECUTIVE_ASSISTANT`  |
| Project Manager      | `project-manager`      | `STRIPE_PAYMENT_LINK_PROJECT_MANAGER`      |
| Meeting Assistant    | `meeting-assistant`    | `STRIPE_PAYMENT_LINK_MEETING_ASSISTANT`    |
| CRM Assistant        | `crm-assistant`        | `STRIPE_PAYMENT_LINK_CRM_ASSISTANT`        |
| Customer Success     | `customer-success`     | `STRIPE_PAYMENT_LINK_CUSTOMER_SUCCESS`     |
| Business Manager     | `business-manager`     | `STRIPE_PAYMENT_LINK_BUSINESS_MANAGER`     |
| Marketing Strategist | `marketing-strategist` | `STRIPE_PAYMENT_LINK_MARKETING_STRATEGIST` |
| SEO Specialist       | `seo-specialist`       | `STRIPE_PAYMENT_LINK_SEO_SPECIALIST`       |
| Google Ads Expert    | `google-ads-expert`    | `STRIPE_PAYMENT_LINK_GOOGLE_ADS_EXPERT`    |
| Social Media Manager | `social-media-manager` | `STRIPE_PAYMENT_LINK_SOCIAL_MEDIA_MANAGER` |
| Cold Email Writer    | `cold-email-writer`    | `STRIPE_PAYMENT_LINK_COLD_EMAIL_WRITER`    |
| Lead Qualification   | `lead-qualification`   | `STRIPE_PAYMENT_LINK_LEAD_QUALIFICATION`   |
| Support Agent        | `support-agent`        | `STRIPE_PAYMENT_LINK_SUPPORT_AGENT`        |
| Complaint Manager    | `complaint-manager`    | `STRIPE_PAYMENT_LINK_COMPLAINT_MANAGER`    |
| Full Stack Developer | `fullstack-developer`  | `STRIPE_PAYMENT_LINK_FULLSTACK_DEVELOPER`  |
| API Integration      | `api-integration`      | `STRIPE_PAYMENT_LINK_API_INTEGRATION`      |
| DevOps Engineer      | `devops-engineer`      | `STRIPE_PAYMENT_LINK_DEVOPS_ENGINEER`      |
| QA Tester            | `qa-tester`            | `STRIPE_PAYMENT_LINK_QA_TESTER`            |
| Prompt Engineer      | `prompt-engineer`      | `STRIPE_PAYMENT_LINK_PROMPT_ENGINEER`      |
| AI Automation        | `ai-automation`        | `STRIPE_PAYMENT_LINK_AI_AUTOMATION`        |
| Data Analyst         | `data-analyst`         | `STRIPE_PAYMENT_LINK_DATA_ANALYST`         |
| Copywriter           | `copywriter`           | `STRIPE_PAYMENT_LINK_COPYWRITER`           |
| Blog Writer          | `blog-writer`          | `STRIPE_PAYMENT_LINK_BLOG_WRITER`          |
| UI Designer          | `ui-designer`          | `STRIPE_PAYMENT_LINK_UI_DESIGNER`          |
| E-commerce Expert    | `ecommerce-expert`     | `STRIPE_PAYMENT_LINK_ECOMMERCE_EXPERT`     |
| Shopify Agent        | `shopify-agent`        | `STRIPE_PAYMENT_LINK_SHOPIFY_AGENT`        |

## Step 5: Configure Stripe Webhook

1. Go to **Developers → Webhooks**
2. Click **"Add endpoint"**
3. Configure:
   - **Endpoint URL**: `https://yourdomain.com/api/billing/webhook`
   - **Events to listen to**:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
4. Copy the **Webhook Secret** (starts with `whsec_`)
5. Add to `.env.local`:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

### Webhook Events Explained

- **checkout.session.completed**: Triggered when a customer completes payment. Activates their subscription.
- **customer.subscription.updated**: Triggered when subscription status changes (e.g., past due, paused).
- **customer.subscription.deleted**: Triggered when subscription is canceled.

### Customer Billing Portal — per la cancellazione self-service

Per permettere ai clienti di **fermare l'abbonamento da soli** (a fine periodo
già pagato, il default del portale), cambiare carta e scaricare fatture:

1. Stripe Dashboard → **Settings → Billing → Customer portal**
2. Abilita il portale, compila i dati business e imposta il **Return URL**:
   `https://yourdomain.com/dashboard`
3. Lascia la cancellazione a fine periodo attiva (equa per il cliente)

Il pulsante **"Manage subscription"** nel dashboard apre
`/api/billing/portal`, che crea una sessione del portale per lo
`stripe_customer_id` dell'utente e reindirizza lì. Mentre la cancellazione è
in sospeso (`cancel_at_period_end`), il webhook `customer.subscription.updated`
lo salva nella config dell'agente e il dashboard mostra il chip
**"Cancels at period end"**. Quando la subscription scade, il webhook
`customer.subscription.deleted` (già gestito) passa gli agenti a `canceled`
e i run vengono bloccati (402). Fino ad allora l'accesso resta attivo fino
alla fine del periodo pagato.

## Step 6: Configure Supabase Database

Run the schema from `supabase/schema.sql` in your Supabase SQL Editor:

1. Go to Supabase Dashboard → SQL Editor
2. Paste contents of `supabase/schema.sql`
3. Click **Run**

This creates:

- `subscriptions` table: Tracks all Stripe subscriptions
- `user_agents` table: Maps users to their active agents
- `agent_runs` table: Logs agent usage
- `demo_requests` table: Stores demo requests
- `profiles` table: User profiles with Stripe customer IDs

## Step 7: Test the Flow

### Test Payment Link Generation

```bash
curl "http://localhost:3000/api/billing/payment-link?agentId=executive-assistant&userId=user_123&email=test@example.com"
```

Should redirect to Stripe payment page with metadata.

### Test Webhook (Local Development)

Use Stripe CLI to forward webhooks to localhost:

```bash
# Install Stripe CLI
# https://stripe.com/docs/stripe-cli

# Forward webhooks to localhost
stripe listen --forward-to localhost:3000/api/billing/webhook

# Trigger a test event
stripe trigger checkout.session.completed
```

### Test Full Flow

1. Visit payment link URL
2. Complete test payment (use Stripe test card: `4242 4242 4242 4242`)
3. Check Supabase `subscriptions` table for new entry
4. Check `user_agents` table for activated agent

## Step 8: Configure Feature Flags (Optional)

AgentCloud supports feature flags to control which agents and tools are available. This is useful for:

- Launching with only a few agents instead of the whole 30-agent catalog
- Reducing surface area for initial demos
- Gradually rolling out features to specific customers
- Testing new agents with specific customers before full launch

### Configuration Options

**Option 1: Vertical Preset (Recommended for Launch)**

Set the vertical in your environment variables:

```env
# For Shopify e-commerce launch (default)
AGENTCLOUD_VERTICAL=shopify

# For services vertical (restaurants, professionals, real estate)
AGENTCLOUD_VERTICAL=services

# For full platform (all agents)
AGENTCLOUD_VERTICAL=full
```

**Option 2: Custom Configuration**

Use a JSON configuration for full control:

```env
AGENTCLOUD_FEATURE_FLAGS={
  "enabledAgents": ["shopify-agent", "lead-capture"],
  "enabledTools": [
    "shopify_search_products",
    "shopify_get_order_status",
    "shopify_build_cart_url",
    "lead_capture_submit",
    "lead_capture_notify_sales"
  ],
  "agentToolOverrides": {},
  "enableOptionalToolsByDefault": false
}
```

### Available Verticals

#### Shopify E-commerce (Default)

- **Agents**: Shopify Agent, Lead Capture
- **Tools**: Product search, order status, cart links, lead capture
- **Use case**: E-commerce stores on Shopify

#### Services

- **Agents**: Calendar Booking, Lead Capture
- **Tools**: Calendar search, booking, lead capture
- **Use case**: Restaurants, professionals, real estate

#### Full Platform

- **Agents**: All 8 runtime agents (SEO, Business Manager, Personal Assistant, Shopify, Calendar Booking, Lead Capture, Support Agent, Copywriter)
- **Tools**: All tools enabled
- **Use case**: Existing customers, full launch

### How It Works

Feature flags are checked at runtime. When you enable a new agent or tool, it becomes available immediately without code changes or redeployment.

See **FEATURE_FLAGS.md** for complete documentation.

## Step 9: Deploy to Production

### Environment Variables

Set all environment variables in your hosting platform (Vercel, Railway, etc.):

- All `STRIPE_PAYMENT_LINK_*` variables
- `STRIPE_SECRET_KEY` (use live key `sk_live_`)
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (use live key `pk_live_`)
- Supabase credentials
- Resend API key

### Update Webhook URL

1. In Stripe Dashboard, update webhook endpoint to production URL:
   - `https://yourdomain.com/api/billing/webhook`

### Switch to Live Mode

1. In Stripe Dashboard, toggle to **Live mode**
2. Create new Products and Prices in live mode
3. Create new Payment Links in live mode
4. Update environment variables with live payment links

## How It Works

### Payment Flow

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

### Metadata Flow

The API adds metadata to payment links via URL parameters:

```
https://buy.stripe.com/...?
  client_reference_id=user_123&
  prefilled_email=customer@example.com&
  metadata[agent_id]=executive-assistant&
  metadata[source]=agentcloud
```

Stripe passes this metadata to the webhook, allowing automatic activation.

## Troubleshooting

### Payment link not working

- Check environment variable name matches agent slug
- Verify payment link URL is correct (not expired)
- Check Stripe Dashboard → Payment links for status

### Webhook not triggering

- Verify webhook URL is publicly accessible
- Check webhook secret matches `.env.local`
- Use Stripe CLI for local testing
- Check webhook logs in Stripe Dashboard

### Subscription not activating

- Verify `agent_id` is in payment link metadata
- Check Supabase `subscriptions` table for errors
- Check webhook logs for error messages
- Ensure `stripe_subscription_id` is not null

## Security Notes

- **Never expose `STRIPE_SECRET_KEY`** in client-side code
- **Always verify webhook signatures** (already implemented)
- **Use HTTPS** in production for webhooks
- **Rotate API keys** periodically
- **Monitor Stripe Dashboard** for suspicious activity

## Cost

- Stripe fees: 1.4% + €0.25 per transaction (EU)
- No monthly fees for Stripe account
- Payment Links are free to create

## Support

- Stripe Docs: https://stripe.com/docs/payment-links
- Stripe Support: https://support.stripe.com

- Stripe Docs: <https://stripe.com/docs/payment-links>
- Stripe Support: <https://support.stripe.com>

- Stripe Docs: <https://stripe.com/docs/payment-links>
- Stripe Support: <https://support.stripe.com>
