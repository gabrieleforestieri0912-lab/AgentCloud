import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/server";
import { isSafeRedirectPath } from "@/lib/safe-redirect-path";
import { isSupportedProvider } from "@/lib/integrations/types";
import { getProvider, getRedirectUri } from "@/lib/integrations/registry";
import {
  readStateCookie,
  readPkceCookie,
  verifyState,
  INTEGRATIONS_STATE_COOKIE,
  INTEGRATIONS_RETURN_COOKIE,
  INTEGRATIONS_PKCE_COOKIE,
} from "@/lib/integrations/state";
import { upsertTenantIntegration, markTenantIntegration } from "@/lib/integrations/store";

/**
 * GET /api/integrations/[provider]/callback?code&state
 * Validates state (CSRF), exchanges code server-side via provider adapter, encrypts & upserts tenant_integrations.
 *
 * Il nome del parametro con la credenziale lo dichiara l'adapter (`authParam`):
 * "code" per i provider OAuth standard, "token" per Trello che restituisce la
 * credenziale già pronta. Il tenantInput (es. `store_url`) arriva nello `state`
 * firmato, non da un parametro riappreso: il browser non può cambiarlo.
 */

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider: raw } = await params;
  const provider = raw?.toLowerCase();
  if (!isSupportedProvider(provider)) {
    return NextResponse.json({ error: `Unsupported provider: ${raw}` }, { status: 400 });
  }

  const user = await getSessionUser();
  const paramsUrl = req.nextUrl.searchParams;
  const adapter = getProvider(provider);
  const authParam = adapter?.authParam ?? "code";
  const code = paramsUrl.get(authParam);
  // Seconda credenziale, se l'adapter la dichiara (WooCommerce: consumer_secret).
  // `get` restituisce null quando il parametro manca: per keypair è un errore
  // ("nessuna Consumer Secret"), ma lo decide l'adapter, non questa route.
  const codeSecret = adapter?.secretParam
    ? (paramsUrl.get(adapter.secretParam) ?? undefined)
    : undefined;
  const state = paramsUrl.get("state");
  const error = paramsUrl.get("error");
  const errorDesc = paramsUrl.get("error_description");

  const cookieState = readStateCookie(req);
  const payload = state ? verifyState(state, cookieState) : null;
  const tenantId = user?.id || payload?.t;

  if (!tenantId) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const returnBase = () => {
    const c = req.cookies.get(INTEGRATIONS_RETURN_COOKIE)?.value;
    return c && isSafeRedirectPath(c) ? c : "/dashboard/integrations";
  };
  const out = (search: string) => {
    const base = returnBase();
    const sep = base.includes("?") ? "&" : "?";
    const res = NextResponse.redirect(new URL(`${base}${sep}${search}`, req.url));
    res.cookies.delete(INTEGRATIONS_STATE_COOKIE);
    res.cookies.delete(INTEGRATIONS_RETURN_COOKIE);
    res.cookies.delete(INTEGRATIONS_PKCE_COOKIE);
    return res;
  };
  const fail = (reason: string) => {
    // mark error if row exists (best-effort)
    void markTenantIntegration(tenantId, provider, "error").catch(() => {});
    return out(`integration=${provider}&status=error&reason=${encodeURIComponent(reason)}`);
  };

  if (error) {
    return fail(errorDesc || error);
  }

  if (!code || !state) return fail("missing_params");
  if (!payload) return fail("state_mismatch");
  if (payload.p !== provider) return fail("state_provider_mismatch");
  if (payload.t !== tenantId) return fail("state_tenant_mismatch");

  if (!adapter) return fail("provider_not_configured");

  // Deve essere identico a quello usato in authorize: il token exchange con Google
  // fallisce se redirect_uri non coincide carattere per carattere con quello del passo
  // di autorizzazione (per google_sheets: /api/integrations/google_sheets/callback).
  const redirectUri = getRedirectUri(req.url, provider);

  // PKCE: il verifier torna dal cookie httpOnly. Va riletto solo per i provider
  // che lo dichiarano, e senza di lui lo scambio fallirebbe lato provider.
  const codeVerifier = readPkceCookie(req);

  let tokens;
  try {
    tokens = await adapter.exchangeCode({
      code,
      redirectUri,
      tenantInput: payload.x,
      codeVerifier,
      codeSecret,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "token_exchange";
    return fail(`token_exchange:${msg.slice(0, 120)}`);
  }

  try {
    await upsertTenantIntegration({
      tenantId,
      provider,
      tokens,
      status: "connected",
    });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "store");
  }

  return out(`integration=${provider}&status=connected`);
}
