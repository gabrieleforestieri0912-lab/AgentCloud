import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/server";
import { isSafeRedirectPath } from "@/lib/safe-redirect-path";
import { isSupportedProvider } from "@/lib/integrations/types";
import { getProvider, getRedirectUri } from "@/lib/integrations/registry";
import { getCatalogEntry } from "@/lib/integrations/catalog";
import { assertPublicHost, normalizeTenantUrl } from "@/lib/integrations/safe-url";
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
 * Raccoglie e valida i dati che il provider pretende dall'utente (per WooCommerce
 * l'URL dello store e il WordPress User ID).
 *
 * La validazione sta qui e non nell'adapter, per due motivi: se l'host non è
 * pubblico non deve neppure arrivare a costruire l'URL di autorizzazione, e la
 * regola non deve essere ripetuta con criteri diversi.
 *
 * `assertPublicHost` risolve il DNS anche qui, non solo al momento del fetch:
 * fallire subito con "questo indirizzo non è ammesso" è comprensibile, mentre
 * fallire dopo che l'utente ha già autorizzato sul suo store no. Il controllo
 * viene comunque ripetuto subito prima di ogni chiamata, perché il DNS può
 * cambiare nel frattempo.
 */
async function readTenantInput(
  provider: string,
  req: NextRequest,
): Promise<{ ok: true; value: Record<string, string> } | { ok: false; error: string }> {
  const entry = getCatalogEntry(provider);
  const fields = entry?.tenantInput?.fields;
  if (!fields?.length) return { ok: true, value: {} };

  const value: Record<string, string> = {};
  for (const f of fields) {
    const raw = String(req.nextUrl.searchParams.get(f.key) ?? "").trim();
    if (!raw) return { ok: false, error: `${entry!.label}: campo "${f.label}" mancante` };

    if (!f.validateAsUrl) {
      value[f.key] = raw;
      continue;
    }

    const checked = normalizeTenantUrl(raw);
    if (!checked.ok) return { ok: false, error: `${entry!.label}: ${checked.error}` };

    const resolved = await assertPublicHost(checked.url.hostname);
    if (!resolved.ok) {
      return { ok: false, error: `${entry!.label}: indirizzo non ammesso` };
    }
    // Si tiene solo l'origine: niente path, query o credenziali.
    value[f.key] = checked.url.origin;
  }
  return { ok: true, value };
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

  const tenantInput = await readTenantInput(provider, req);
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
