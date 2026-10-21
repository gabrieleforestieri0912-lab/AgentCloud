import crypto from "crypto";

import { NextRequest, NextResponse } from "next/server";

import { getSessionUser } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

import { validateMcpUrl } from "@/lib/mcp/security";
import { CUSTOM_SERVER_PREFIX } from "@/lib/mcp/target";
import { upsertMcpConnection } from "@/lib/mcp/store";

/**
 * POST /api/mcp/custom
 *
 * Aggiunge un server MCP personalizzato (URL + metodo di autenticazione).
 *
 * Sicurezza:
 *   - l'URL viene validato (solo https, niente IP privati/loopback/metadata
 *     cloud, niente porte strane) PRIMA di salvarlo: un server che punta a
 *     `http://169.254.169.254/` non deve nemmeno entrare nel DB;
 *   - la chiave API, se presente, viene cifrata e non torna mai al frontend.
 */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: {
    name?: string;
    url?: string;
    transport?: string;
    auth?: string;
    apiKey?: string;
    description?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const name = (body.name ?? "").trim().slice(0, 60);
  if (!name) return NextResponse.json({ error: "missing_name" }, { status: 400 });

  const transport = body.transport === "sse" ? "sse" : "streamable_http";
  const auth = body.auth === "oauth2" || body.auth === "api_key" ? body.auth : "none";

  const checked = await validateMcpUrl(body.url ?? "", { resolveDns: true });
  if (!checked.ok) {
    logAudit("mcp_custom_rejected", { tenantId: user.id, reason: checked.error });
    return NextResponse.json({ error: checked.error }, { status: 400 });
  }

  const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
  if (auth === "api_key" && !apiKey) {
    return NextResponse.json({ error: "api_key_required" }, { status: 400 });
  }

  const serverId = `${CUSTOM_SERVER_PREFIX}${crypto.randomUUID()}`;

  await upsertMcpConnection({
    tenantId: user.id,
    serverId,
    status: "pending",
    transport,
    url: checked.url.toString(),
    ...(apiKey ? { apiKey } : {}),
    metadata: {
      name,
      description: (body.description ?? "").trim().slice(0, 200) || `Custom MCP server: ${name}`,
      auth,
      api_key_header: "Authorization",
      scopes: [],
      custom: true,
    },
  });

  logAudit("mcp_custom_added", { tenantId: user.id, serverId, auth, transport });
  return NextResponse.json({ ok: true, serverId, name });
}
