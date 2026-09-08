import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getAgentBySlug, isAvailable } from "@/lib/agents";
import { hasPlatformAccess } from "@/lib/access-code";
import { getSessionUser } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";
import { apiErrorMessage } from "@/lib/i18n/api-errors";

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

/**
 * POST /api/checkout
 *
 * Body: { agentId: string }
 *
 * Crea una Stripe Checkout Session (modalità subscription) con un prezzo
 * dinamico ricavato dal priceCents dell'agente — nessun prodotto Stripe
 * pre-creato. La sessione porta i metadati così il webhook di billing può
 * attivare l'abbonamento in automatico.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const agentId = body.agentId as string | undefined;

    if (!agentId) {
      return NextResponse.json(
        { error: await apiErrorMessage("missingAgentOrMessages") },
        { status: 400 },
      );
    }

    const agent = getAgentBySlug(agentId);
    if (!agent) {
      return NextResponse.json(
        { error: await apiErrorMessage("agentNotFound") },
        { status: 404 },
      );
    }

    // La disponibilità vale per il pubblico: i possessori del codice (il
    // cliente di test) possono configurare/comprare ogni agente, inclusi
    // quelli "coming soon".
    const unlocked = await hasPlatformAccess();
    if (!isAvailable(agentId) && !unlocked) {
      return NextResponse.json(
        { error: await apiErrorMessage("notSubscribed") },
        { status: 400 },
      );
    }

    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe is not configured" },
        { status: 500 },
      );
    }

    // Risolve l'utente loggato per collegare l'abbonamento.
    const user = await getSessionUser();
    const userId = user?.id ?? null;
    const email = user?.email ?? null;

    const baseUrl = getSiteUrl();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      // Abilita Klarna e Amazon Pay oltre alla carta (richiesto per Stripe Checkout subscription)
      payment_method_types: ["card", "klarna", "amazon_pay"],
      // Prezzo dinamico — nessun prodotto pre-creato su Stripe.
      line_items: [
        {
          price_data: {
            currency: "eur",
            unit_amount: agent.priceCents,
            recurring: { interval: "month" },
            product_data: {
              name: `AgentCloud — ${agent.shortName}`,
              description: agent.description,
            },
          },
          quantity: 1,
        },
      ],
      subscription_data: {
        metadata: {
          agent_id: agentId,
          user_id: userId ?? "",
          source: "agentcloud",
        },
      },
      metadata: {
        agent_id: agentId,
        user_id: userId ?? "",
        source: "agentcloud",
      },
      // Passa lo user id così il webhook può risolvere l'account.
      ...(userId ? { client_reference_id: userId } : {}),
      ...(email ? { customer_email: email } : {}),
      success_url: `${baseUrl}/dashboard?checkout=success`,
      cancel_url: `${baseUrl}/agents/${agentId}`,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Failed to create checkout session" },
        { status: 500 },
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: await apiErrorMessage("failedToGeneratePaymentLink") },
      { status: 500 },
    );
  }
}
