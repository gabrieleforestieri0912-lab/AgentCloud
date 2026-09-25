import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSafeRedirectPath } from "@/lib/safe-redirect-path";
import { completePendingReferrals, ensureWaitlistEntry } from "@/lib/waitlist";
import { hasLaunched } from "@/lib/waitlist-constants";
import { ensureAdminRole, isAdminEmail } from "@/lib/admin-access";

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
 * con i cookie di stato coda valorizzati — ECCETTO admin (ADMIN_EMAILS) e chi
 * ha già un bypass via codice di accesso (waitlist_session / ac_wl_bypass).
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
  // Open Decision #7: referral points awarded only when referred user reaches auth_method_completed=true
  let userEmail: string | null = null;
  let userId: string | null = null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      userEmail = user.email ?? null;
      userId = user.id;
      await supabase
        .from("profiles")
        .update({ auth_method_completed: true })
        .eq("id", user.id);
      // Phase 2: se questo utente era stato invitato (pending), completa il referral -> +3 punti al referrer
      if (userEmail) {
        try { await completePendingReferrals(userEmail, user.id); } catch {}
      }
    }
  } catch {
    // Non-blocking: auth gate will catch on next request if needed
  }

  const cookieHeader = request.headers.get("cookie") || "";
  const hasAccessBypass =
    /(?:^|;\s*)waitlist_session=/.test(cookieHeader) ||
    /(?:^|;\s*)ac_wl_bypass=/.test(cookieHeader);
  const adminUser = Boolean(userEmail && isAdminEmail(userEmail));

  // Admin whitelist: promuovi ruolo e vai in dashboard — MAI iscrivere in waitlist.
  if (adminUser && userId) {
    try {
      await ensureAdminRole(userId, userEmail);
    } catch {}
    const safeNext = isSafeRedirectPath(next) && !next.startsWith("/waitlist")
      ? next
      : "/dashboard";
    const response = NextResponse.redirect(`${origin}${safeNext}`);
    clearWaitlistSessionCookie(response, cookieHeader);
    return response;
  }

  // Bypass via codice di accesso: completa redemption e vai in piattaforma,
  // senza iscrizione waitlist (il codice esiste proprio per entrare prima del lancio).
  if (hasAccessBypass) {
    await completeWaitlistRedemption(supabase, cookieHeader);
    const safeNext = isSafeRedirectPath(next) && !next.startsWith("/waitlist")
      ? next
      : "/dashboard";
    const response = NextResponse.redirect(`${origin}${safeNext}`);
    clearWaitlistSessionCookie(response, cookieHeader);
    return response;
  }

  // --- Waitlist flow: solo utenti senza privilegi admin/bypass ---
  const isWaitlistTarget = next === "/waitlist" || next.startsWith("/waitlist");
  const isPreLaunch = !hasLaunched();

  if (userEmail && (isWaitlistTarget || isPreLaunch)) {
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
    await completeWaitlistRedemption(supabase, cookieHeader);
  }

  // Consenti solo destinazioni relative same-origin per evitare open redirect.
  // Trial rimosso: nessun redirect a /select-agent, sempre /dashboard (waitlist già autentica al lancio).
  const defaultDest = "/dashboard";
  const safeNext = isSafeRedirectPath(next) ? next : defaultDest;
  const response = NextResponse.redirect(`${origin}${safeNext}`);
  clearWaitlistSessionCookie(response, cookieHeader);
  return response;
}

async function completeWaitlistRedemption(
  supabase: Awaited<ReturnType<typeof createClient>>,
  cookieHeader: string,
) {
  if (!BYPASS_ENABLED) return;
  const sessionMatch = cookieHeader.match(/waitlist_session=([^;]+)/);
  const sessionToken = sessionMatch?.[1];
  if (!sessionToken) return;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      await fetch(`${SUPABASE_URL}/functions/v1/complete-waitlist-redemption`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ session_token: sessionToken }),
      });
    }
  } catch (e) {
    console.error("Waitlist redemption failed (non-blocking):", e);
  }
}

function clearWaitlistSessionCookie(response: NextResponse, cookieHeader: string) {
  if (!cookieHeader.includes("waitlist_session=")) return;
  response.cookies.set("waitlist_session", "", {
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}
