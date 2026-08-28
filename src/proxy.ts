import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isPublicPath } from "@/lib/public-paths";
import {
  DEFAULT_LOCALE,
  isLocale,
  LOCALE_COOKIE,
} from "@/lib/i18n/constants";
import { getDictionary } from "@/lib/i18n/dictionaries";

/**
 * Refresh the Supabase session cookies on the way through the proxy and
 * resolve the current user. Follows the official @supabase/ssr pattern.
 */
async function resolveSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // Misconfigured deploy: fail closed (treat as signed out) so protected
  // routes redirect to /login instead of throwing a 500.
  if (!url || !anonKey) return { response, user: null };

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // getUser() validates the access token and refreshes it when needed; the
  // refreshed cookies land on `response` via setAll.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}

export async function proxy(request: NextRequest) {
  // ─── Waitlist phase: lock down the platform ───────────────────────
  // During the waitlist phase, redirect every page to /waitlist so the
  // platform is locked down. API routes, static assets, and the waitlist
  // page itself are excluded.
  const { pathname } = request.nextUrl;
  const isWaitlistRoute = pathname === "/waitlist";
  const isApiOrAsset =
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.includes(".");

  // Auth routes stay reachable during the waitlist phase so the owner (and any
  // pre-provisioned account) can sign in. The rest of the app stays locked down
  // to the waitlist page until the phase is lifted.
  const isAuthRoute =
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/reset-password" ||
    pathname === "/auth/callback";

  if (!isWaitlistRoute && !isApiOrAsset && !isAuthRoute) {
    const waitlistUrl = request.nextUrl.clone();
    waitlistUrl.pathname = "/waitlist";
    return NextResponse.redirect(waitlistUrl);
  }

  // Local development without Supabase keys: allow everything through so the
  // app is usable before keys are configured. In production this bypass is
  // never taken — missing keys fail closed (protected routes → /login).
  const supabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  if (!supabaseConfigured && process.env.NODE_ENV !== "production") {
    return NextResponse.next();
  }

  if (isPublicPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  // Protected route: require a session, otherwise send the user to /login
  // (the intended destination is not preserved, matching the current flow).
  const { response, user } = await resolveSession(request);
  if (!user) {
    // API routes get a clean 401 JSON instead of an HTML redirect — clients
    // calling fetch() would otherwise follow the redirect and parse HTML.
    if (request.nextUrl.pathname.startsWith("/api/")) {
      const localeValue = request.cookies.get(LOCALE_COOKIE)?.value;
      const locale = isLocale(localeValue) ? localeValue : DEFAULT_LOCALE;
      return NextResponse.json(
        { error: getDictionary(locale).apiErrors.unauthorized },
        { status: 401 },
      );
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.hash = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
