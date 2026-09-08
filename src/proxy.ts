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
import { ACCESS_COOKIE } from "@/lib/waitlist-constants";

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

/**
 * Proxy Next.js (middleware): applica locale automatica, blocco waitlist e
 * protezione delle rotte, rinnovando i cookie di sessione Supabase lungo il
 * percorso. Qui in particolare aggiorna i cookie di sessione e risolve
 * l'utente corrente, seguendo il pattern ufficiale @supabase/ssr.
 */
async function resolveSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // Deploy mal configurato: fail closed (tratta come non autenticato) così le
  // rotte protette rimandano a /login invece di lanciare un 500.
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

  // getUser() valida l'access token e lo rinnova se serve; i cookie rinnovati
  // finiscono su `response` tramite setAll.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}

export async function proxy(request: NextRequest) {
  // ─── Locale automatica: senza cookie esplicito, rileva da paese/Accept-Language e salva
  const { locale: detectedLocale, needsCookie } = getLocaleForRequest(request);

  // ─── Fase waitlist: blocca la piattaforma ──────────────────────────
  // Durante la fase waitlist ogni pagina viene rimandata a /waitlist così la
  // piattaforma resta chiusa. Sono escluse le route API, gli asset statici e
  // la stessa pagina waitlist.
  const { pathname } = request.nextUrl;
  const isWaitlistRoute = pathname === "/waitlist";
  const isApiOrAsset =
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.includes(".");

  // Le route di auth restano raggiungibili durante la fase waitlist così il
  // proprietario (e gli account pre-provisionati) possono accedere. Il resto
  // dell'app resta bloccato sulla waitlist finché la fase non viene rimossa.
  const isAuthRoute =
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/reset-password" ||
    pathname === "/auth/callback";

  // Sviluppo locale senza chiavi Supabase: lascia passare tutto così l'app è
  // usabile prima della configurazione delle chiavi. In produzione questo
  // bypass non scatta mai — chiavi mancanti = fail closed (rotte protette → /login).
  const supabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  if (!supabaseConfigured && process.env.NODE_ENV !== "production") {
    const res = NextResponse.next();
    return needsCookie ? withLocaleCookie(res, detectedLocale) : res;
  }

  // I visitatori con un codice di accesso valido sono ospiti a tutti gli
  // effetti: nessun login Supabase richiesto e nessun blocco waitlist. Il
  // cookie viene impostato lato server dopo la validazione del codice (vedi
  // src/lib/access-code.ts); il codice stesso non viene mai verificato qui.
  // Parametro ?access=1: il form waitlist lo usa dopo aver inserito il codice
  // d'accesso valido. Imposta il cookie qui lato proxy perche' il Set-Cookie
  // della API potrebbe non essere ancora disponibile al browser al momento
  // del redirect.
  const hasAccessParam = request.nextUrl.searchParams.get("access") === "1";
  const isAccessVisitor =
    request.cookies.get(ACCESS_COOKIE)?.value === "1" || hasAccessParam;

  // Le rotte marketing pubbliche (home, agents, bundles, ecc.) sono
  // accessibili anche durante la fase waitlist così il catalogo e i bundle
  // sono visibili. La navigazione interna (/account, /settings, /dashboard)
  // resta bloccata senza autenticazione.
  const isPublicMarketing =
    isPublicPath(pathname) && !pathname.startsWith("/api/");

  if (!isWaitlistRoute && !isApiOrAsset && !isAuthRoute && !isPublicMarketing) {
    if (!isAccessVisitor) {
      // Prima prova la sessione Supabase: utenti autenticati passano.
      // Se resolveSession lancia un errore (Supabase down, timeout, ecc.)
      // trattalo come "no user" e manda alla waitlist — mai lasciare che
      // un'eccezione propaghi e causi un loop di redirect.
      let user: { id: string } | null = null;
      let sessionResponse = NextResponse.next({ request });
      try {
        const resolved = await resolveSession(request);
        user = resolved.user;
        sessionResponse = resolved.response;
      } catch {
        user = null;
      }
      if (!user) {
        const waitlistUrl = request.nextUrl.clone();
        waitlistUrl.pathname = "/waitlist";
        const redirectRes = NextResponse.redirect(waitlistUrl);
        return needsCookie ? withLocaleCookie(redirectRes, detectedLocale) : redirectRes;
      }
      return needsCookie ? withLocaleCookie(sessionResponse, detectedLocale) : sessionResponse;
    }
  }

  // I possessori del codice raggiungono ogni pagina senza login — il codice è
  // il loro invito. (Gli handler API risolvono comunque la sessione da soli e
  // in assenza ripiegano sul comportamento anonimo, come le anteprime pubbliche.)
  if (isAccessVisitor) {
    const res = NextResponse.next();
    if (hasAccessParam) {
      // Imposta il cookie ac_access qui lato proxy, cosi' le richieste
      // successive lo avranno anche senza passare di nuovo per la API.
      res.cookies.set(ACCESS_COOKIE, "1", {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
      });
    }
    return needsCookie ? withLocaleCookie(res, detectedLocale) : res;
  }

  // Rotta protetta: richiede una sessione, altrimenti rimanda a /login
  // (la destinazione voluta non viene conservata, come nel flusso attuale).
  try {
    const { response, user } = await resolveSession(request);
    if (!user) {
      // Le route API ricevono un pulito 401 JSON invece di un redirect HTML —
      // i client che chiamano fetch() seguirebbero il redirect e proverebbero a
      // fare il parse dell'HTML.
      if (request.nextUrl.pathname.startsWith("/api/")) {
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
    return needsCookie ? withLocaleCookie(response, detectedLocale) : response;
  } catch {
    // Errore Supabase: trattalo come non autenticato → /login
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.hash = "";
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
