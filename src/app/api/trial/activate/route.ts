import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const TRIAL_DURATION_DAYS = 30;

/**
 * POST /api/trial/activate
 *
 * Body: { agent_slug: string }
 *
 * Activates a 1-month free trial for the authenticated user.
 * Only works if:
 * - User is authenticated
 * - User has no existing user_agents rows (first agent selection)
 * - The agent_slug exists in the agents catalog
 *
 * Creates a user_agents row with:
 * - status: "trial"
 * - current_period_end: now + 30 days
 * - activated_at: now
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const agentSlug = body?.agent_slug;

  if (!agentSlug || typeof agentSlug !== "string") {
    return NextResponse.json({ error: "agent_slug required" }, { status: 400 });
  }

  // Validate slug exists in agents catalog
  const validSlugs = [
    "email-manager",
    "business-manager",
    "personal-assistant",
    "calendar-booking",
    "seo-agent",
    "lead-capture",
    "support-agent",
    "copywriter",
    "finance-manager",
    "shopify-agent",
  ];

  if (!validSlugs.includes(agentSlug)) {
    return NextResponse.json({ error: "invalid agent" }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "db not configured" }, { status: 500 });
  }

  // Check if user already has any user_agents (trial or active)
  const { data: existing } = await admin
    .from("user_agents")
    .select("id, status")
    .eq("user_id", user.id);

  if (existing && existing.length > 0) {
    // User already has an agent — allow adding more only if all are expired trials
    const activeTrials = existing.filter(
      (e) => e.status === "trial" || e.status === "active"
    );
    if (activeTrials.length > 0) {
      return NextResponse.json(
        { error: "already_has_agent", existing: activeTrials.map((e) => e.status) },
        { status: 409 }
      );
    }
  }

  // Check if this specific agent is already owned
  const { data: duplicateCheck } = await admin
    .from("user_agents")
    .select("id")
    .eq("user_id", user.id)
    .eq("agent_slug", agentSlug)
    .maybeSingle();

  if (duplicateCheck) {
    return NextResponse.json({ error: "agent_already_owned" }, { status: 409 });
  }

  // Calculate trial end date (30 days from now)
  const now = new Date();
  const trialEnd = new Date(now.getTime() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000);

  // Insert trial agent
  const { error: insertError } = await admin.from("user_agents").insert({
    user_id: user.id,
    agent_slug: agentSlug,
    status: "trial",
    config: {
      source: "waitlist_trial",
      trialStartedAt: now.toISOString(),
      activatedVia: "trial",
    },
    activated_at: now.toISOString(),
    current_period_end: trialEnd.toISOString(),
  });

  if (insertError) {
    console.error("[Trial] Failed to activate trial:", insertError);
    return NextResponse.json({ error: "activation_failed" }, { status: 500 });
  }

  // Update profile to mark trial agent selected
  await admin
    .from("profiles")
    .update({ auth_method_completed: true })
    .eq("id", user.id);

  console.log(
    `[Trial] Activated trial for agent=${agentSlug} user=${user.id} expires=${trialEnd.toISOString()}`
  );

  return NextResponse.json({
    success: true,
    agent_slug: agentSlug,
    trial_ends_at: trialEnd.toISOString(),
  });
}
