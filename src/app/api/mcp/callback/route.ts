import { NextRequest, NextResponse } from "next/server";

import { getSessionUser } from "@/lib/supabase/server";
import { isSafeRedirectPath } from "@/lib/safe-redirect-path";
import { verifyState } from "@/lib/integrations/state";

import {
  MCP_RETURN_PATH,
  MCP_STATE_COOKIE,
  completeMcpAuthorization,
} from "@/lib/mcp/authorize-flow";

/**
 * GET /api/mcp/callback?code=…&state=…
 *
 * Punto di rientro del provider. Verifica lo `state` (firmato, confrontato
 * con il cookie e con la riga della connessione) e solo dopo scambia il
 * codice con i token.
 *
 * Il `serverId` non viene letto dalla query: arriva dentro lo `state`
 * firmato, quindi non può essere manomesso.
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const state = params.get("state");
  const cookieState = req.cookies.get(MCP_STATE_COOKIE)?.value;

  const returnTo = (() => {
    const raw = params.get("returnTo");
    return raw && isSafeRedirectPath(raw) ? raw : MCP_RETURN_PATH;
  })();

  const redirectWith = (search: string) => {
    const url = new URL(returnTo, req.url);
    url.search = search;
    const res = NextResponse.redirect(url);
    res.cookies.delete(MCP_STATE_COOKIE);
    return res;
  };

  const payload = state ? verifyState(state, cookieState) : null;
  if (!payload) {
    return redirectWith("app=&status=error&reason=state_mismatch");
  }

  const user = await getSessionUser();
  if (!user || user.id !== payload.t) {
    // Lo `state` è stato firmato per un altro utente (o per nessuno).
    return redirectWith("app=&status=error&reason=state_mismatch");
  }

  const result = await completeMcpAuthorization(
    user.id,
    payload.p,
    {
      code: params.get("code"),
      state,
      error: params.get("error"),
      errorDescription: params.get("error_description"),
    },
    req.url,
    cookieState,
  );

  if (!result.ok) {
    const url = new URL(returnTo, req.url);
    url.searchParams.set("app", payload.p);
    url.searchParams.set("status", "error");
    url.searchParams.set("reason", result.error.slice(0, 200));
    const res = NextResponse.redirect(url);
    res.cookies.delete(MCP_STATE_COOKIE);
    return res;
  }

  const url = new URL(returnTo, req.url);
  url.searchParams.set("app", result.serverId);
  url.searchParams.set("status", "connected");
  const res = NextResponse.redirect(url);
  res.cookies.delete(MCP_STATE_COOKIE);
  return res;
}
