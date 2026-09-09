import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSafeRedirectPath } from "@/lib/safe-redirect-path";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const BYPASS_ENABLED = process.env.ENABLE_WAITLIST_BETA_BYPASS === "true";

/**
 * GET /auth/callback?code=...&next=/dashboard
 *
 * Qui arrivano i link OAuth (Google) e di conferma email di Supabase con un
 * `code` monouso e a breve scadenza (flusso PKCE). Il codice va scambiato con
 * una sessione prima che l'utente possa accedere alle pagine protette — senza
 * questa route la sessione non viene mai creata e l'utente rimbalza su /login.
 *
 * Beta access flow: after session is created, check for waitlist_session cookie.
 * If present, call complete-waitlist-redemption to assign beta role.
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

  // --- Beta access: complete waitlist redemption if pending session cookie exists ---
  if (BYPASS_ENABLED) {
    const cookieHeader = request.headers.get("cookie") || "";
    const sessionMatch = cookieHeader.match(/waitlist_session=([^;]+)/);
    const sessionToken = sessionMatch?.[1];

    if (sessionToken) {
      try {
        // Get the access token for auth header
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          await fetch(`${SUPABASE_URL}/functions/v1/complete-waitlist-redemption`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${session.access_token}`,
              "apikey": SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({ session_token: sessionToken }),
          });
        }
      } catch (e) {
        // Non-blocking: if redemption fails, user still has normal account
        console.error("Waitlist redemption failed (non-blocking):", e);
      }
    }
  }

  // Consenti solo destinazioni relative same-origin per evitare open redirect.
  const safeNext = isSafeRedirectPath(next) ? next : "/dashboard";
  const response = NextResponse.redirect(`${origin}${safeNext}`);

  // Clear the waitlist_session cookie after attempted redemption
  if (BYPASS_ENABLED) {
    const cookieHeader = request.headers.get("cookie") || "";
    if (cookieHeader.includes("waitlist_session=")) {
      response.cookies.set("waitlist_session", "", {
        maxAge: 0,
        path: "/",
        sameSite: "lax",
        secure: true,
      });
    }
  }

  return response;
}
