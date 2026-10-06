import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/server";
import { isSafeRedirectPath } from "@/lib/safe-redirect-path";
import { isSupportedProvider } from "@/lib/integrations/types";
import { getProvider, getRedirectUri } from "@/lib/integrations/registry";
import { getCatalogEntry } from "@/lib/integrations/catalog";
import { normalizeTenantUrl } from "@/lib/integrations/safe-url";
import {
  buildState,
  createPkcePair,
  INTEGRATIONS_STATE_COOKIE,
  INTEGRATIONS_STATE_MAX_AGE,
  INTEGRATIONS_RETURN_COOKIE,
  OAUTH_RETURN_MAX_AGE,
  INTEGRATIONS_PKCE_COOKIE,
  INTEGRATIONS_PKCE_MAX_AGE,
} from "@/lib/integrations/state";

const cookieOpts = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

/**
 * Raccoglie e valida il dato che il provider pretende dall'utente (per ora solo
 * `store_url` di WooCommerce). La validazione resta qui e non nell'adapter: se
 * l'host non è pubblico non deve neppure arrivare a costruire l'URL di
 * autorizzazione, e il controllo non deve essere ripetuto con regole diverse.
 */
function readTenantInput(
  provider: string,
  req: NextRequest,
): { ok: true; value: Record<string, string> } | { ok: false; error: string } {
  const entry = getCatalogEntry(provider);
  const spec = entry?.tenantInput;
  if (!spec) return { ok: true, value: {} };

  const raw = String(req.nextUrl.searchParams.get(spec.key) ?? "").trim();
  if (!raw) {
    return { ok: false, error: `${entry!.label}: missing ${spec.key}` };
  }
  if (!spec.validateAsUrl) return { ok: true, value: { [spec.key]: raw } };

  const checked = normalizeTenantUrl(raw);
  if (!checked.ok) return { ok: false, error: `${entry!.label}: ${checked.error}` };
  return { ok: true, value: { [spec.key]: checked.url.origin } };
}

/**
 * GET /api/integrations/[provider]/authorize
 * Validates provider allow-list, requires auth, builds provider auth URL with signed state, redirects.
 *
 * Query params: `returnTo` (path interno), più l'eventuale tenantInput del
 * provider (`store_url`). Il tenantInput entra nello `state` firmato, così il
 * callback non deve fidarsi di un valore riappreso dal browser.
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

  const returnParam = req.nextUrl.searchParams.get("returnTo");
  const returnTo = returnParam && isSafeRedirectPath(returnParam) ? returnParam : "/dashboard/integrations";

  const user = await getSessionUser();
  if (!user) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", `/api/integrations/${provider}/authorize${returnTo !== "/dashboard/integrations" ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`);
    return NextResponse.redirect(loginUrl);
  }
  const tenantId = user.id;

  const adapter = getProvider(provider);
  if (!adapter) {
    const sep = returnTo.includes("?") ? "&" : "?";
    return NextResponse.redirect(new URL(`${returnTo}${sep}integration=${provider}&status=error&reason=provider_not_configured`, req.url));
  }

  const fail = (reason: string) => {
    const sep = returnTo.includes("?") ? "&" : "?";
    return NextResponse.redirect(new URL(`${returnTo}${sep}integration=${provider}&status=error&reason=${encodeURIComponent(reason)}`, req.url));
  };

  const tenantInput = readTenantInput(provider, req);
  if (!tenantInput.ok) return fail(tenantInput.error);

  const { state, cookieValue } = buildState(tenantId, provider, tenantInput.value);
  const redirectUri = getRedirectUri(req.url, provider);

  // PKCE solo dove il catalogo lo dichiara: il verifier resta nel cookie
  // httpOnly, nello state finisce solo la challenge.
  const entry = getCatalogEntry(provider);
  const needsPkce = entry?.authType === "oauth2_pkce";
  const pkce = needsPkce ? createPkcePair() : null;

  let authUrl: string;
  try {
    authUrl = adapter.getAuthUrl({
      state,
      redirectUri,
      tenantInput: tenantInput.value,
      pkce: pkce ? { codeChallenge: pkce.codeChallenge } : undefined,
    });
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : "Failed to build auth URL";
    return fail(errorMsg);
  }

  const res = NextResponse.redirect(authUrl);
  res.cookies.set(INTEGRATIONS_STATE_COOKIE, cookieValue, {
    ...cookieOpts,
    maxAge: INTEGRATIONS_STATE_MAX_AGE,
  });
  if (pkce) {
    res.cookies.set(INTEGRATIONS_PKCE_COOKIE, pkce.codeVerifier, {
      ...cookieOpts,
      maxAge: INTEGRATIONS_PKCE_MAX_AGE,
    });
  }
  if (returnTo) {
    res.cookies.set(INTEGRATIONS_RETURN_COOKIE, returnTo, {
      ...cookieOpts,
      maxAge: OAUTH_RETURN_MAX_AGE,
    });
  }
  return res;
}
