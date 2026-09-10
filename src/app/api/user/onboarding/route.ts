import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/user/onboarding
 *
 * Body: { type: "chat" | "dashboard" }
 *
 * Marks the onboarding tour as completed for the authenticated user.
 * Updates the corresponding flag in profiles table.
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
  const type = body?.type;

  if (type !== "chat" && type !== "dashboard") {
    return NextResponse.json({ error: "invalid type" }, { status: 400 });
  }

  const column =
    type === "chat" ? "has_seen_chat_onboarding" : "has_seen_dashboard_onboarding";

  const { error } = await supabase
    .from("profiles")
    .update({ [column]: true })
    .eq("id", user.id);

  if (error) {
    console.error(`[Onboarding] Failed to mark ${type}:`, error);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

/**
 * GET /api/user/onboarding
 *
 * Returns the onboarding state for the authenticated user.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("has_seen_chat_onboarding, has_seen_dashboard_onboarding")
    .eq("id", user.id)
    .maybeSingle();

  return NextResponse.json({
    chat: profile?.has_seen_chat_onboarding ?? false,
    dashboard: profile?.has_seen_dashboard_onboarding ?? false,
  });
}
