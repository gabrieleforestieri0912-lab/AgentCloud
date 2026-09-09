import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/server";
import { isSafeRedirectPath } from "@/lib/safe-redirect-path";
import { isSupportedProvider } from "@/lib/integrations/types";
import { getProvider, getRedirectUri } from "@/lib/integrations/registry";
import {
  buildState,
  INTEGRATIONS_STATE_COOKIE,
  INTEGRATIONS_STATE_MAX_AGE,
  INTEGRATIONS_RETURN_COOKIE,
  OAUTH_RETURN_MAX_AGE,
} from "@/lib/integrations/state";

/**
 * GET /api/integrations/[provider]/authorize
 * Validates provider allow-list, requires auth, builds provider auth URL with signed state, redirects.
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
  if (!user && !true) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", `/api/integrations/${provider}/authorize${returnTo !== "/dashboard/integrations" ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`);
    return NextResponse.redirect(loginUrl);
  }
  const tenantId = user?.id ?? null;
  if (!tenantId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const adapter = getProvider(provider);
  if (!adapter) return NextResponse.json({ error: "Provider not configured" }, { status: 500 });

  const { state, cookieValue } = buildState(tenantId, provider);
  // Google Sheets re-uses existing Google OAuth redirect (già whitelistato in Google Cloud Console)
  const redirectUri =
    provider === "google_sheets"
      ? (process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_URL ?? new URL(req.url).origin}/api/auth/google/callback`)
      : getRedirectUri(req.url, provider as never);

  let authUrl: string;
  try {
    authUrl = adapter.getAuthUrl({ state, redirectUri });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to build auth URL" }, { status: 500 });
  }

  const res = NextResponse.redirect(authUrl);
  res.cookies.set(INTEGRATIONS_STATE_COOKIE, cookieValue, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: INTEGRATIONS_STATE_MAX_AGE,
  });
  if (returnTo) {
    res.cookies.set(INTEGRATIONS_RETURN_COOKIE, returnTo, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: OAUTH_RETURN_MAX_AGE,
    });
  }
  return res;
}
