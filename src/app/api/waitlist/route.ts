import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiErrorMessage } from "@/lib/i18n/api-errors";
import { rateLimit, RATE_LIMIT_WINDOWS } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";

// Max signups per IP per hour (emails are additionally deduped by the DB).
const WAITLIST_LIMIT = 3;

// Cookie flag so the waitlist page can show the "joined" state after a refresh.
const JOINED_COOKIE = "ac_wl_joined";

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
        const res = NextResponse.json(
          { error: await apiErrorMessage("alreadyOnWaitlist") },
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

    const res = NextResponse.json({ success: true });
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
