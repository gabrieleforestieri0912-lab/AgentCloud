import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSafeRedirectPath } from "@/lib/safe-redirect-path";

/**
 * GET /auth/callback?code=...&next=/dashboard
 *
 * Qui arrivano i link OAuth (Google) e di conferma email di Supabase con un
 * `code` monouso e a breve scadenza (flusso PKCE). Il codice va scambiato con
 * una sessione prima che l'utente possa accedere alle pagine protette — senza
 * questa route la sessione non viene mai creata e l'utente rimbalza su /login.
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

  // Consenti solo destinazioni relative same-origin per evitare open redirect.
  const safeNext = isSafeRedirectPath(next) ? next : "/dashboard";
  return NextResponse.redirect(`${origin}${safeNext}`);
}
