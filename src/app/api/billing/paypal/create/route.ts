import { NextResponse } from "next/server";
import { getAgentBySlug, isAvailable } from "@/lib/agents";
import { hasPlatformAccess } from "@/lib/access-code";
import { getSessionUser } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";
import { apiErrorMessage } from "@/lib/i18n/api-errors";
import { isPayPalConfigured, createPayPalProduct, createPayPalBillingPlan, createPayPalSubscription } from "@/lib/paypal/client";

/**
 * POST /api/billing/paypal/create
 * Body: { agentId: string }
 * Crea una PayPal Billing Subscription (alternativa a Stripe) e restituisce l'URL di approvazione.
 * Stesso flusso Stripe: se PAYPAL_PLAN_<AGENT> è già in env lo riusa, altrimenti crea product+plan al volo.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const agentId = body.agentId as string | undefined;
    if (!agentId) return NextResponse.json({ error: await apiErrorMessage("missingAgentOrMessages") }, { status: 400 });

    const agent = getAgentBySlug(agentId);
    if (!agent) return NextResponse.json({ error: await apiErrorMessage("agentNotFound") }, { status: 404 });

    const unlocked = await hasPlatformAccess();
    if (!isAvailable(agentId) && !unlocked) return NextResponse.json({ error: await apiErrorMessage("notSubscribed") }, { status: 400 });

    if (!isPayPalConfigured()) return NextResponse.json({ error: "PayPal is not configured (PAYPAL_CLIENT_ID/SECRET)" }, { status: 500 });

    const user = await getSessionUser();
    const userId = user?.id ?? null;
    const baseUrl = getSiteUrl();

    // Prova a riusare un plan già creato via env PAYPAL_PLAN_<AGENT> (come STRIPE_PAYMENT_LINK_*)
    const envKey = `PAYPAL_PLAN_${agentId.replace(/[^a-z0-9]/gi, "_").toUpperCase()}`;
    let planId = process.env[envKey] || "";

    if (!planId) {
      // Crea product + plan dinamicamente (cacheabile: la prossima volta metti il P-... in env)
      const productId = await createPayPalProduct(`AgentCloud — ${agent.shortName}`, agent.description);
      planId = await createPayPalBillingPlan({
        productId,
        name: `AgentCloud — ${agent.shortName}`,
        description: agent.description,
        priceCents: agent.priceCents,
      });
    }

    const customId = JSON.stringify({ agent_id: agentId, user_id: userId ?? "", source: "agentcloud" });

    const { approveUrl, id: subscriptionId } = await createPayPalSubscription({
      planId,
      returnUrl: `${baseUrl}/dashboard?paypal=success`,
      cancelUrl: `${baseUrl}/agents/${agentId}`,
      customId,
    });

    // Nota: l'attivazione vera avviene nel webhook PAYPAL (BILLING.SUBSCRIPTION.ACTIVATED)
    // che scrive su subscriptions/user_agents come Stripe. Qui restituiamo solo l'URL.
    return NextResponse.json({ url: approveUrl, subscriptionId });
  } catch (e) {
    console.error("PayPal create error:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : await apiErrorMessage("failedToGeneratePaymentLink") }, { status: 500 });
  }
}
