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
import { hasLaunched } from "@/lib/waitlist-constants";
import { ensureAdminRole, isAdminEmail } from "@/lib/admin-access";

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
  let {
    data: { user },
  } = await supabase.auth.getUser();

  // Fallback Bearer: CLI (`agentcloud login` → /cli/auth) e mobile condividono lo stesso DB.
  // Se non c'è sessione cookie ma c'è Authorization: Bearer <supabase_access_token>, validalo.
  if (!user) {
    const auth = request.headers.get("authorization") ?? request.headers.get("Authorization");
    if (auth?.startsWith("Bearer ")) {
      const token = auth.slice(7).trim();
      if (token.length > 20) {
        try {
          const { createClient } = await import("@supabase/supabase-js");
          const supa = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { global: { headers: { Authorization: `Bearer ${token}` } } },
          );
          const { data: { user: bearerUser } } = await supa.auth.getUser(token);
          if (bearerUser) user = bearerUser as unknown as typeof user;
        } catch {}
      }
    }
  }

  return { user, response: supabaseResponse };
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const { locale: detectedLocale, needsCookie } = getLocaleForRequest(request);

  // ─── Rotte esenti da auth ─
  const isWaitlistRoute = pathname === "/waitlist";
  const launched = hasLaunched();
  const isAuthRoute =
    pathname.startsWith("/auth/") ||
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/reset-password";
  const isAsset = pathname.startsWith("/_next/") || pathname.includes(".");
  const isApiPublic = pathname.startsWith("/api/") && isPublicPath(pathname);


  // ─── Lancio avvenuto vs Pre-lancio ───
  // Se non siamo ancora al 1 Ottobre 2026: TUTTE le route a cui l'utente tenta di navigare
  // vengono reindirizzate a /waitlist, eccetto la pagina /waitlist stessa, gli asset statici
  // e le API di iscrizione/webhooks machine-to-machine.
  if (!launched) {
    // 1. La pagina /waitlist è consentita
    if (isWaitlistRoute) {
      const res = NextResponse.next();
      return needsCookie ? withLocaleCookie(res, detectedLocale) : res;
    }

    // 2. Asset statici necessari per script, fogli di stile e immagini della pagina
    if (isAsset) {
      return NextResponse.next();
    }

    // 3. API necessarie per la waitlist (POST/GET /api/waitlist + subroutes) e webhook/callback esterni
    const isWaitlistApi = pathname === "/api/waitlist" || pathname.startsWith("/api/waitlist/");
    // Copilot browser (estensione): la verifica della sessione deve rispondere
    // JSON anche pre-lancio (l'estensione interpreta 401 come "non autenticato"),
    // mentre l'esecuzione degli agenti resta riservata agli utenti autenticati
    // con i cookie del sito: nessun bypass di abbonamento, quota o rate limit.
    const isExtensionSessionApi = pathname.startsWith("/api/extension/");
    const isExtensionRuntimeApi = pathname === "/api/agent/run";
    if (isExtensionSessionApi || isExtensionRuntimeApi) {
      const runtimeUnauthorized = () => {
        const locale = isLocale(detectedLocale) ? detectedLocale : DEFAULT_LOCALE;
        return NextResponse.json(
          { error: getDictionary(locale).apiErrors.unauthorized },
          { status: 401 },
        );
      };
      try {
        const { user, response } = await resolveSession(request);
        if (isExtensionRuntimeApi && !user) return runtimeUnauthorized();
        return needsCookie ? withLocaleCookie(response, detectedLocale) : response;
      } catch {
        if (isExtensionRuntimeApi) return runtimeUnauthorized();
        const res = NextResponse.next();
        return needsCookie ? withLocaleCookie(res, detectedLocale) : res;
      }
    }
    const isChatApi = pathname === "/api/chat";
    const isWebhookOrCallback =
      pathname.startsWith("/api/shopify/") ||
      pathname.startsWith("/api/billing/webhook") ||
      pathname.startsWith("/api/whatsapp/webhook") ||
      pathname.startsWith("/api/email/webhook") ||
      pathname.startsWith("/api/integrations/") ||
      pathname.startsWith("/api/auth/google/callback") ||
      pathname.startsWith("/auth/callback");
    // CLI auth: deve essere raggiungibile anche pre-lancio senza waitlist gate (usa stesso DB Supabase)
    const isCliAuth = pathname === "/cli/auth" || pathname.startsWith("/cli/") || pathname.startsWith("/api/cli");

    if (isWaitlistApi || isChatApi || isWebhookOrCallback || isCliAuth) {
      return NextResponse.next();
    }

    // 3b. Auth routes devono restare raggiungibili pre-lancio per permettere
    // all'admin di autenticarsi (altrimenti /login verrebbe rimbalzato a /waitlist
    // e l'admin non avrebbe modo di entrare). Lascia passare con gestione cookie.
    if (isAuthRoute) {
      let res: NextResponse = NextResponse.next();
      try {
        const resolved = await resolveSession(request);
        res = resolved.response;
      } catch {
        res = NextResponse.next();
      }
      return needsCookie ? withLocaleCookie(res, detectedLocale) : res;
    }

    // 3c. Bypass admin pre-lancio: un utente autenticato che è admin
    // (via ADMIN_EMAILS o profiles.role = 'admin') può navigare ovunque anche
    // prima del lancio. Questo preserva la logica di src/lib/admin-access.ts
    // e permette all'admin di lavorare su dashboard/agents/integrations.
    try {
      const { user, response } = await resolveSession(request);
      if (user) {
        if (isAdminEmail(user.email)) {
          // Promozione best-effort anche pre-lancio (idempotente)
          try {
            const { createClient } = await import("@/lib/supabase/server");
            const supabase = await createClient();
            const { data: profile } = await supabase
              .from("profiles")
              .select("role")
              .eq("id", user.id)
              .maybeSingle();
            await ensureAdminRole(user.id, user.email, (profile as { role?: string | null } | null)?.role);
          } catch {}
          return needsCookie ? withLocaleCookie(response, detectedLocale) : response;
        }
        // Fallback: admin già promosso in DB ma non più in ADMIN_EMAILS (role = 'admin')
        try {
          const { createClient } = await import("@/lib/supabase/server");
          const supabase = await createClient();
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .maybeSingle();
          if (profile && (profile as { role?: string | null }).role === "admin") {
            return needsCookie ? withLocaleCookie(response, detectedLocale) : response;
          }
        } catch {}
      }
    } catch {}

    // 4. Qualsiasi altra route (/, /dashboard, /about, /agents, /pricing, ecc.)
    // per utenti non-admin reindirizza categoricamente a /waitlist
    const url = request.nextUrl.clone();
    url.pathname = "/waitlist";
    url.search = "";
    url.hash = "";
    const redirectRes = NextResponse.redirect(url);
    return needsCookie ? withLocaleCookie(redirectRes, detectedLocale) : redirectRes;
  }

  // ─── Lancio avvenuto (1 Ottobre 2026 e successivi): la waitlist è chiusa ───
  if (isWaitlistRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    url.hash = "";
    const redirectRes = NextResponse.redirect(url);
    return needsCookie ? withLocaleCookie(redirectRes, detectedLocale) : redirectRes;
  }

  const isPublicPage = isPublicPath(pathname) && !pathname.startsWith("/api/");

  if (isAuthRoute || isApiPublic || isAsset || isPublicPage) {
    let res: NextResponse = NextResponse.next();
    try {
      const resolved = await resolveSession(request);
      res = resolved.response;
    } catch {
      res = NextResponse.next();
    }
    return needsCookie ? withLocaleCookie(res, detectedLocale) : res;
  }

  // ─── Post-lancio: Rotte protette che richiedono sessione ─
  try {
    const { response, user } = await resolveSession(request);
    if (!user) {
      if (pathname.startsWith("/api/")) {
        const locale = isLocale(detectedLocale) ? detectedLocale : DEFAULT_LOCALE;
        return NextResponse.json(
          { error: getDictionary(locale).apiErrors.unauthorized },
          { status: 401 },
        );
      }
      const url = request.nextUrl.clone();
      url.pathname = "/login";
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
          .select("auth_method_completed, role")
          .eq("id", user.id)
          .maybeSingle();

        // Punto unico di promozione ad admin: ogni richiesta di pagina
        // autenticata passa da qui, quindi vale per tutti i metodi di accesso
        // (password, Google, link email). Idempotente: con un'email fuori da
        // ADMIN_EMAILS non tocca nulla, e chi ha gia' ruolo admin non produce
        // nessuna scrittura. Mai bloccante per la navigazione.
        await ensureAdminRole(
          user.id,
          user.email,
          (profile as { role?: string | null } | null)?.role,
        );

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
    url.pathname = "/login";
    url.search = "";
    url.hash = "";
    const redirectRes = NextResponse.redirect(url);
    return needsCookie ? withLocaleCookie(redirectRes, detectedLocale) : redirectRes;
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|google[a-z0-9]+\\.html|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt)$).*)",
  ],
};

