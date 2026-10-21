import { NextRequest, NextResponse } from "next/server";

import { getSessionUser } from "@/lib/supabase/server";

import { setMcpEnabledTools } from "@/lib/mcp/store";

/**
 * PATCH /api/mcp/tools
 *
 * Accende e spegne i singoli tool di un'integrazione.
 * Body: { serverId, enabledTools: string[] }
 *
 * `enabledTools: null` resetta al default (solo i tool di lettura).
 * Un tool di scrittura può essere abilitato, ma quando l'agente lo usa
 * chiede comunque la conferma all'utente.
 */
export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { serverId?: string; enabledTools?: string[] | null };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const serverId = (body.serverId ?? "").trim();
  if (!serverId) return NextResponse.json({ error: "missing_server_id" }, { status: 400 });

  const enabled = body.enabledTools;
  if (enabled !== null && enabled !== undefined) {
    if (!Array.isArray(enabled) || enabled.some((t) => typeof t !== "string")) {
      return NextResponse.json({ error: "invalid_tools" }, { status: 400 });
    }
  }

  await setMcpEnabledTools(user.id, serverId, enabled ?? null);
  return NextResponse.json({ ok: true });
}
