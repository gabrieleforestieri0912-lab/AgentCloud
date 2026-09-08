import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/server";
import { hasPlatformAccess } from "@/lib/access-code";
import { isSafeRedirectPath } from "@/lib/safe-redirect-path";
import { isSupportedProvider } from "@/lib/integrations/types";
import { getProvider, getRedirectUri } from "@/lib/integrations/registry";
import {
  readStateCookie,
  verifyState,
  INTEGRATIONS_STATE_COOKIE,
  INTEGRATIONS_RETURN_COOKIE,
} from "@/lib/integrations/state";
import { upsertTenantIntegration, markTenantIntegration } from "@/lib/integrations/store";

/**
 * GET /api/integrations/[provider]/callback?code&state
 * Validates state (CSRF), exchanges code server-side via provider adapter, encrypts & upserts tenant_integrations.
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
  const hasAccess = await hasPlatformAccess();
  if (!user && !hasAccess) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  const tenantId = user?.id ?? (hasAccess ? "__tenant__" : null);
  if (!tenantId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const paramsUrl = req.nextUrl.searchParams;
  const code = paramsUrl.get("code");
  const state = paramsUrl.get("state");
  const error = paramsUrl.get("error");
  const errorDesc = paramsUrl.get("error_description");

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

  const cookieState = readStateCookie(req);
  const payload = verifyState(state, cookieState);
  if (!payload) return fail("state_mismatch");
  if (payload.p !== provider) return fail("state_provider_mismatch");
  if (payload.t !== tenantId) return fail("state_tenant_mismatch");

  const adapter = getProvider(provider);
  if (!adapter) return fail("provider_not_configured");

  const redirectUri =
    provider === "google_sheets"
      ? (process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_URL ?? new URL(req.url).origin}/api/auth/google/callback`)
      : getRedirectUri(req.url, provider as never);

  let tokens;
  try {
    tokens = await adapter.exchangeCode({ code, redirectUri });
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
