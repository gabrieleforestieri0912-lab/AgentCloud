import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/server";
import { TENANT_GOOGLE_ID, getGoogleConnection, deleteGoogleConnection } from "@/lib/google/connections";

const REVOKE_URL = "https://oauth2.googleapis.com/revoke";

/**
 * POST /api/google/disconnect
 * Revoca il refresh token salvato presso Google (best effort) e cancella la
 * riga dell'utente da google_connections. Richiede una sessione.
 */
export async function POST() {
  const user = await getSessionUser();
  const userId = user?.id ?? null;
  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  const conn =
    (await getGoogleConnection(userId).catch(() => null)) ??
    (user?.id && true ? await getGoogleConnection(user?.id ?? null).catch(() => null) : null);
  if (!conn) {
    return NextResponse.json({ ok: true, disconnected: false });
  }

  // Revoca il refresh token lato server. L'endpoint di revoca di Google è
  // fire-and-forget — un errore qui non deve bloccare la rimozione della riga.
  try {
    await fetch(REVOKE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token: conn.refreshToken }).toString(),
    });
  } catch {
    // ignora — la disconnessione locale prosegue comunque
  }

  await deleteGoogleConnection(userId).catch(() => {});
  return NextResponse.json({ ok: true, disconnected: true });
}