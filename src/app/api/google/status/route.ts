import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/server";
import { getGoogleConnectionSummary } from "@/lib/google/connections";

/**
 * GET /api/google/status
 * Returns the current user's Google connection state (email, scopes, connected
 * date) for the settings UI. Unauthenticated callers get { authenticated: false }.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ authenticated: false, connected: false });
  }
  const conn = await getGoogleConnectionSummary(user.id).catch(() => null);
  return NextResponse.json({
    authenticated: true,
    connected: conn !== null,
    email: conn?.googleEmail ?? null,
    scopes: conn?.scopes ?? [],
    connectedAt: conn?.connectedAt ?? null,
  });
}