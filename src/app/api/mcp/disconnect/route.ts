import { NextRequest, NextResponse } from "next/server";

import { getSessionUser } from "@/lib/supabase/server";

import { revokeAndDelete } from "@/lib/mcp/tokens";

/**
 * POST /api/mcp/disconnect
 *
 * Disconnette un'app: revoca il token (se il provider lo supporta) e
 * CANCELLA la riga, quindi token, refresh token, client secret e API key
 * spariscono. I suoi tool non sono più esposti all'agente.
 */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { serverId?: string };
  try {
    body = (await req.json()) as { serverId?: string };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const serverId = (body.serverId ?? "").trim();
  if (!serverId) return NextResponse.json({ error: "missing_server_id" }, { status: 400 });

  await revokeAndDelete(user.id, serverId);
  return NextResponse.json({ ok: true });
}
