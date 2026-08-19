import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteUrl } from "@/lib/site-url";
import { getSessionUser } from "@/lib/supabase/server";

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, {});
}

/**
 * Resolve the Stripe customer id for a user from their agent subscriptions.
 * `user_agents` is the authoritative ownership table: every active agent row
 * carries the customer id of the Stripe checkout that purchased it.
 */
async function resolveStripeCustomerId(userId: string): Promise<string | null> {
  const db = createAdminClient();
  if (!db) return null;

  const { data } = await db
    .from("user_agents")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .not("stripe_customer_id", "is", null)
    .limit(1);

  return data?.[0]?.stripe_customer_id ?? null;
}

/**
 * GET /api/billing/portal
 *
 * Opens the Stripe Customer Billing Portal for the signed-in user so they can
 * self-serve their subscription: cancel it (at the end of the already paid
 * period by default), update the payment method, download invoices, etc.
 *
 * The route is protected by the Clerk middleware (not in the public route
 * list) and re-checks the session here as defense-in-depth.
 *
 * When no Stripe customer exists (or Stripe is unreachable) the user is sent
 * back to /dashboard with `?billing=error`, where the dashboard shows a
 * notice.
 */
export async function GET(req: Request) {
  const user = await getSessionUser();
  const userId = user?.id ?? null;
  if (!userId) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.redirect(new URL("/dashboard?billing=error", req.url));
  }

  const customerId = await resolveStripeCustomerId(userId);
  if (!customerId) {
    return NextResponse.redirect(new URL("/dashboard?billing=error", req.url));
  }

  try {
    const baseUrl = getSiteUrl();
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${baseUrl}/dashboard`,
    });
    return NextResponse.redirect(session.url);
  } catch (error) {
    console.error("Failed to open billing portal:", error);
    return NextResponse.redirect(new URL("/dashboard?billing=error", req.url));
  }
}
