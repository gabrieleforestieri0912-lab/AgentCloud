import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isPublicPath } from "@/lib/public-paths";
import { DEFAULT_LOCALE, detectLocale, isLocale, LOCALE_COOKIE, type Locale } from "@/lib/i18n/constants";
import { hasLaunched } from "@/lib/waitlist-constants";
import { ensureAdminRole, isAdminEmail } from "@/lib/admin-access";
import { SUPABASE_USER_HEADER } from "@/lib/supabase/session-header";

// getDictionary NON viene importato a livello di modulo: pullisce l'intero
// modulo dei dizionari (~670 KB, 5 lingue) nella valutazione del proxy a ogni
// cold start del Worker. Qui serve un solo campo (apiErrors.unauthorized) su
// tre percorsi di errore → import dinamico lazy.
async function unauthorizedMessage(locale: Locale): Promise<string> {
  const { getDictionary } = await import("@/lib/i18n/dictionaries");
  return getDictionary(locale).apiErrors.unauthorized;
}

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
  // Il client Supabase viene creato UNA volta per richiesta; i cookie di
  // refresh eventualmente scritti da Auth durante getUser vengono raccolti qui
  // e applicati una sola volta alla response finale (prima ogni write
  // ricreava la response: stesso risultato, più lavoro inutile).
  const cookieWrites: Array<{
    name: string;
    value: string;
    options?: Record<string, unknown>;
  }> = [];
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          cookieWrites.push(...cookiesToSet);
        },
      },
    },
  );
  let {
    data: { user },
  } = await supabase.auth.getUser();

  // Fallback Bearer: CLI (`agentcloud login` → /cli/auth) e mobile condividono lo stesso DB.
  // Se non c'è sessione cookie ma c'è Authorization: Bearer <supabase_access_token>, validalo.
  // In alternativa accetta i token API personali `act_…` generati nelle impostazioni.
  // Le API key `ack_…` sono escluse: hanno scope per-agente e valgono solo su /api/v1/run.
  if (!user) {
    const auth = request.headers.get("authorization") ?? request.headers.get("Authorization");
    if (typeof auth === "string" && auth.startsWith("Bearer ")) {
      const token = auth.slice(7).trim();
      if (token.length > 20) {
        try {
          const { isPat, resolveBearerCredential } = await import("@/lib/supabase/pat");
          if (isPat(token)) {
            const cred = await resolveBearerCredential(token);
            if (cred) user = cred.user as unknown as typeof user;
          } else {
            const { createClient } = await import("@supabase/supabase-js");
            const supa = createClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
              { global: { headers: { Authorization: `Bearer ${token}` } } },
            );
            const { data: { user: bearerUser } } = await supa.auth.getUser(token);
            if (bearerUser) user = bearerUser as unknown as typeof user;
          }
        } catch {}
      }
    }
  }

  // Propaga l'utente risolto a pagina/route handler via header interno: così
  // `getSessionUser()` lato pagina NON rifà `auth.getUser()` (un solo giro di
  // Auth per richiesta, metà delle chiamate di prima). L'header è interno al
  // worker: viene stabilito qui a ogni richiesta e non è spoofabile dall'esterno.
  const requestHeaders = new Headers(request.headers);
  if (user) requestHeaders.set(SUPABASE_USER_HEADER, JSON.stringify(user));
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  for (const { name, value, options } of cookieWrites) {
    response.cookies.set(name, value, options as never);
  }

  return { user, response, supabase };
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const { locale: detectedLocale, needsCookie } = getLocaleForRequest(request);

  // ─── Rotte esenti da auth ─
  // Include anche le sotto-rotte (/waitlist/join, /waitlist/…): chiuse dal
  // proxy post-lancio e lasciate passare pre-lancio (servono a preservare ?ref).
  const isWaitlistRoute =
    pathname === "/waitlist" || pathname.startsWith("/waitlist/");
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

    // 2b. Bypass via codice di accesso: valido solo con `waitlist_session`
    // nel formato emesso dal server (`wl_<32hex>_<base36>` o `wl_admin_…`).
    // Il cookie in chiaro `ac_wl_bypass=1` non è più accettato: era
    // falsificabile dal client (nessuna firma) e concedeva il bypass.
    // Se c'è anche una sessione auth, promuovi eventuali email in ADMIN_EMAILS
    // (altrimenti il bypass saltava ensureAdminRole e l'admin restava "normale").
    const waitlistSession = request.cookies.get("waitlist_session")?.value || "";
    const hasWaitlistBypass =
      /^wl_[0-9a-f]{32}_[0-9a-z]+$/.test(waitlistSession) ||
      waitlistSession.startsWith("wl_admin_");
    // Promozione admin usando il client della resolveSession: un solo client
    // per richiesta, stessa semantica della versione precedente.
    if (hasWaitlistBypass) {
      let res: NextResponse = NextResponse.next();
      try {
        const resolved = await resolveSession(request);
        res = resolved.response;
        if (resolved.user && isAdminEmail(resolved.user.email)) {
          try {
            const { data: profile } = await resolved.supabase
              .from("profiles")
              .select("role")
              .eq("id", resolved.user.id)
              .maybeSingle();
            await ensureAdminRole(
              resolved.user.id,
              resolved.user.email,
              (profile as { role?: string | null } | null)?.role,
            );
          } catch {}
        }
      } catch {
        res = NextResponse.next();
      }
      return needsCookie ? withLocaleCookie(res, detectedLocale) : res;
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
      const runtimeUnauthorized = async () => {
        const locale = isLocale(detectedLocale) ? detectedLocale : DEFAULT_LOCALE;
        return NextResponse.json(
          { error: await unauthorizedMessage(locale) },
          { status: 401 },
        );
      };
      try {
        const { user, response } = await resolveSession(request);
        if (isExtensionRuntimeApi && !user) return await runtimeUnauthorized();
        return needsCookie ? withLocaleCookie(response, detectedLocale) : response;
      } catch {
        if (isExtensionRuntimeApi) return await runtimeUnauthorized();
        const res = NextResponse.next();
        return needsCookie ? withLocaleCookie(res, detectedLocale) : res;
      }
    }
    const isChatApi = pathname === "/api/chat";
    const isWebhookOrCallback =
      pathname.startsWith("/api/shopify/") ||
      pathname.startsWith("/api/webhooks/shopify") ||
      pathname.startsWith("/api/billing/webhook") ||
      // Cron notifiche scadenza: machine-to-machine, self-authenticato nell'handler.
      pathname.startsWith("/api/billing/notify-expiring") ||
      pathname.startsWith("/api/whatsapp/webhook") ||
      pathname.startsWith("/api/email/webhook") ||
      pathname.startsWith("/api/integrations/") ||
      pathname.startsWith("/api/mcp/") ||
      pathname.startsWith("/api/auth/google") ||
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
      const { user, response, supabase } = await resolveSession(request);
      if (user) {
        if (isAdminEmail(user.email)) {
          // Promozione best-effort anche pre-lancio (idempotente), con il
          // client unico della richiesta
          try {
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

  // La waitlist è chiusa anche lato API: nessuna iscrizione/lettura di stato
  // deve sopravvivere al lancio (la pagina è già reindirizzata qui sopra).
  if (pathname === "/api/waitlist" || pathname.startsWith("/api/waitlist/")) {
    const closedRes = NextResponse.json(
      {
        error:
          "La waitlist è chiusa: la piattaforma è live, accedi o crea un account.",
        closed: true,
      },
      { status: 410 },
    );
    return needsCookie ? withLocaleCookie(closedRes, detectedLocale) : closedRes;
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
    const { response, user, supabase } = await resolveSession(request);
    if (!user) {
      if (pathname.startsWith("/api/")) {
        const locale = isLocale(detectedLocale) ? detectedLocale : DEFAULT_LOCALE;
        return NextResponse.json(
          { error: await unauthorizedMessage(locale) },
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
    // Riusa il client della resolveSession (uno per richiesta): prima ricreava
    // un secondo client con `cookies()` di next/headers, che nel proxy NON è
    // disponibile — la query falliva ogni volta e il check girava a vuoto.
    if (!isAuthRoute && !pathname.startsWith("/api/")) {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("auth_method_completed, role")
          .eq("id", user.id)
          .maybeSingle();

        // Punto unico di promozione ad admin: ogni richiesta di pagina
        // autenticata passa da qui, quindi vale per tutti i metodi di accesso
        // (password, Google, link email). Idempotente: con un'email fuori da
        // ADMIN_EMAILS non tocca nulla (zero query), e chi ha gia' ruolo admin
        // non produce nessuna scrittura. Mai bloccante per la navigazione.
        await ensureAdminRole(
          user.id,
          user.email,
          (profile as { role?: string | null } | null)?.role,
        );

        if (profile && (profile as { auth_method_completed?: boolean }).auth_method_completed === false) {
          const url = request.nextUrl.clone();
          url.pathname = "/login";
          // Precompila l'email del waitlist-user: deve poter richiedere in un
          // clic il link di accesso (non conosce la password provvisoria).
          url.search = `reason=complete_account&email=${encodeURIComponent(user.email ?? "")}`;
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
        { error: await unauthorizedMessage(locale) },
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
  // Il proxy serve SOLO a decidere auth/redirect su pagine HTML e API: tutti
  // gli asset statici (img, font, css, js, manifest, sitemap, robots) girano
  // direttamente nel binding ASSETS di Cloudflare senza passare dal proxy.
  // L'ultima riga esclude ogni path con estensione di asset noto: ogni
  // richiesta risparmiata è CPU che non si brucia dove non serve.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|google[a-z0-9]+\\.html|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|txt|xml|json|js|css|woff2?|ttf|otf|eot|mp4|webm|mp3|wav|wasm|map|webmanifest|md|docx|xlsx|pptx|zip)$).*)",
  ],
};

