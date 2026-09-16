import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/waitlist/ranking
 * Live ranking per Open Decision #6: RANK() OVER (ORDER BY points DESC, waitlist_joined_at ASC)
 * Returns: position, total, points, referrals_completed, instagram_follow, referral_code
 * Points: 3 per completed referral + 1 per instagram_follow
 */
export async function GET() {
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "db not configured" }, { status: 500 });

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

  if (!email) {
    return NextResponse.json({ error: "not in waitlist" }, { status: 401 });
  }

  // Try new points-aware RPC first
  try {
    const { data, error } = await (admin as unknown as {
      rpc: (name: string, params: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
    }).rpc("waitlist_ranking", { p_email: email });

    if (!error && Array.isArray(data) && data.length > 0) {
      const row = data[0] as {
        position: number | null;
        total: number | null;
        points: number | null;
        referrals_completed: number | null;
        instagram_follow: number | null;
        referral_code: string | null;
      };
      if (row.position !== null) {
        return NextResponse.json({
          position: row.position,
          total: row.total,
          points: row.points ?? 0,
          referralsCompleted: row.referrals_completed ?? 0,
          instagramFollow: row.instagram_follow ?? 0,
          referralCode: row.referral_code,
          breakdown: {
            referrals: (row.referrals_completed ?? 0) * 3,
            instagram: (row.instagram_follow ?? 0) * 1,
          },
        });
      }
    }
  } catch {}

  // Fallback to legacy position (no points) — keeps endpoint working before migration applied
  try {
    const { data } = await (admin as unknown as {
      rpc: (name: string, params: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
    }).rpc("waitlist_position", { p_email: email });
    if (Array.isArray(data) && data.length > 0) {
      const row = data[0] as { position: number; total: number; referral_code: string | null; referral_count: number };
      return NextResponse.json({
        position: row.position,
        total: row.total,
        points: 0,
        referralsCompleted: 0,
        instagramFollow: 0,
        referralCode: row.referral_code,
        breakdown: { referrals: 0, instagram: 0 },
        fallback: true,
      });
    }
  } catch {}

  return NextResponse.json({ error: "not found" }, { status: 404 });
}
