import { NextRequest, NextResponse } from "next/server";
import {
  decodeGoogleState,
  getGoogleRedirectUri,
  getGoogleScopes,
  googleStatesMatch,
  readGoogleStateCookie,
  GOOGLE_STATE_COOKIE,
  GOOGLE_RETURN_COOKIE,
} from "@/lib/google/oauth";
import { TENANT_GOOGLE_ID, upsertGoogleConnection } from "@/lib/google/connections";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin-access";
import { isSafeRedirectPath } from "@/lib/safe-redirect-path";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Fase 2 — callback OAuth Google + scambio del token.
 *
 * GET /api/auth/google/callback?code&state&error...
 *   1. Verifica il nonce di `state` contro il cookie httpOnly (CSRF) e usa
 *      lo user_id incorporato in `state` (il passo di connessione è autenticato).
 *   2. Scambia `code` con access_token + refresh_token + expires_in.
 *   3. Recupera l'email dell'account Google collegato (userinfo). L'email NON
 *      viene salvata quando l'account che si collega è un admin (regola privacy).
 *   4. Cripta entrambi i token (AES-256-GCM) e aggiorna la riga per utente.
 *
 * Ogni errore rimanda alla pagina da cui l'utente è partito (cookie returnTo)
 * con ?google=error&reason=... — mai una pagina bianca o un 500.
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;

  const returnBase = () => {
    const c = req.cookies.get(GOOGLE_RETURN_COOKIE)?.value;
    return c && isSafeRedirectPath(c) ? c : "/dashboard";
  };
  const done = (search: string) => {
    const base = returnBase();
    const sep = base.includes("?") ? "&" : "?";
    const res = NextResponse.redirect(new URL(`${base}${sep}${search}`, req.url));
    res.cookies.delete(GOOGLE_STATE_COOKIE);
    res.cookies.delete(GOOGLE_RETURN_COOKIE);
    return res;
  };
  const fail = (reason: string) => done(`google=error&reason=${reason}`);

  // L'utente ha negato il consenso sullo schermo Google — messaggio leggibile,
  // non un 500.
  const oauthError = params.get("error");
  if (oauthError) {
    return fail(oauthError === "access_denied" ? "denied" : "consent");
  }

  const code = params.get("code");
  const state = params.get("state");
  if (!code || !state) {
    return fail("missing_params");
  }

  // 1. Controllo CSRF: lo state deve decodificarsi e il suo nonce deve
  // corrispondere al cookie httpOnly impostato da /connect. Lo user_id viene
  // dallo state verificato.
  const payload = decodeGoogleState(state);
  const cookieNonce = readGoogleStateCookie(req);
  if (
    !payload ||
    !cookieNonce ||
    !googleStatesMatch(payload.nonce, cookieNonce)
  ) {
    return fail("state_mismatch");
  }
  const isTenant = payload.userId === TENANT_GOOGLE_ID;
  if (!isTenant && !UUID_RE.test(payload.userId)) {
    return fail("state_mismatch");
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return fail("config");
  }

  // 2. Scambia il codice di autorizzazione con i token (form-encoded, come
  // richiede Google).
  let tokenData: {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  };
  try {
    // Scambio token finto solo per dev (GOOGLE_FAKE_TOKEN_EXCHANGE=1), così
    // l'intero flusso OAuth è provabile end-to-end senza un vero account Google.
    // Da non attivare mai fuori da ambienti locali/dev.
    if (process.env.GOOGLE_FAKE_TOKEN_EXCHANGE === "1") {
      tokenData = {
        access_token: `ya29.test_${payload.userId.slice(0, 8)}_${Date.now()}`,
        refresh_token: `1//test_refresh_${payload.userId.slice(0, 8)}`,
        expires_in: 3600,
        scope: getGoogleScopes().join(" "),
      };
    } else {
      const tokenRes = await fetch(TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: getGoogleRedirectUri(),
          grant_type: "authorization_code",
        }).toString(),
      });
      if (!tokenRes.ok) {
        return fail("token_exchange");
      }
      tokenData = (await tokenRes.json()) as typeof tokenData;
    }
  } catch {
    return fail("token_exchange");
  }

  const accessToken = tokenData.access_token;
  const refreshToken = tokenData.refresh_token;
  if (!accessToken || !refreshToken) {
    return fail("no_token");
  }

  // 3. Email dell'account Google collegato (solo per display — non fatale in
  // caso di errore). Gli admin non la salvano: la loro email collegata non
  // viene mai persistita (tranne per il tenant).
  let googleEmail: string | null = null;
  let isAdmin = false;
  if (!isTenant) {
    try {
      const admin = createAdminClient();
      if (admin) {
        const { data: u } = await admin.auth.admin.getUserById(payload.userId);
        isAdmin = isAdminEmail(u?.user?.email ?? null);
      }
    } catch {
      // ripiega su non-admin (salva l'email)
    }
  }
  if (!isAdmin) {
    try {
      const infoRes = await fetch(USERINFO_URL, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (infoRes.ok) {
        const info = (await infoRes.json()) as { email?: string };
        googleEmail = info.email ?? null;
      }
    } catch {
      // ignora — ciò che conta sono i token
    }
  }

  // 4. Cripta e salva (una riga per utente).
  try {
    await upsertGoogleConnection({
      userId: payload.userId,
      googleEmail,
      accessToken,
      refreshToken,
      scopes: (tokenData.scope ?? "").split(" ").filter(Boolean),
      expiresAt: tokenData.expires_in
        ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
        : null,
    });
  } catch {
    return fail("store");
  }

  return done("google=connected");
}
