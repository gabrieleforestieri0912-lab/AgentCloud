import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isPublicPath } from "@/lib/public-paths";
import {
  DEFAULT_LOCALE,
  detectLocale,
  isLocale,
  LOCALE_COOKIE,
} from "@/lib/i18n/constants";
import { getDictionary } from "@/lib/i18n/dictionaries";

function getLocaleForRequest(request: NextRequest) {
  const cookieVal = request.cookies.get(LOCALE_COOKIE)?.value;
  if (isLocale(cookieVal)) return { locale: cookieVal as ReturnType<typeof detectLocale>, needsCookie: false };
  const country =
    request.headers.get("x-vercel-ip-country") ??
    request.headers.get("cf-ipcountry") ??
    request.headers.get("x-country") ??
    null;
  const acceptLanguage = request.headers.get("accept-language");
  const detected = detectLocale({ country, acceptLanguage });
  return { locale: detected, needsCookie: true };
}

function withLocaleCookie(response: NextResponse, locale: string) {
  response.cookies.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return response;
}

async function resolveSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { user, response: supabaseResponse };
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const { locale: detectedLocale, needsCookie } = getLocaleForRequest(request);

  // ─── Rotte esenti da auth ─
  const isWaitlistRoute = pathname === "/waitlist";
  const isAuthRoute =
    pathname.startsWith("/auth/") ||
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/reset-password";
  const isAsset = pathname.startsWith("/_next/") || pathname.includes(".");
  const isApiPublic = pathname.startsWith("/api/") && isPublicPath(pathname);
  const isApiOrAsset = isAsset || pathname.startsWith("/api/");

  // Rotte esenti: waitlist, auth, asset, API pubbliche
  // La landing page (/) è accessibile anche con un waitlist_session cookie
  // (utente che ha inserito il codice admin ma non si è ancora autenticato).
  const hasWaitlistSession = request.cookies.get("waitlist_session")?.value;
  const isLandingWithSession = pathname === "/" && hasWaitlistSession;

  if (isWaitlistRoute || isAuthRoute || isApiPublic || isAsset || isLandingWithSession) {
    if (isWaitlistRoute && !needsCookie) return NextResponse.next();
    let res: NextResponse = NextResponse.next();
    try {
      const resolved = await resolveSession(request);
      res = resolved.response;
    } catch {
      res = NextResponse.next();
    }
    return needsCookie ? withLocaleCookie(res, detectedLocale) : res;
  }

  // ─── Rotte protette: richiedono sessione ─
  try {
    const { response, user } = await resolveSession(request);
    if (!user) {
      // API protette → 401 JSON; pagine → redirect a /waitlist
      if (pathname.startsWith("/api/")) {
        const locale = isLocale(detectedLocale) ? detectedLocale : DEFAULT_LOCALE;
        return NextResponse.json(
          { error: getDictionary(locale).apiErrors.unauthorized },
          { status: 401 },
        );
      }
      const url = request.nextUrl.clone();
      url.pathname = "/waitlist";
      url.search = "";
      url.hash = "";
      const redirectRes = NextResponse.redirect(url);
      return needsCookie ? withLocaleCookie(redirectRes, detectedLocale) : redirectRes;
    }

    // ─── Force Full Auth gate: waitlist-only accounts must complete auth ─
    // Check if user has auth_method_completed = false in profiles.
    // If so, redirect to /login?reason=complete_account (unless already on auth pages).
    if (!isAuthRoute && !pathname.startsWith("/api/")) {
      try {
        const { createClient } = await import("@/lib/supabase/server");
        const supabase = await createClient();
        const { data: profile } = await supabase
          .from("profiles")
          .select("auth_method_completed")
          .eq("id", user.id)
          .maybeSingle();

        if (profile && profile.auth_method_completed === false) {
          const url = request.nextUrl.clone();
          url.pathname = "/login";
          url.search = "reason=complete_account";
          url.hash = "";
          const redirectRes = NextResponse.redirect(url);
          return needsCookie ? withLocaleCookie(redirectRes, detectedLocale) : redirectRes;
        }
      } catch {
        // If profile check fails, let user through (fail open for auth gate)
      }
    }

    return needsCookie ? withLocaleCookie(response, detectedLocale) : response;
  } catch {
    // Errore Supabase → trattalo come non autenticato
    if (pathname.startsWith("/api/")) {
      const locale = isLocale(detectedLocale) ? detectedLocale : DEFAULT_LOCALE;
      return NextResponse.json(
        { error: getDictionary(locale).apiErrors.unauthorized },
        { status: 401 },
      );
    }
    const url = request.nextUrl.clone();
    url.pathname = "/waitlist";
    url.search = "";
    url.hash = "";
    const redirectRes = NextResponse.redirect(url);
    return needsCookie ? withLocaleCookie(redirectRes, detectedLocale) : redirectRes;
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
