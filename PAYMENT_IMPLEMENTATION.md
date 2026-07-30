# Stripe Payment Links Implementation

## Summary

Implemented Stripe Payment Links system for AgentCloud billing as requested. This replaces the embedded checkout form with a simpler, more secure approach using Stripe's hosted payment pages.

## What Was Changed

### 1. New Files Created

- **`src/app/api/billing/payment-link/route.ts`**: API endpoint that generates payment links with metadata
- **`src/lib/stripe/payment-links.ts`**: Utility functions for managing payment links
- **`STRIPE_SETUP.md`**: Complete setup guide for Stripe configuration
- **`PAYMENT_IMPLEMENTATION.md`**: This file

### 2. Modified Files

- **`.env.local.example`**: Added 26 environment variables for payment links (one per agent)
- **`src/app/api/billing/webhook/route.ts`**: Enhanced webhook to handle payment link metadata and auto-activate subscriptions
- **`src/proxy.ts`**: Removed `/checkout` from public routes (no longer needed)

### 3. Deleted Files

- **`src/app/api/billing/checkout/route.ts`**: Removed old checkout endpoint that redirected to demo page

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

### API Endpoint

**GET** `/api/billing/payment-link?agentId=xxx&userId=xxx&email=xxx`

**Parameters:**

- `agentId` (required): Agent slug (e.g., `executive-assistant`)
- `userId` (optional): Clerk user ID for logged-in users
- `email` (optional): Customer email for guest checkout

**Response:** Redirects to Stripe payment page with metadata

**Example:**

```bash
GET /api/billing/payment-link?agentId=executive-assistant&userId=user_123&email=customer@example.com
```

**Redirects to:**

```
https://buy.stripe.com/...?
  client_reference_id=user_123&
  prefilled_email=customer@example.com&
  metadata[agent_id]=executive-assistant&
  metadata[source]=agentcloud
```

### Webhook Handling

**POST** `/api/billing/webhook`

Handles three Stripe events:

1. **checkout.session.completed**: Activates subscription when payment is complete
   - Reads `agent_id` from metadata
   - Reads `client_reference_id` or `email` for user identification
   - Creates/updates subscription in Supabase
   - Creates/updates user_agents entry

2. **customer.subscription.updated**: Updates subscription status
   - Handles status changes (past due, paused, etc.)

3. **customer.subscription.deleted**: Marks subscription as canceled
   - Updates status to "canceled"

## Configuration

### Environment Variables

Add to `.env.local`:

```env
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_URL=http://localhost:3000

# Payment Links (one per agent)
STRIPE_PAYMENT_LINK_EXECUTIVE_ASSISTANT=https://buy.stripe.com/...
STRIPE_PAYMENT_LINK_PROJECT_MANAGER=https://buy.stripe.com/...
# ... (26 total)
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
<p>Perfect! To activate your Executive Assistant subscription, click here:</p>
<a
  href="https://yourdomain.com/api/billing/payment-link?agentId=executive-assistant&email=customer@example.com"
>
  Activate Subscription - €79/month
</a>
```

### From Frontend (Logged-in User)

```typescript
const paymentLink = `/api/billing/payment-link?agentId=executive-assistant&userId=${user.id}`;
window.location.href = paymentLink;
```

### From Frontend (Guest Checkout)

```typescript
const paymentLink = `/api/billing/payment-link?agentId=executive-assistant&email=customer@example.com`;
window.location.href = paymentLink;
```

## Database Schema

The webhook updates these Supabase tables:

### subscriptions

- `user_id`: Customer identifier (Clerk ID or email)
- `agent_id`: Agent slug
- `stripe_subscription_id`: Stripe subscription ID
- `status`: "active", "canceled", "past_due", etc.

### user_agents

- `user_id`: Customer identifier
- `agent_slug`: Agent slug
- `stripe_subscription_id`: Stripe subscription ID
- `status`: "active" or "canceled"
- `activated_at`: Timestamp of activation

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
curl "http://localhost:3000/api/billing/payment-link?agentId=executive-assistant&email=test@example.com"
```

### Test Full Flow

1. Create test payment link in Stripe (test mode)
2. Add to `.env.local`
3. Start dev server: `npm run dev`
4. Visit payment link URL
5. Complete payment with test card: `4242 4242 4242 4242`
6. Check Supabase for new subscription entry

## Security

- ✅ Webhook signature verification (Stripe-Signature header)
- ✅ No exposed API keys in client-side code
- ✅ HTTPS required for production webhooks
- ✅ Metadata validation in webhook
- ✅ Upsert operations prevent duplicate subscriptions

## Advantages of This Approach

1. **Simple**: Payment links created once in Stripe Dashboard
2. **Secure**: Stripe handles all payment data (PCI compliant)
3. **No embedded forms**: Customers see Stripe's trusted payment page
4. **Automatic activation**: Webhook connects payment to tenant
5. **Recurring billing**: Stripe handles renewals, retries, cancellations
6. **Low maintenance**: No checkout code to maintain

## Next Steps

1. Create Stripe account (or use existing)
2. Create 26 Products and Prices in Stripe
3. Create 26 Payment Links in Stripe
4. Add payment links to `.env.local`
5. Configure webhook endpoint in Stripe
6. Run Supabase schema migration
7. Test with Stripe test mode
8. Deploy to production
9. Switch to live mode in Stripe
10. Create live payment links and update env vars

## Support

- Full setup guide: **STRIPE_SETUP.md**
- Stripe Payment Links docs: https://stripe.com/docs/payment-links
- Stripe Webhooks docs: https://stripe.com/docs/webhooks

## Support

- Full setup guide: **STRIPE_SETUP.md**
- Stripe Payment Links docs: <https://stripe.com/docs/payment-links>
- Stripe Webhooks docs: <https://stripe.com/docs/webhooks>
