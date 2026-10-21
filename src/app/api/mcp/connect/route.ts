import { NextRequest, NextResponse } from "next/server";

import { getSessionUser } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

import { connectMcp, listMcpTools } from "@/lib/mcp/client";
import { resolveMcpTarget } from "@/lib/mcp/target";
import {
  getMcpConnection,
  setMcpConnectionStatus,
  setMcpToolsSnapshot,
  upsertMcpConnection,
} from "@/lib/mcp/store";

/**
 * POST /api/mcp/connect
 *
 * Collega un server che NON usa OAuth2:
 *   - `auth: "none"`  → si salva la connessione e si verifica che il server
 *     risponda (handshake + elenco tool).
 *   - `auth: "api_key"` → la chiave arriva nel corpo, viene CIFRATA e
 *     salvata, e non torna mai al frontend.
 *
 * Per i server OAuth2 il flusso è /api/mcp/authorize → provider →
 * /api/mcp/callback.
 */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { serverId?: string; apiKey?: string };
  try {
    body = (await req.json()) as { serverId?: string; apiKey?: string };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const serverId = (body.serverId ?? "").trim();
  if (!serverId) return NextResponse.json({ error: "missing_server_id" }, { status: 400 });

  const resolved = await resolveMcpTarget(user.id, serverId);
  if (!resolved) return NextResponse.json({ error: "unknown_app" }, { status: 404 });
  if (resolved.auth === "oauth2") {
    return NextResponse.json(
      { error: "oauth_required", authorizeUrl: `/api/mcp/authorize?serverId=${encodeURIComponent(serverId)}` },
      { status: 400 },
    );
  }

  const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
  if (resolved.auth === "api_key" && !apiKey) {
    return NextResponse.json({ error: "api_key_required" }, { status: 400 });
  }

  // Salva (o aggiorna) la connessione. La chiave API viene cifrata: da
  // qui in poi esiste solo in chiaro dentro il server.
  await upsertMcpConnection({
    tenantId: user.id,
    serverId,
    status: "pending",
    transport: resolved.transport,
    url: resolved.url,
    ...(apiKey ? { apiKey } : {}),
  });

  // Rileggi la riga: il target deve vedere i segreti appena salvati.
  const row = await getMcpConnection(user.id, serverId);
  const target = { ...resolved, row };
  const connected = await connectMcp(target);

  if (!connected.ok) {
    await setMcpConnectionStatus(user.id, serverId, "error").catch(() => {});
    logAudit("mcp_connect_failed", { tenantId: user.id, serverId, code: connected.code });
    return NextResponse.json({ error: connected.error, code: connected.code }, { status: 502 });
  }

  try {
    const tools = await listMcpTools(connected.session);
    await setMcpToolsSnapshot(
      user.id,
      serverId,
      tools.map((t) => ({
        name: t.name,
        description: t.description,
        readOnlyHint: t.readOnlyHint,
        destructiveHint: t.destructiveHint,
        idempotentHint: t.idempotentHint,
      })),
    );
  } catch {
    // Il server è raggiungibile ma non ha tool: è comunque una connessione
    // valida (un server MCP può esporre solo risorse).
  } finally {
    await connected.session.close();
  }

  await setMcpConnectionStatus(user.id, serverId, "connected").catch(() => {});
  logAudit("mcp_connected", { tenantId: user.id, serverId, auth: resolved.auth });
  return NextResponse.json({ ok: true });
}
