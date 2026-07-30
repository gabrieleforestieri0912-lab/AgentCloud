import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(key, {});
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

  let event: Stripe.Event;

  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch {
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Handle checkout.session.completed (Payment Link or Checkout Session)
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata || {};
    const { client_reference_id, agent_id, email } = metadata;

    // Extract customer info
    const userId = client_reference_id || email; // Use email as fallback identifier
    const agentId = agent_id;

    if (!agentId) {
      console.error("Missing agent_id in checkout session metadata");
      return Response.json({ error: "Missing agent_id" }, { status: 400 });
    }

    const supabase = await createClient();

    // Upsert subscription (handle both new and existing)
    const subscriptionData: {
      user_id: string;
      agent_id: string;
      stripe_subscription_id: string | null;
      status: string;
    } = {
      user_id: userId || email || "unknown",
      agent_id: agentId,
      stripe_subscription_id:
        typeof session.subscription === "string" ? session.subscription : null,
      status: "active",
    };

    const { error } = await supabase
      .from("subscriptions")
      .upsert(subscriptionData, {
        onConflict: "stripe_subscription_id",
      });

    if (error) {
      console.error("Failed to save subscription:", error);
      return Response.json({ error: "Database error" }, { status: 500 });
    }

    // Also create/update user_agents entry
    if (userId && userId !== "unknown") {
      await supabase.from("user_agents").upsert(
        {
          user_id: userId,
          agent_slug: agentId,
          stripe_subscription_id: session.subscription,
          status: "active",
          activated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id, agent_slug",
        },
      );
    }

    console.log(`Subscription activated: ${agentId} for ${userId || email}`);
  }

  // Handle subscription updates
  if (event.type === "customer.subscription.updated") {
    const subscription = event.data.object as Stripe.Subscription;
    const supabase = await createClient();

    const { error } = await supabase
      .from("subscriptions")
      .update({ status: subscription.status })
      .eq("stripe_subscription_id", subscription.id);

    if (error) {
      console.error("Failed to update subscription:", error);
    }
  }

  // Handle subscription cancellations
  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    const supabase = await createClient();

    const { error } = await supabase
      .from("subscriptions")
      .update({ status: "canceled" })
      .eq("stripe_subscription_id", subscription.id);

    if (error) {
      console.error("Failed to cancel subscription:", error);
    }
  }

  return Response.json({ received: true });
}
