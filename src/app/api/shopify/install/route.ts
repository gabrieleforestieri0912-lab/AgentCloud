import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getSessionUser } from "@/lib/supabase/server";
import { isSafeRedirectPath } from "@/lib/safe-redirect-path";
import {
  normalizeShop,
  buildAuthorizeUrl,
  SHOPIFY_STATE_COOKIE,
  SHOPIFY_RETURN_COOKIE,
  SHOPIFY_STATE_MAX_AGE,
  OAUTH_RETURN_MAX_AGE,
} from "@/lib/shopify/oauth";

/**
 * Fase 2 — avvio del flusso OAuth Shopify.
 *
 * GET /api/shopify/install?shop=<store>.myshopify.com[&returnTo=<path>]
 *   1. Richiede una sessione AgentCloud autenticata (il token è salvato per
 *      utente). Il login fa parte del flusso: gli utenti non loggati vengono
 *      mandati a /login?intent=shopify&next=… e qui riprendono da soli dopo
 *      il login — mai un vicolo cieco.
 *   2. Valida il dominio del negozio (deve essere *.myshopify.com) per evitare
 *      open redirect.
 *   3. Genera uno `state` CSRF casuale e lo salva in un cookie httpOnly.
 *   4. Salva la pagina di provenienza (returnTo) così il callback OAuth può
 *      riportare l'utente sulla stessa pagina con ?shopify=connected|error.
 *   5. Redirige all'endpoint authorize di Shopify.
 *
 * Nessun segreto viene letto dal corpo della richiesta — SHOPIFY_API_KEY è
 * lato server.
 */
export async function GET(req: NextRequest) {
  // Dove arrivare dopo il round-trip OAuth (percorso relativo same-origin).
  const returnParam = req.nextUrl.searchParams.get("returnTo");
  const returnTo = returnParam && isSafeRedirectPath(returnParam) ? returnParam : null;

  const shopParam = req.nextUrl.searchParams.get("shop") || "";
  const shop = normalizeShop(shopParam);
  if (!shop) {
    const url = new URL(returnTo ?? "/dashboard", req.url);
    url.searchParams.set("shopify", "error");
    url.searchParams.set("reason", "invalid_shop");
    return NextResponse.redirect(url);
  }

  // Chi si sta connettendo?
  //  - Possessore del codice (admin) → il negozio è salvato come connessione
  //    tenant condivisa; nessuna email registrata e nessun login richiesto.
  //    Anche se un admin è già loggato, il negozio va al tenant così lo store
  //    del cliente è quello su cui testano tutti i possessori del codice.
  //  - Utente normale loggato → il negozio è salvato sul suo account
  //    (per-utente), che è ciò che persiste il callback.
  //  - Chiunque altro → prima accedi, poi questa route gira di nuovo.
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    const nextPath =
      `/api/shopify/install?shop=${encodeURIComponent(shop)}` +
      (returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : "");
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("intent", "shopify");
    loginUrl.searchParams.set("next", nextPath);
    return NextResponse.redirect(loginUrl);
  }

  const state = crypto.randomBytes(32).toString("hex");
  const authorizeUrl = buildAuthorizeUrl(shop, state);

  const res = NextResponse.redirect(authorizeUrl);
  res.cookies.set(SHOPIFY_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SHOPIFY_STATE_MAX_AGE,
  });
  if (returnTo) {
    res.cookies.set(SHOPIFY_RETURN_COOKIE, returnTo, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: OAUTH_RETURN_MAX_AGE,
    });
  }
  return res;
}
