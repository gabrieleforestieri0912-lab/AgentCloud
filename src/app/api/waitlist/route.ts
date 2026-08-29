import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiErrorMessage } from "@/lib/i18n/api-errors";
import { rateLimit, RATE_LIMIT_WINDOWS } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { isAdminEmail } from "@/lib/admin-access";
import {
  MAX_SPOTS,
  getRemainingSpots,
  provisionAuthUser,
} from "@/lib/waitlist";

// Max signups per IP per hour (emails are additionally deduped by the DB).
const WAITLIST_LIMIT = 3;

// Cookie flag so the waitlist page can show the "joined" state after a refresh.
const JOINED_COOKIE = "ac_wl_joined";
// Remembers which email joined, so the server can re-verify the signup against
// the database (e.g. after the owner deletes entries) instead of trusting the
// client-side cookie forever.
const JOINED_EMAIL_COOKIE = "ac_wl_email";
// Grants platform access during the waitlist phase — set ONLY when the
// submitted email is one of the admin emails (checked server-side). The
// proxy lets holders through the waitlist gate; everyone else stays on
// /waitlist until the phase is lifted.
const ADMIN_COOKIE = "ac_wl_admin";

const COOKIE_OPTIONS = {
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
  sameSite: "lax" as const,
};

export async function GET() {
  try {
    const remaining = await getRemainingSpots();

    // If this browser previously joined, verify the signup still exists in the
    // database (the owner may have deleted entries). `verified` is true only
    // when the check actually ran: on verification errors we keep the cookie
    // state (fail-safe) instead of dropping someone's access on a hiccup.
    let joined = false;
    let verified = false;
    const joinedEmail = (await cookies()).get(JOINED_EMAIL_COOKIE)?.value;
    if (joinedEmail) {
      const supabase = createAdminClient() ?? (await createClient());
      const { data, error } = await supabase
        .from("waitlist")
        .select("id")
        .eq("email", joinedEmail)
        .maybeSingle();
      if (!error) {
        verified = true;
        joined = Boolean(data);
      }
    }

    return NextResponse.json({ maxSpots: MAX_SPOTS, remaining, joined, verified });
  } catch (err) {
    console.error("Failed to read waitlist state:", err);
    return NextResponse.json(
      { error: await apiErrorMessage("failedToJoinWaitlist") },
      { status: 500 },
    );
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
        res.cookies.set(JOINED_COOKIE, "1", COOKIE_OPTIONS);
        res.cookies.set(JOINED_EMAIL_COOKIE, email, COOKIE_OPTIONS);
        return res;
      }
      console.error("Failed to store waitlist entry:", dbError);
      return NextResponse.json(
        { error: await apiErrorMessage("failedToJoinWaitlist") },
        { status: 500 },
      );
    }

    // Provision the Auth user so the signup shows up in Authentication → Users.    await provisionAuthUser(email);
    const res = NextResponse.json({
      success: true,
      remaining: await getRemainingSpots(),
      adminAccess: isAdminEmail(email),
    });
    res.cookies.set(JOINED_COOKIE, "1", COOKIE_OPTIONS);
    res.cookies.set(JOINED_EMAIL_COOKIE, email, COOKIE_OPTIONS);
    if (isAdminEmail(email)) {
      res.cookies.set(ADMIN_COOKIE, "1", COOKIE_OPTIONS);
    }
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
