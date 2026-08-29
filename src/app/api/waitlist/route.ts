import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiErrorMessage } from "@/lib/i18n/api-errors";
import { rateLimit, RATE_LIMIT_WINDOWS } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";

// Max signups per IP per hour (emails are additionally deduped by the DB).
const WAITLIST_LIMIT = 3;

// Total available waitlist spots (mirrors MAX_SPOTS in the waitlist page).
const MAX_SPOTS = 10;

// Cookie flag so the waitlist page can show the "joined" state after a refresh.
const JOINED_COOKIE = "ac_wl_joined";

/**
 * Authoritative remaining spots: MAX_SPOTS minus the real number of signups
 * currently stored (waitlist emails are unique, so each row is one person).
 * Uses the service-role client so RLS on the table (select = authenticated
 * only) doesn't hide rows; falls back to the anon client in dev.
 */
async function getRemainingSpots(): Promise<number> {
  const supabase = createAdminClient() ?? (await createClient());
  const { count, error } = await supabase
    .from("waitlist")
    .select("id", { count: "exact", head: true });
  if (error) throw error;
  return Math.max(MAX_SPOTS - (count ?? 0), 0);
}

export async function GET() {
  try {
    const remaining = await getRemainingSpots();
    return NextResponse.json({ maxSpots: MAX_SPOTS, remaining });
  } catch (err) {
    console.error("Failed to count waitlist entries:", err);
    return NextResponse.json(
      { error: await apiErrorMessage("failedToJoinWaitlist") },
      { status: 500 },
    );
  }
}

/**
 * Provision a Supabase Auth user for the waitlist email (idempotent,
 * best-effort).
 *
 * The waitlist page only collects an email, but the owner wants every signup
 * to appear in Auth → Users so that, once the platform opens, those people are
 * already registered. The account is created with a random, never-revealed
 * password and a confirmed email: the person signs in later with Google
 * (same email → Supabase links the account) or via the "forgot password"
 * flow. The `handle_new_user` trigger also creates their `profiles` row.
 *
 * Never throws: a duplicate email (already registered, e.g. an earlier
 * signup) is expected and fine — the waitlist signup still succeeds.
 */
async function provisionAuthUser(email: string) {
  const admin = createAdminClient();
  if (!admin) return; // no service-role key — skip silently (dev fallback)
  try {
    await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      password: crypto.randomUUID() + crypto.randomUUID(),
      user_metadata: { source: "waitlist" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // A pre-existing account is the common case here (re-join, or someone
    // already signed up): log at debug level and move on.
    if (/already registered|already been registered|duplicate/i.test(msg)) {
      console.log("[waitlist] auth user already exists:", email);
    } else {
      console.error("[waitlist] failed to provision auth user:", msg);
    }
  }
}

export async function POST(request: Request) {
  try {
    const rl = await rateLimit("waitlist", getClientIp(request), {
      limit: WAITLIST_LIMIT,
      windowMs: RATE_LIMIT_WINDOWS.HOUR_MS,
    });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: await apiErrorMessage("rateLimited") },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
      );
    }

    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: await apiErrorMessage("emailRequired") },
        { status: 400 },
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: await apiErrorMessage("invalidEmailAddress") },
        { status: 400 },
      );
    }

    // Insert with the service-role client so signups are always persisted,
    // regardless of RLS on the public `waitlist` table. Falls back to the
    // anon client (RLS-dependent) only if the service role key is missing.
    const supabase = createAdminClient() ?? (await createClient());
    const { error: dbError } = await supabase
      .from("waitlist")
      .insert({ email });

    if (dbError) {
      if (dbError.code === "23505") {
        // Self-healing: a repeat join may predate auth provisioning (or it may
        // have failed silently) — try to create the user anyway; it's a no-op
        // when the account already exists.
        await provisionAuthUser(email);
        const remaining = await getRemainingSpots();
        const res = NextResponse.json(
          { error: await apiErrorMessage("alreadyOnWaitlist"), remaining },
          { status: 409 },
        );
        res.cookies.set(JOINED_COOKIE, "1", {
          path: "/",
          maxAge: 60 * 60 * 24 * 365,
          sameSite: "lax",
        });
        return res;
      }
      console.error("Failed to store waitlist entry:", dbError);
      return NextResponse.json(
        { error: await apiErrorMessage("failedToJoinWaitlist") },
        { status: 500 },
      );
    }

    // Provision the Auth user so the signup shows up in Authentication → Users.
    await provisionAuthUser(email);

    const res = NextResponse.json({
      success: true,
      remaining: await getRemainingSpots(),
    });
    res.cookies.set(JOINED_COOKIE, "1", {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    return res;
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : await apiErrorMessage("internalServerError"),
      },
      { status: 500 },
    );
  }
}
