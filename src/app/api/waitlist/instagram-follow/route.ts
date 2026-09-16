import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/waitlist/instagram-follow
 * Self-report only for v1 (Open Decision #1): user clicks "I followed" after
 * visiting https://www.instagram.com/_agentcloud/. No Graph API verification.
 * Awards 1 point one-time (Open Decision #3), enforced via DB unique (user_id, action_type).
 */
export async function POST() {
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "db not configured" }, { status: 500 });

  let email: string | null = null;
  let userId: string | null = null;

  // Try auth session first
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) {
      email = user.email;
      userId = user.id;
    }
  } catch {}

  // Fallback to waitlist cookie
  if (!email) {
    const c = await cookies();
    email = c.get("ac_wl_email")?.value ?? null;
  }

  if (!email) {
    return NextResponse.json({ error: "not in waitlist" }, { status: 401 });
  }

  // Resolve waitlist id for this email (source for user_id in social_actions)
  const { data: waitlistRow } = await admin
    .from("waitlist")
    .select("id")
    .eq("email", email.toLowerCase())
    .maybeSingle();

  if (!waitlistRow) {
    return NextResponse.json({ error: "not in waitlist" }, { status: 404 });
  }

  const waitlistId = (waitlistRow as { id: string }).id;
  // Prefer waitlist id as user_id for the points view (waitlist_points joins on waitlist.id)
  // Also try to use auth user id if available and waitlist_points could be joined either way,
  // but spec's social_actions user_id should match waitlist.id for ranking to work.
  // We store waitlist.id.
  const targetUserId = waitlistId;

  // Check existing (for nicer 409 message)
  const { data: existing } = await admin
    .from("waitlist_social_actions")
    .select("id")
    .eq("user_id", targetUserId)
    .eq("action_type", "instagram_follow")
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ success: true, alreadyCompleted: true, points: 1 }, { status: 200 });
  }

  const { error } = await admin.from("waitlist_social_actions").insert({
    user_id: targetUserId,
    action_type: "instagram_follow",
  });

  if (error) {
    if (error.code === "23505") {
      // Unique violation -> already completed
      return NextResponse.json({ success: true, alreadyCompleted: true, points: 1 }, { status: 200 });
    }
    console.error("[waitlist] instagram_follow insert failed", error);
    return NextResponse.json({ error: "failed to record" }, { status: 500 });
  }

  return NextResponse.json({ success: true, alreadyCompleted: false, points: 1 });
}

export async function GET() {
  // Allow frontend to check if already completed
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ completed: false }, { status: 200 });

  let email: string | null = null;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) email = user.email;
  } catch {}
  if (!email) {
    const c = await cookies();
    email = c.get("ac_wl_email")?.value ?? null;
  }
  if (!email) return NextResponse.json({ completed: false });

  const { data: waitlistRow } = await admin.from("waitlist").select("id").eq("email", email.toLowerCase()).maybeSingle();
  if (!waitlistRow) return NextResponse.json({ completed: false });

  const waitlistId = (waitlistRow as { id: string }).id;
  const { data } = await admin.from("waitlist_social_actions").select("id").eq("user_id", waitlistId).eq("action_type", "instagram_follow").maybeSingle();
  return NextResponse.json({ completed: Boolean(data) });
}
