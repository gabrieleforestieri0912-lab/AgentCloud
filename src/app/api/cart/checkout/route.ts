import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getSessionUser } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";
import { getEnrichedCart } from "@/lib/cart";

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

/**
 * POST /api/cart/checkout — crea Stripe Checkout Session per TUTTI gli agenti nel carrello.
 * Se il carrello è vuoto → 400. Dopo il pagamento, il webhook checkout.session.completed
 * attiva gli abbonamenti e il carrello viene svuotato (gestito dal webhook o al ritorno).
 */
export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });

  const { items, cart } = await getEnrichedCart(user.id);
  if (!cart || items.length === 0) {
    return NextResponse.json({ error: "cart_empty" }, { status: 400 });
  }

  const baseUrl = getSiteUrl();

  // Stripe Checkout: una session subscription con N line_items (uno per agente).
  // Ogni line_item ha price_data dinamico. Metadata contiene lista agenti.
  const agentSlugs = items.map((i) => i.agent_slug).join(",");
  const lineItems = items.map((item) => ({
    price_data: {
      currency: "eur",
      unit_amount: item.priceCents,
      recurring: { interval: "month" as const },
      product_data: {
        name: `AgentCloud — ${item.shortName}`,
        description: item.description,
      },
    },
    quantity: item.quantity,
  }));

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: lineItems,
    subscription_data: {
      metadata: {
        agent_ids: agentSlugs,
        user_id: user.id,
        source: "agentcloud_cart",
        cart_id: cart.id,
      },
    },
    metadata: {
      agent_ids: agentSlugs,
      user_id: user.id,
      source: "agentcloud_cart",
      cart_id: cart.id,
    },
    client_reference_id: user.id,
    customer_email: user.email ?? undefined,
    success_url: `${baseUrl}/dashboard?checkout=success&cart=${cart.id}`,
    cancel_url: `${baseUrl}/cart`,
  });

  if (!session.url) {
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
  return NextResponse.json({ url: session.url });
}
