import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  parseCheckoutMetadata,
  resolveCheckoutAgents,
} from "@/lib/stripe/webhook-helpers";
import {
  getOrCreateMeterItem,
  isOverageBillingEnabled,
} from "@/lib/stripe/overage";

/**
 * The generated Stripe SDK v22 types are heavily restructured; these narrow
 * shapes cover only the fields this webhook relies on.
 */
type WebhookSubscription = {
  id: string;
  status?: string;
  current_period_end?: number | null;
  cancel_at_period_end?: boolean | null;
};

type WebhookInvoice = {
  subscription?: string | null;
  period_end?: number | null;
};

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(key, {});
}

/**
 * Resolve the platform user for a checkout.
 * Priority: client_reference_id (Clerk user ID) -> metadata user_id -> email.
 */
function resolveUserId(session: Stripe.Checkout.Session, metadataUserId: string | null) {
  return (
    (typeof session.client_reference_id === "string"
      ? session.client_reference_id
      : null) ??
    metadataUserId ??
    session.customer_details?.email ??
    null
  );
}

async function activateSubscription(
  db: NonNullable<ReturnType<typeof createAdminClient>>,
  session: Stripe.Checkout.Session,
) {
  const metadata = parseCheckoutMetadata(
    session.metadata ?? {},
    {
      client_reference_id: session.client_reference_id,
      email: session.customer_details?.email,
    },
  );

  const userId = resolveUserId(session, metadata.userId);
  const resolution = resolveCheckoutAgents(metadata);

  if (!userId) {
    console.error(
      "Cannot resolve user for checkout session",
      session.id,
      session.metadata,
    );
    return;
  }

  if (resolution.agentIds.length === 0) {
    console.error(
      "No agents resolvable from checkout metadata",
      session.id,
      session.metadata,
    );
    return;
  }

  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription : null;
  const customerId =
    typeof session.customer === "string" ? session.customer : null;
  const config: Record<string, unknown> = {
    tokenLimit: resolution.tokenLimit,
    planId: resolution.planId,
    vertical: resolution.vertical,
    activatedVia: resolution.planId ? "plan" : "agent",
  };

  // Attach the metered overage Price to the subscription right away, so usage
  // above the token allowance can be billed from the first overage run.
  // (getOrCreateMeterItem is idempotent — all agents of the same plan share
  // the same subscription and therefore the same meter item.)
  if (subscriptionId && isOverageBillingEnabled()) {
    const meterItemId = await getOrCreateMeterItem(subscriptionId);
    if (meterItemId) config.stripeSubscriptionItemId = meterItemId;
  }

  for (const agentId of resolution.agentIds) {
    // Raw Stripe subscription ledger (one row per subscription x agent).
    const { error: subError } = await db.from("subscriptions").upsert(
      {
        user_id: userId,
        agent_id: agentId,
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: customerId,
        status: "active",
      },
      { onConflict: "stripe_subscription_id, agent_id" },
    );

    if (subError) {
      console.error("Failed to save subscription:", subError);
      continue;
    }

    // Authoritative ownership table used to enforce run limits.
    // current_period_end is filled in by the subscription.updated / invoice.paid
    // events (the checkout session's expires_at is the payment-link expiry).
    const { error: uaError } = await db.from("user_agents").upsert(
      {
        user_id: userId,
        agent_slug: agentId,
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: customerId,
        status: "active",
        config,
        activated_at: new Date().toISOString(),
        cancelled_at: null,
      },
      { onConflict: "user_id, agent_slug" },
    );

    if (uaError) {
      console.error("Failed to activate user agent:", uaError);
      continue;
    }

    console.log(`Subscription activated: ${agentId} for ${userId}`);
  }
}

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return Response.json(
      { error: "Missing stripe-signature header" },
      { status: 400 },
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return Response.json(
      { error: "STRIPE_WEBHOOK_SECRET is not configured" },
      { status: 500 },
    );
  }

  let event: Stripe.Event;

  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch {
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  const db = createAdminClient();
  if (!db) {
    return Response.json(
      { error: "Database not configured" },
      { status: 500 },
    );
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      await activateSubscription(db, session);
      break;
    }

    case "invoice.paid": {
      // Subscription renewed — keep the entitlement active and bump the period.
      const invoice = event.data.object as unknown as WebhookInvoice;
      const subscriptionId =
        typeof invoice.subscription === "string"
          ? invoice.subscription
          : null;
      if (subscriptionId) {
        const periodEnd = invoice.period_end
          ? new Date(invoice.period_end * 1000).toISOString()
          : null;
        await db
          .from("user_agents")
          .update({
            status: "active",
            current_period_end: periodEnd,
            cancelled_at: null,
          })
          .eq("stripe_subscription_id", subscriptionId);
        console.log(`Invoice paid for subscription ${subscriptionId}`);
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as unknown as WebhookSubscription;
      const periodEnd = subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null;
      const cancelAtPeriodEnd = subscription.cancel_at_period_end === true;

      await db
        .from("subscriptions")
        .update({ status: subscription.status })
        .eq("stripe_subscription_id", subscription.id);

      // Update each agent of the subscription individually so we can record
      // `cancel_at_period_end` in the config (the dashboard shows it as a
      // "Cancels at period end" chip) without clobbering the other keys.
      const { data: agents } = await db
        .from("user_agents")
        .select("id, config")
        .eq("stripe_subscription_id", subscription.id);

      for (const agent of agents ?? []) {
        const config = {
          ...((agent.config ?? {}) as Record<string, unknown>),
          cancelAtPeriodEnd,
        };
        await db
          .from("user_agents")
          .update({
            status: subscription.status,
            current_period_end: periodEnd,
            config,
          })
          .eq("id", agent.id);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as unknown as WebhookSubscription;

      await db
        .from("subscriptions")
        .update({ status: "canceled" })
        .eq("stripe_subscription_id", subscription.id);

      await db
        .from("user_agents")
        .update({
          status: "canceled",
          cancelled_at: new Date().toISOString(),
        })
        .eq("stripe_subscription_id", subscription.id);
      break;
    }

    default:
      break;
  }

  return Response.json({ received: true });
}
