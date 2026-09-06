import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/server";
import { hasPlatformAccess } from "@/lib/access-code";
import {
  TENANT_GOOGLE_ID,
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
  const hasAccess = await hasPlatformAccess();
  const userId = user?.id ?? (hasAccess ? TENANT_GOOGLE_ID : null);
  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  const conn =
    (await getGoogleConnection(userId).catch(() => null)) ??
    (user?.id && hasAccess ? await getGoogleConnection(TENANT_GOOGLE_ID).catch(() => null) : null);
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

  await deleteGoogleConnection(userId).catch(() => {});
  if (hasAccess && userId !== TENANT_GOOGLE_ID) {
    await deleteGoogleConnection(TENANT_GOOGLE_ID).catch(() => {});
  }
  return NextResponse.json({ ok: true, disconnected: true });
}