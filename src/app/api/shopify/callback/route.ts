import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { getSessionUser } from "@/lib/supabase/server";
import { isSafeRedirectPath } from "@/lib/safe-redirect-path";
import {
  normalizeShop,
  verifyShopifyHmac,
  readShopifyStateCookie,
  SHOPIFY_STATE_COOKIE,
  SHOPIFY_RETURN_COOKIE,
} from "@/lib/shopify/oauth";
import {
  TENANT_SHOPIFY_ID,
  upsertShopifyConnection,
} from "@/lib/shopify/connections";
import { registerShopifyWebhooks } from "@/lib/shopify/webhooks";

/**
 * Fase 3 — callback OAuth Shopify + scambio del token.
 *
 * GET /api/shopify/callback?code&shop&state&hmac&timestamp&...
 *   1. Risolve chi si sta connettendo:
 *        - Possessore del codice (admin, senza account) → connessione tenant
 *          condivisa (TENANT_SHOPIFY_ID). Nessun login e nessuna email salvata.
 *        - Utente loggato → la propria riga (user, shop).
 *        - Chiunque altro → di nuovo a /login?intent=shopify per accedere prima.
 *   2. Verifica il cookie CSRF `state` (rifiuta in caso di mismatch).
 *   3. Verifica l'HMAC della richiesta con SHOPIFY_API_SECRET (integrità del redirect).
 *   4. Scambia `code` con un access token via l'endpoint token di Shopify.
 *   5. Cripta il token e lo salva per (tenant|utente, negozio) in shopify_connections.
 *
 * L'utente torna alla pagina da cui era partito (cookie returnTo) con
 * ?shopify=connected|error&reason=... — mai un redirect secco verso un vicolo cieco.
 */
export async function GET(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    // Sessione scaduta a metà flusso: il codice monouso non è riutilizzabile,
    // quindi l'utente deve solo riavviare la connessione dopo il login.
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("intent", "shopify");
    return NextResponse.redirect(loginUrl);
  }
  // I possessori del codice (con o senza sessione) collegano lo store tenant
  // condiviso; gli utenti normali loggati collegano il proprio store.
  const ownerId = sessionUser!.id;

  const returnBase = () => {
    const c = req.cookies.get(SHOPIFY_RETURN_COOKIE)?.value;
    return c && isSafeRedirectPath(c) ? c : "/dashboard";
  };
  const out = (search: string) => {
    const base = returnBase();
    const sep = base.includes("?") ? "&" : "?";
    const res = NextResponse.redirect(new URL(`${base}${sep}${search}`, req.url));
    res.cookies.delete(SHOPIFY_STATE_COOKIE);
    res.cookies.delete(SHOPIFY_RETURN_COOKIE);
    return res;
  };
  const fail = (reason: string) => out(`shopify=error&reason=${reason}`);

  const params = req.nextUrl.searchParams;
  const shopParam = params.get("shop") || "";
  const code = params.get("code");
  const state = params.get("state");
  const hmac = params.get("hmac");

  const shop = normalizeShop(shopParam);
  if (!shop || !code || !state || !hmac) {
    return fail("missing_params");
  }

  // 2. Controllo CSRF dello state
  const cookieState = readShopifyStateCookie(req);
  if (
    !cookieState ||
    cookieState.length !== state.length ||
    !timingSafeEqual(Buffer.from(cookieState), Buffer.from(state))
  ) {
    return fail("state_mismatch");
  }

  const secret = process.env.SHOPIFY_API_SECRET;
  const clientId = process.env.SHOPIFY_API_KEY;
  if (!secret || !clientId) {
    return fail("config");
  }

  // 3. Controllo di integrità HMAC
  if (!verifyShopifyHmac(params, secret)) {
    return fail("hmac");
  }

  // 4. Scambio del codice con un access token
  let tokenData: { access_token?: string; scope?: string };
  try {
    const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: clientId, client_secret: secret, code }),
    });
    if (!tokenRes.ok) {
      return fail("token_exchange");
    }
    tokenData = await tokenRes.json();
  } catch {
    return fail("token_exchange");
  }

  const accessToken = tokenData.access_token;
  if (!accessToken) {
    return fail("no_token");
  }

  // 5. Cripta e salva (per proprietario, per negozio)
  try {
    await upsertShopifyConnection({
      userId: ownerId,
      shopDomain: shop,
      accessToken,
      scope: tokenData.scope,
    });
  } catch {
    return fail("store");
  }

  // 6. Best-effort: registra i webhook obbligatori (app/uninstalled + GDPR).
  // Non fatale — webhook mancanti degradano solo gestione uninstall/revoca.
  void registerShopifyWebhooks(shop, accessToken).catch(() => {});

  return out("shopify=connected");
}
