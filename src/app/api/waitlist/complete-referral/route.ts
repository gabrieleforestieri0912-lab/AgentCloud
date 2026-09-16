import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { completePendingReferrals } from "@/lib/waitlist";

/**
 * POST /api/waitlist/complete-referral
 * Authenticated user calls this after reaching auth_method_completed=true
 * to mark any pending referrals (where they are the referred_email) as completed.
 * Idempotent — no error if nothing pending.
 * Used by login/signup client after PATCH auth_method_completed.
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    await completePendingReferrals(user.email, user.id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false });
  }
}
