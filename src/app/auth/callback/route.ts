import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSafeRedirectPath } from "@/lib/safe-redirect-path";
import { ensureWaitlistEntry } from "@/lib/waitlist";
import { hasLaunched } from "@/lib/waitlist-constants";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const BYPASS_ENABLED = process.env.ENABLE_WAITLIST_BETA_BYPASS === "true";

const COOKIE_OPTIONS = {
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
  sameSite: "lax" as const,
};

/**
 * GET /auth/callback?code=...&next=/dashboard
 *
 * Qui arrivano i link OAuth (Google) e di conferma email di Supabase con un
 * `code` monouso e a breve scadenza (flusso PKCE). Il codice va scambiato con
 * una sessione prima che l'utente possa accedere alle pagine protette.
 *
 * Se l'accesso proviene dalla waitlist (o se la piattaforma è in fase pre-lancio),
 * l'utente viene iscritto automaticamente alla waitlist e reindirizzato a /waitlist
 * con i cookie di stato coda valorizzati.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  const refFromParam = searchParams.get("ref");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback`);
  }

  // --- Set auth_method_completed = true for this user ---
  // Google OAuth = full auth method, so mark as completed.
  let userId: string | null = null;
  let userEmail: string | null = null;
  let hasAgents = false;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      userId = user.id;
      userEmail = user.email ?? null;
      await supabase
        .from("profiles")
        .update({ auth_method_completed: true })
        .eq("id", user.id);

      // Check if user already has any agents (trial or active)
      const { data: existingAgents } = await supabase
        .from("user_agents")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);
      hasAgents = (existingAgents?.length ?? 0) > 0;
    }
  } catch {
    // Non-blocking: auth gate will catch on next request if needed
  }

  // --- Waitlist flow: se l'utente proviene dalla waitlist o il lancio non è ancora avvenuto ---
  const isWaitlistTarget = next === "/waitlist" || next.startsWith("/waitlist");
  const isPreLaunch = !hasLaunched();

  if (userEmail && (isWaitlistTarget || isPreLaunch)) {
    const cookieHeader = request.headers.get("cookie") || "";
    const refMatch = cookieHeader.match(/ac_wl_ref=([^;]+)/);
    const refFromCookie = refMatch ? decodeURIComponent(refMatch[1]) : null;
    const effectiveRef = refFromParam || refFromCookie;

    try {
      await ensureWaitlistEntry(userEmail, effectiveRef);
    } catch (e) {
      console.error("[auth/callback] Errore salvataggio waitlist da Google:", e);
    }

    const response = NextResponse.redirect(`${origin}/waitlist`);
    response.cookies.set("ac_wl_joined", "1", COOKIE_OPTIONS);
    response.cookies.set("ac_wl_email", userEmail.toLowerCase(), COOKIE_OPTIONS);

    // Pulisci eventuale cookie referral temporaneo
    if (cookieHeader.includes("ac_wl_ref=")) {
      response.cookies.set("ac_wl_ref", "", { maxAge: 0, path: "/", sameSite: "lax" });
    }
    return response;
  }

  // --- Beta access: complete waitlist redemption if pending session cookie exists ---
  if (BYPASS_ENABLED) {
    const cookieHeader = request.headers.get("cookie") || "";
    const sessionMatch = cookieHeader.match(/waitlist_session=([^;]+)/);
    const sessionToken = sessionMatch?.[1];

    if (sessionToken) {
      try {
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
        console.error("Waitlist redemption failed (non-blocking):", e);
      }
    }
  }

  // Consenti solo destinazioni relative same-origin per evitare open redirect.
  // If user has no agents, redirect to agent selection page for free trial
  let defaultDest = "/dashboard";
  if (userId && !hasAgents) {
    defaultDest = "/select-agent";
  }
  const safeNext = isSafeRedirectPath(next) ? next : defaultDest;
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

