import { createAdminClient } from "@/lib/supabase/admin";
import { verifyPayPalWebhook } from "@/lib/paypal/client";

/**
 * POST /api/billing/paypal/webhook
 * Verifies PayPal signature (if PAYPAL_WEBHOOK_ID set) and mirrors Stripe webhook
 * logic for user_agents/subscriptions. Events: BILLING.SUBSCRIPTION.ACTIVATED,
 * BILLING.SUBSCRIPTION.CANCELLED, PAYMENT.SALE.COMPLETED, etc.
 */
export async function POST(req: Request) {
  const rawBody = await req.text();
  let event: { event_type?: string; resource?: Record<string, unknown> } | null = null;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const verified = await verifyPayPalWebhook(req, rawBody);
  if (!verified) {
    return Response.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  const db = createAdminClient();
  if (!db) return Response.json({ error: "DB not configured" }, { status: 500 });

  const type = event?.event_type || "";
  const resource = event?.resource as Record<string, unknown> | undefined;

  // custom_id is JSON we set at create: { agent_id, user_id }
  const customIdRaw = (resource?.custom_id as string) || (resource as Record<string, unknown>)?.custom_id as string;
  let agentId: string | null = null;
  let userId: string | null = null;
  if (customIdRaw) {
    try {
      const parsed = JSON.parse(customIdRaw) as { agent_id?: string; user_id?: string };
      agentId = parsed.agent_id ?? null;
      userId = parsed.user_id ?? null;
    } catch {
      // fallback: try metadata
    }
  }
  // Fallback to resource fields
  const subscriptionId = (resource?.id as string) || (resource?.billing_agreement_id as string) || null;

  if (type === "BILLING.SUBSCRIPTION.ACTIVATED") {
    if (!agentId || !userId) {
      console.error("PayPal webhook: missing agent/user for ACTIVATED", resource);
      return Response.json({ received: true });
    }
    await db.from("subscriptions").upsert(
      { user_id: userId, agent_id: agentId, stripe_subscription_id: subscriptionId, status: "active" } as never,
      { onConflict: "stripe_subscription_id, agent_id" },
    );
    await db.from("user_agents").upsert(
      {
        user_id: userId,
        agent_slug: agentId,
        stripe_subscription_id: subscriptionId,
        status: "active",
        config: { paypal: true, subscriptionId },
        activated_at: new Date().toISOString(),
        cancelled_at: null,
      } as never,
      { onConflict: "user_id, agent_slug" },
    );
    console.log(`PayPal subscription activated: ${agentId} for ${userId}`);
  }

  if (type === "BILLING.SUBSCRIPTION.CANCELLED" || type === "BILLING.SUBSCRIPTION.SUSPENDED") {
    if (subscriptionId) {
      await db.from("subscriptions").update({ status: "canceled" }).eq("stripe_subscription_id", subscriptionId);
      await db.from("user_agents").update({ status: "canceled", cancelled_at: new Date().toISOString() }).eq("stripe_subscription_id", subscriptionId);
    }
  }

  return Response.json({ received: true });
}
