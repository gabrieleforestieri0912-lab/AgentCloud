import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSafeRedirectPath } from "@/lib/safe-redirect-path";

/**
 * GET /auth/callback?code=...&next=/dashboard
 *
 * OAuth (Google) and email-confirmation links from Supabase land here with a
 * short-lived `code` (PKCE flow). The code must be exchanged for a session
 * before the user can access protected pages — without this route the session
 * is never created and the user bounces back to /login.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback`);
  }

  // Only allow same-origin relative destinations to avoid open redirects.
  const safeNext = isSafeRedirectPath(next) ? next : "/dashboard";
  return NextResponse.redirect(`${origin}${safeNext}`);
}
