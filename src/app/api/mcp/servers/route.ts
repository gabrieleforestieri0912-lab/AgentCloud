import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/supabase/server";

import { describeMcpServers } from "@/lib/mcp/describe";

/**
 * GET /api/mcp/servers
 *
 * Elenco delle integrazioni disponibili con lo stato di ciascuna per
 * l'utente corrente. Nessun segreto: solo stato, tool e metadati pubblici.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ servers: [] }, { status: 200, headers: { "Cache-Control": "no-store" } });
  }
  const servers = await describeMcpServers(user.id);
  return NextResponse.json(
    { servers },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
