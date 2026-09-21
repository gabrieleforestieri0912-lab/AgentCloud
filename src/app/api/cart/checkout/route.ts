import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getSessionUser } from "@/lib/supabase/server";
import { resolveIsAdmin } from "@/lib/admin-access";
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
 *
 * ADMIN: gli admin hanno accesso a tutti gli agenti e non devono pagare —
 * la route rifiuta con 403 `admin_no_checkout` (la UI nasconde già il bottone).
 */
export async function POST() {
  const user = await getSessionUser();
  const effectiveUserId = user?.id ?? null;
  const effectiveEmail = user?.email ?? null;
  if (!effectiveUserId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // ADMIN: nessun checkout Stripe — accesso già incluso.
  if (await resolveIsAdmin(user)) {
    return NextResponse.json({ error: "admin_no_checkout" }, { status: 403 });
  }

  // BETA BYPASS: beta_tester/internal_qa skip cart checkout entirely
  // Remove/disable via ENABLE_WAITLIST_BETA_BYPASS=false before Stripe goes live.
  if (process.env.ENABLE_WAITLIST_BETA_BYPASS === "true" && user) {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    if (admin) {
      const { data: profile } = await admin
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      if (profile?.role === "beta_tester" || profile?.role === "internal_qa") {
        // Beta users: clear cart and go to chat with all agents
        const { items: cartItems } = await getEnrichedCart(effectiveUserId);
        if (cartItems.length > 0) {
          const slugs = cartItems.map((i) => i.agent_slug).join(",");
          // Clear the cart (fix: cancella via cart_id, non user_id inesistente su cart_items)
          const db = createAdminClient();
          if (db && user && cartItems[0]) {
            const { data: cart } = await db.from("carts").select("id").eq("user_id", user.id).eq("status", "active").maybeSingle();
            if (cart) await db.from("cart_items").delete().eq("cart_id", cart.id);
          }
          return NextResponse.json({
            url: `${process.env.NEXT_PUBLIC_SITE_URL || ""}/chat${slugs ? `?agent=${slugs.split(",")[0]}` : ""}`,
            beta_bypass: true,
          });
        }
        return NextResponse.json({
          url: `${process.env.NEXT_PUBLIC_SITE_URL || ""}/chat`,
          beta_bypass: true,
        });
      }
    }
  }

  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });

  const { items, cart } = await getEnrichedCart(effectiveUserId);
  if (!cart || items.length === 0) {
    return NextResponse.json({ error: "cart_empty" }, { status: 400 });
  }

  const baseUrl = getSiteUrl();

  // Stripe Checkout: una session subscription con N line_items (uno per agente/bundle).
  // Ogni line_item ha price_data dinamico. Metadata contiene lista agenti.
  const agentSlugs = items.map((i) => i.agent_slug).join(",");
  const lineItems = items.map((item) => {
    // Bundle: interval dipende dal periodo
    if (item.type === "bundle") {
      const period = (item as unknown as { period?: string }).period as string;
      if (period === "quarterly") {
        return {
          price_data: {
            currency: "eur",
            unit_amount: item.priceCents,
            recurring: { interval: "month" as const, interval_count: 3 },
            product_data: {
              name: `AgentCloud — ${item.shortName} (Trimestrale)`,
              description: item.description,
            },
          },
          quantity: item.quantity,
        };
      }
      if (period === "yearly") {
        return {
          price_data: {
            currency: "eur",
            unit_amount: item.priceCents,
            recurring: { interval: "year" as const },
            product_data: {
              name: `AgentCloud — ${item.shortName} (Annuale)`,
              description: item.description,
            },
          },
          quantity: item.quantity,
        };
      }
    }
    return {
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
    };
  });

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card", "klarna", "amazon_pay"],
    line_items: lineItems,
    subscription_data: {
      metadata: {
        agent_ids: agentSlugs,
        user_id: effectiveUserId,
        source: "agentcloud_cart",
        cart_id: cart.id,
      },
    },
    metadata: {
      agent_ids: agentSlugs,
      user_id: effectiveUserId,
      source: "agentcloud_cart",
      cart_id: cart.id,
    },
    client_reference_id: effectiveUserId,
    customer_email: effectiveEmail ?? undefined,
    success_url: `${baseUrl}/dashboard?checkout=success&cart=${cart.id}`,
    cancel_url: `${baseUrl}/cart`,
  });

  if (!session.url) {
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
  return NextResponse.json({ url: session.url });
}
