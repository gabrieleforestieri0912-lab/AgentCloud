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
 * Risolve lo Stripe customer id di un utente dai suoi abbonamenti agente.
 * `user_agents` è la tabella autoritativa di proprietà: ogni riga di agente
 * attivo porta il customer id del checkout Stripe che l'ha acquistato.
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
 * Apre lo Stripe Customer Billing Portal per l'utente loggato così può gestire
 * da solo il proprio abbonamento: cancellarlo (a fine periodo già pagato di
 * default), aggiornare il metodo di pagamento, scaricare le fatture, ecc.
 *
 * La rotta è protetta dal middleware (non è nella lista delle rotte pubbliche)
 * e qui la sessione viene ricontrollata come defense-in-depth.
 *
 * Quando non esiste alcun customer Stripe (o Stripe non è raggiungibile)
 * l'utente torna a /dashboard con `?billing=error`, dove la dashboard mostra
 * un avviso.
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
