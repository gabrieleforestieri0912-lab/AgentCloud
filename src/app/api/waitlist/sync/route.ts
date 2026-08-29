import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { syncAuthUsers } from "@/lib/waitlist";
import { getCurrentAdminStatus } from "@/lib/admin-access";

// The admin cookie — set server-side on waitlist signup when the submitted
// email is an admin address. Mirrors the constant in /api/waitlist.
const ADMIN_COOKIE = "ac_wl_admin";

/**
 * Idempotent backfill: ensure every email in the waitlist table also exists in
 * Supabase Auth (Authentication → Users). Called manually (e.g. by the owner)
 * to repair rows that predate auth provisioning or failed silently. Uses the
 * service-role key, so it runs correctly in production even when the local
 * .env only holds demo keys.
 *
 * Protected: requires an authenticated admin session OR the admin cookie, so
 * a stranger can't hit this and create accounts for arbitrary emails.
 *
 * GET /api/waitlist/sync  →  { total, ok }
 * 401 if not (admin) visitor.
 */
export async function GET() {
  const adminSession = await getCurrentAdminStatus();
  const adminCookie = (await cookies()).get(ADMIN_COOKIE)?.value === "1";
  const isAdmin = adminSession.isAdmin || adminCookie;
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncAuthUsers();
    return NextResponse.json(result);
  } catch (err) {
    console.error("[waitlist] sync failed:", err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}