/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextResponse } from "next/server";
import { AGENT_RUNTIME } from "@/lib/agents/registry";
import { getPricing, getPlan } from "@/lib/billing/pricing";

/**
 * GET /api/billing/payment-link?agentId=xxx&userId=xxx&email=xxx
 * OR
 * GET /api/billing/payment-link?planId=xxx&vertical=xxx&userId=xxx&email=xxx
 *
 * Returns a Stripe Payment Link for the specified agent or plan.
 * The link includes metadata for automatic tenant activation via webhook.
 *
 * Query params (agent-based):
 * - agentId: The agent slug (required)
 * - userId: Clerk user ID (optional, for logged-in users)
 * - email: Customer email (optional, for guest checkout)
 *
 * Query params (plan-based):
 * - planId: "starter" or "growth" (required)
 * - vertical: "shopify" or "services" (required)
 * - userId: Clerk user ID (optional, for logged-in users)
 * - email: Customer email (optional, for guest checkout)
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

    let paymentLink: string | null = null;
    const metadata: Record<string, string> = {
      source: "agentcloud",
    };

    // Plan-based pricing (new system)
    if (planId && vertical) {
      const plan = getPlan(vertical, planId as "starter" | "growth");
      if (!plan) {
        return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
      }

      // Get payment link from environment variable
      const envKey = `STRIPE_PAYMENT_LINK_${vertical.toUpperCase()}_${planId.toUpperCase()}`;
      paymentLink = process.env[envKey] || null;

      metadata.plan_id = `${vertical}-${planId}`;
      metadata.vertical = vertical;
      metadata.conversations = plan.conversations.toString();
    }
    // Agent-based pricing (legacy, for backward compatibility)
    else if (agentId) {
      const config = AGENT_RUNTIME[agentId];
      if (!config) {
        return NextResponse.json({ error: "Agent not found" }, { status: 404 });
      }

      // Get payment link from environment variable
      const envKey = `STRIPE_PAYMENT_LINK_${agentId.replace(/[^a-z0-9]/gi, "_").toUpperCase()}`;
      paymentLink = process.env[envKey] || null;

      metadata.agent_id = agentId;
    } else {
      return NextResponse.json(
        { error: "Missing agentId or planId+vertical" },
        { status: 400 },
      );
    }

    if (!paymentLink) {
      console.error(`Missing payment link env var`);
      return NextResponse.json(
        { error: "Payment link not configured" },
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

    // Add metadata
    for (const [key, value] of Object.entries(metadata)) {
      paymentUrl.searchParams.set(`metadata[${key}]`, value);
    }

    return NextResponse.redirect(paymentUrl.toString());
  } catch (error) {
    console.error("Payment link error:", error);
    return NextResponse.json(
      { error: "Failed to generate payment link" },
      { status: 500 },
    );
  }
}
