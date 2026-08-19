import { NextResponse } from "next/server";
import { AGENT_RUNTIME } from "@/lib/agents/registry";
import { getPlan } from "@/lib/billing/pricing";
import { apiErrorMessage } from "@/lib/i18n/api-errors";

/**
 * GET /api/billing/payment-link?agentId=xxx&userId=xxx&email=xxx
 * OR
 * GET /api/billing/payment-link?planId=xxx&vertical=xxx&userId=xxx&email=xxx
 *
 * Returns a redirect to a Stripe Payment Link for the specified agent or plan.
 * The link includes metadata for automatic activation via the webhook.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const agentId = url.searchParams.get("agentId");
    const planId = url.searchParams.get("planId");
    const vertical = url.searchParams.get("vertical") as
      | "shopify"
      | "services"
      | null;
    const userId = url.searchParams.get("userId");
    const email = url.searchParams.get("email");

    // Basic input validation to avoid echoing arbitrary values into links.
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !EMAIL_RE.test(email)) {
      return NextResponse.json(
        { error: await apiErrorMessage("invalidEmail") },
        { status: 400 },
      );
    }

    let paymentLink: string | null = null;
    const metadata: Record<string, string> = {
      source: "agentcloud",
    };

    // Plan-based pricing (new system)
    if (planId && vertical) {
      const plan = getPlan(vertical, planId as "starter" | "growth");
      if (!plan) {
        return NextResponse.json(
          { error: await apiErrorMessage("invalidPlan") },
          { status: 400 },
        );
      }

      const envKey = `STRIPE_PAYMENT_LINK_${vertical.toUpperCase()}_${planId.toUpperCase()}`;
      paymentLink = process.env[envKey] || null;

      metadata.plan_id = `${vertical}-${planId}`;
      metadata.vertical = vertical;
      metadata.tokens = plan.tokens.toString();
    }
    // Agent-based pricing (legacy, for backward compatibility)
    else if (agentId) {
      const config = AGENT_RUNTIME[agentId];
      if (!config) {
        return NextResponse.json(
          { error: await apiErrorMessage("agentNotFound") },
          { status: 404 },
        );
      }

      const envKey = `STRIPE_PAYMENT_LINK_${agentId
        .replace(/[^a-z0-9]/gi, "_")
        .toUpperCase()}`;
      paymentLink = process.env[envKey] || null;

      metadata.agent_id = agentId;
    } else {
      return NextResponse.json(
        { error: await apiErrorMessage("missingAgentOrPlan") },
        { status: 400 },
      );
    }

    if (!paymentLink) {
      console.error(`Missing payment link env var`);
      return NextResponse.json(
        { error: await apiErrorMessage("paymentLinkNotConfigured") },
        { status: 500 },
      );
    }

    // Build payment link with metadata
    const paymentUrl = new URL(paymentLink);

    if (userId) {
      paymentUrl.searchParams.set("client_reference_id", userId);
      metadata.client_reference_id = userId;
    }

    if (email) {
      paymentUrl.searchParams.set("prefilled_email", email);
      metadata.email = email;
    }

    for (const [key, value] of Object.entries(metadata)) {
      paymentUrl.searchParams.set(`metadata[${key}]`, value);
    }

    return NextResponse.redirect(paymentUrl.toString());
  } catch (error) {
    console.error("Payment link error:", error);
    return NextResponse.json(
      { error: await apiErrorMessage("failedToGeneratePaymentLink") },
      { status: 500 },
    );
  }
}
