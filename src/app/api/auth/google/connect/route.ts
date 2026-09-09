import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getSessionUser } from "@/lib/supabase/server";
import { isSafeRedirectPath } from "@/lib/safe-redirect-path";
import { TENANT_GOOGLE_ID } from "@/lib/google/connections";
import {
  buildGoogleConsentUrl,
  encodeGoogleState,
  GOOGLE_STATE_COOKIE,
  GOOGLE_RETURN_COOKIE,
  GOOGLE_STATE_MAX_AGE,
  OAUTH_RETURN_MAX_AGE,
} from "@/lib/google/oauth";

/**
 * Fase 2 — avvio del flusso OAuth Google.
 *
 * GET /api/auth/google/connect[?returnTo=<path>]
 *   1. Richiede una sessione AgentCloud autenticata (i token sono salvati per
 *      utente). Il login fa parte del flusso: gli utenti non loggati vengono
 *      mandati a /login?intent=google&next=… e qui riprendono da soli dopo.
 *   2. Genera un nonce casuale, lo incorpora (con userId) nello `state` OAuth
 *      (JSON base64url) e salva il nonce in un cookie httpOnly a breve durata
 *      per la verifica al callback (anti-CSRF).
 *   3. Salva la pagina di origine (returnTo) così il callback può riportarci
 *      l'utente con ?google=connected|error.
 *   4. Redirige allo schermo di consenso Google con access_type=offline e
 *      prompt=consent così viene sempre emesso un refresh token.
 *
 * Nessun segreto viene letto dalla richiesta — GOOGLE_CLIENT_ID /
 * GOOGLE_CLIENT_SECRET sono env var lato server.
 */
export async function GET(req: NextRequest) {
  const returnParam = req.nextUrl.searchParams.get("returnTo");
  const returnTo = returnParam && isSafeRedirectPath(returnParam) ? returnParam : null;

  const sessionUser = await getSessionUser();
  let userId: string | null = sessionUser?.id ?? null;
  // I possessori del codice (admin) senza account Supabase usano il tenant condiviso

  if (!userId) {
    const nextPath =
      "/api/auth/google/connect" +
      (returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : "");
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("intent", "google");
    loginUrl.searchParams.set("next", nextPath);
    return NextResponse.redirect(loginUrl);
  }

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    const url = new URL(returnTo ?? "/dashboard", req.url);
    url.searchParams.set("google", "error");
    url.searchParams.set("reason", "config");
    return NextResponse.redirect(url);
  }

  const nonce = crypto.randomBytes(24).toString("hex");
  const state = encodeGoogleState({ nonce, userId: userId! });
  const authorizeUrl = buildGoogleConsentUrl(state);

  const res = NextResponse.redirect(authorizeUrl);
  res.cookies.set(GOOGLE_STATE_COOKIE, nonce, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: GOOGLE_STATE_MAX_AGE,
  });
  if (returnTo) {
    res.cookies.set(GOOGLE_RETURN_COOKIE, returnTo, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: OAUTH_RETURN_MAX_AGE,
    });
  }
  return res;
}
