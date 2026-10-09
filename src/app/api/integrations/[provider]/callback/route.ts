import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/server";
import { isSafeRedirectPath } from "@/lib/safe-redirect-path";
import { isSupportedProvider } from "@/lib/integrations/types";
import { getProvider, getRedirectUri } from "@/lib/integrations/registry";
import { getCatalogEntry } from "@/lib/integrations/catalog";
import {
  readStateCookie,
  readPkceCookie,
  verifyState,
  verifySignedUrlToken,
  INTEGRATIONS_STATE_COOKIE,
  INTEGRATIONS_RETURN_COOKIE,
  INTEGRATIONS_PKCE_COOKIE,
} from "@/lib/integrations/state";
import { upsertTenantIntegration, markTenantIntegration, getIntegration } from "@/lib/integrations/store";

/**
 * GET /api/integrations/[provider]/callback?code&state
 * Validates state (CSRF), exchanges code server-side via provider adapter, encrypts & upserts tenant_integrations.
 *
 * Il nome del parametro con la credenziale lo dichiara l'adapter (`authParam`):
 * "code" per i provider OAuth standard, "token" per Trello che restituisce la
 * credenziale già pronta. Il tenantInput (es. `store_url`) arriva nello `state`
 * firmato, non da un parametro riappreso: il browser non può cambiarlo.
 *
 * POST /api/integrations/[provider]/callback — solo WooCommerce.
 * WooCommerce non ha un code flow: dopo l'approvazione manda le Consumer
 * Key/Secret con una POST server-to-server a `callback_url`, corpo JSON. Senza
 * questo handler le credenziali non arriverebbero mai da nessuna parte, perché
 * la redirezione del browser porta solo `?success=1`.
 */
type CallbackBody = {
  consumer_key?: unknown;
  consumer_secret?: unknown;
  key_id?: unknown;
  user_id?: unknown;
  key_permissions?: unknown;
};

const asText = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/**
 * POST di WooCommerce: contiene le credenziali. Risponde 200 su successo perché
 * WooCommerce non usa la risposta per decidere nulla, ma 400 su errore: senza
 * questo la chiave se ne sarebbe accorta come "approvata" mentre da noi è
 * rimasta nonsalvata, e il negoziere avrebbe una chiave viva che non
 * controlliamo.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider: raw } = await params;
  const provider = raw?.toLowerCase();
  if (!isSupportedProvider(provider) || provider !== "woocommerce") {
    return NextResponse.json({ error: `Unsupported provider: ${raw}` }, { status: 400 });
  }

  let body: CallbackBody;
  try {
    body = (await req.json()) as CallbackBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  // Niente cookie: questa richiesta arriva dal server del negozio. Il tenant si
  // legge dal token firmato che l'utente ha ricevuto come callback_url.
  const payload = verifySignedUrlToken(req.nextUrl.searchParams.get("tx"));
  if (!payload || payload.p !== provider) {
    return NextResponse.json({ error: "invalid_or_expired_token" }, { status: 400 });
  }

  const consumerKey = asText(body.consumer_key);
  const consumerSecret = asText(body.consumer_secret);
  if (!consumerKey || !consumerSecret) {
    return NextResponse.json({ error: "missing_credentials" }, { status: 400 });
  }

  const adapter = getProvider(provider);
  if (!adapter) return NextResponse.json({ error: "provider_not_configured" }, { status: 400 });

  try {
    const tokens = await adapter.exchangeCode({
      code: consumerKey,
      codeSecret: consumerSecret,
      // WooCommerce non scambia codici, quindi `redirectUri` non serve
      // all'adapter: resta obbligatorio nella firma perché gli altri provider
      // lo confrontano carattere per carattere con quello del passo di
      // autorizzazione, e qui non deve poter mancare.
      redirectUri: getRedirectUri(req.url, provider),
      tenantInput: payload.x,
    });
    await upsertTenantIntegration({
      tenantId: payload.t,
      provider,
      tokens,
      status: "connected",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "store";
    await markTenantIntegration(payload.t, provider, "error").catch(() => {});
    return NextResponse.json({ error: msg.slice(0, 200) }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

/** Legge la connessione senza decrypt: serve solo per lo stato mostrato in UI. */
async function statusOf(tenantId: string, provider: string): Promise<string | null> {
  try {
    const row = await getIntegration(tenantId, provider);
    return row?.status ?? null;
  } catch {
    return null;
  }
}

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
  const paramsUrl = req.nextUrl.searchParams;
  const adapter = getProvider(provider);
  const authParam = adapter?.authParam ?? "code";
  const code = paramsUrl.get(authParam);
  // Seconda credenziale, se l'adapter la dichiara (WooCommerce: consumer_secret).
  const codeSecret = adapter?.secretParam
    ? (paramsUrl.get(adapter.secretParam) ?? undefined)
    : undefined;
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
    res.cookies.delete(INTEGRATIONS_PKCE_COOKIE);
    return res;
  };
  const fail = (reason: string) => {
    // mark error if row exists (best-effort)
    if (user) void markTenantIntegration(user.id, provider, "error").catch(() => {});
    return out(`integration=${provider}&status=error&reason=${encodeURIComponent(reason)}`);
  };

  // ── WooCommerce: nessun code flow ─────────────────────────────────────────
  // `callback_url` e `return_url` sono la stessa pagina. WooCommerce chiama
  // questa URL due volte e con metodi diversi:
  //   POST (server → server) con le credenziali, gestita sopra;
  //   GET  (browser) con ?success=1&user_id=..., che riporta in dashboard.
  // Il GET non contiene e non conterrà mai la coppia key/secret.
  if (getCatalogEntry(provider)?.authType === "keypair") {
    const payload = verifySignedUrlToken(paramsUrl.get("tx"));
    if (!payload || payload.p !== provider) return fail("invalid_or_expired_token");

    // Il merchant ha premuto "Deny": WooCommerce rimanda a return_url con
    // success=0 senza mai chiamare il server, quindi qui non ci sono credenziali.
    if (paramsUrl.get("success") !== "1") {
      return out(`integration=${provider}&status=error&reason=${encodeURIComponent("denied")}`);
    }

    // success=1 significa "approvato", ma le credenziali le consegna la POST,
    // che può arrivare dopo questo redirect (due richieste separate). Se non è
    // ancora connessa lo diciamo, invece di far credere che sia tutto pronto.
    const status = await statusOf(payload.t, provider);
    if (status === "connected") {
      return out(`integration=${provider}&status=connected`);
    }
    return out(
      `integration=${provider}&status=pending&reason=${encodeURIComponent("awaiting_credentials")}`,
    );
  }

  const cookieState = readStateCookie(req);
  const payload = state ? verifyState(state, cookieState) : null;
  const tenantId = user?.id || payload?.t;

  if (!tenantId) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (error) {
    return fail(errorDesc || error);
  }

  if (!code || !state) return fail("missing_params");
  if (!payload) return fail("state_mismatch");
  if (payload.p !== provider) return fail("state_provider_mismatch");
  if (payload.t !== tenantId) return fail("state_tenant_mismatch");

  if (!adapter) return fail("provider_not_configured");

  // Deve essere identico a quello usato in authorize: il token exchange con Google
  // fallisce se redirect_uri non coincide carattere per carattere con quello del passo
  // di autorizzazione (per google_sheets: /api/integrations/google_sheets/callback).
  const redirectUri = getRedirectUri(req.url, provider);

  // PKCE: il verifier torna dal cookie httpOnly. Va riletto solo per i provider
  // che lo dichiarano, e senza di lui lo scambio fallirebbe lato provider.
  const codeVerifier = readPkceCookie(req);

  let tokens;
  try {
    tokens = await adapter.exchangeCode({
      code,
      redirectUri,
      tenantInput: payload.x,
      codeVerifier,
      codeSecret,
    });
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
