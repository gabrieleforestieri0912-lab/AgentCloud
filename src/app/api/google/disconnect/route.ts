import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/server";
import {
  getGoogleConnection,
  deleteGoogleConnection,
} from "@/lib/google/connections";

const REVOKE_URL = "https://oauth2.googleapis.com/revoke";

/**
 * POST /api/google/disconnect
 * Revokes the stored refresh token at Google (best effort) and deletes the
 * user's row from google_connections. Requires a session.
 */
export async function POST() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  const conn = await getGoogleConnection(user.id).catch(() => null);
  if (!conn) {
    return NextResponse.json({ ok: true, disconnected: false });
  }

  // Revoke the refresh token server-side. Google's revoke endpoint is
  // fire-and-forget — a failure here must not block removing the local row.
  try {
    await fetch(REVOKE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token: conn.refreshToken }).toString(),
    });
  } catch {
    // ignore — local disconnect still proceeds
  }

  await deleteGoogleConnection(user.id);
  return NextResponse.json({ ok: true, disconnected: true });
}