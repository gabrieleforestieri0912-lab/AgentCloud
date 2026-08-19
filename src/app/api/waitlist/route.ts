import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiErrorMessage } from "@/lib/i18n/api-errors";
import { rateLimit, RATE_LIMIT_WINDOWS } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";

// Max signups per IP per hour (emails are additionally deduped by the DB).
const WAITLIST_LIMIT = 3;

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

    const supabase = await createClient();
    const { error: dbError } = await supabase
      .from("waitlist")
      .insert({ email });

    if (dbError) {
      if (dbError.code === "23505") {
        return NextResponse.json(
          { error: await apiErrorMessage("alreadyOnWaitlist") },
          { status: 409 },
        );
      }
      console.error("Failed to store waitlist entry:", dbError);
      return NextResponse.json(
        { error: await apiErrorMessage("failedToJoinWaitlist") },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
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
