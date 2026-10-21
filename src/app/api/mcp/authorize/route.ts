import { NextRequest, NextResponse } from "next/server";

import { getSessionUser } from "@/lib/supabase/server";
import { isSafeRedirectPath } from "@/lib/safe-redirect-path";

import {
  MCP_RETURN_PATH,
  MCP_STATE_COOKIE,
  MCP_STATE_MAX_AGE,
  startMcpAuthorization,
} from "@/lib/mcp/authorize-flow";
import { resolveMcpTarget } from "@/lib/mcp/target";

/**
 * GET /api/mcp/authorize?serverId=…&returnTo=…
 *
 * Avvia il flusso OAuth2 di un'integrazione e rimanda il browser al
 * provider. Il `state` firmato viene salvato in un cookie httpOnly e sulla
 * riga della connessione: al rientro il callback verifica entrambi.
 */
export async function GET(req: NextRequest) {
  const serverId = (req.nextUrl.searchParams.get("serverId") ?? "").trim();
  const returnParam = req.nextUrl.searchParams.get("returnTo");
  const returnTo = returnParam && isSafeRedirectPath(returnParam) ? returnParam : MCP_RETURN_PATH;

  if (!serverId) {
    return NextResponse.json({ error: "Missing serverId" }, { status: 400 });
  }

  const user = await getSessionUser();
  if (!user) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", `/api/mcp/authorize?serverId=${encodeURIComponent(serverId)}`);
    return NextResponse.redirect(loginUrl);
  }

  const resolved = await resolveMcpTarget(user.id, serverId);
  if (!resolved) {
    return NextResponse.json({ error: `Unknown app: ${serverId}` }, { status: 404 });
  }

  const started = await startMcpAuthorization(user.id, resolved, req.url);
  if (!started.ok) {
    const url = new URL(returnTo, req.url);
    url.searchParams.set("app", serverId);
    url.searchParams.set("status", "error");
    url.searchParams.set("reason", started.error.slice(0, 200));
    return NextResponse.redirect(url);
  }

  const res = NextResponse.redirect(started.authorizationUrl);
  res.cookies.set(MCP_STATE_COOKIE, started.state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MCP_STATE_MAX_AGE,
  });
  return res;
}
