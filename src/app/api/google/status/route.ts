import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/server";
import { TENANT_GOOGLE_ID, getGoogleConnectionSummary } from "@/lib/google/connections";

/**
 * GET /api/google/status
 * Restituisce lo stato della connessione Google dell'utente (email, scopes,
 * data di collegamento) per la UI delle impostazioni. I chiamanti non
 * autenticati ricevono { authenticated: false }.
 */
export async function GET() {
  const user = await getSessionUser();
  const userId = user?.id ?? null;
  if (!userId) {
    return NextResponse.json({ authenticated: false, connected: false });
  }
  const conn =
    (await getGoogleConnectionSummary(userId).catch(() => null)) ??
    (user?.id && true
      ? await getGoogleConnectionSummary(user?.id ?? null).catch(() => null)
      : null);
  return NextResponse.json({
    authenticated: true,
    connected: conn !== null,
    email: conn?.googleEmail ?? null,
    scopes: conn?.scopes ?? [],
    connectedAt: conn?.connectedAt ?? null,
  });
}