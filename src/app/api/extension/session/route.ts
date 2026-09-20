import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/server";
import { getOwnedAgentSlugs } from "@/lib/agents/ownership";

/**
 * GET /api/extension/session
 * Contratto pubblico minimo per AgentCloud Copilot.
 * Non restituisce cookie, token, ruoli sensibili o dati di billing.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { authenticated: false, owned: [] },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const owned = await getOwnedAgentSlugs(user.id, user);
  return NextResponse.json(
    {
      authenticated: true,
      owned,
      email: user.email ?? null,
      name:
        typeof user.user_metadata?.full_name === "string"
          ? user.user_metadata.full_name
          : null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
