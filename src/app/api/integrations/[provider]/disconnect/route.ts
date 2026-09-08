import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupportedProvider } from "@/lib/integrations/types";
import { getProvider } from "@/lib/integrations/registry";
import { decryptMaybe } from "@/lib/integrations/encryption";

/**
 * POST /api/integrations/[provider]/disconnect
 * Revokes provider token where supported, then deletes/marks row disconnected.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider: raw } = await params;
  const provider = raw?.toLowerCase();
  if (!isSupportedProvider(provider)) {
    return NextResponse.json({ error: `Unsupported provider: ${raw}` }, { status: 400 });
  }

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "db_unavailable" }, { status: 500 });

  const { data: row } = await admin
    .from("tenant_integrations")
    .select("id, access_token, status")
    .eq("tenant_id", user.id)
    .eq("provider", provider)
    .maybeSingle();

  if (!row) return NextResponse.json({ error: "not_connected" }, { status: 404 });

  // Best-effort revoke at provider (ignore failures — local disconnect always wins)
  const adapter = getProvider(provider);
  const token = decryptMaybe((row as { access_token: string | null }).access_token);
  if (token && adapter?.revokeToken) {
    try {
      await adapter.revokeToken({ accessToken: token });
    } catch {
      // non-fatal
    }
  } else if (provider === "slack" && token) {
    // Slack revoke: https://slack.com/api/auth.revoke
    try {
      await fetch("https://slack.com/api/auth.revoke", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Bearer ${token}` },
      });
    } catch {}
  } else if (provider === "hubspot" && token) {
    // HubSpot revoke via https://api.hubapi.com/oauth/v1/token -> DELETE? not needed
  }

  // Delete row (or mark disconnected) — delete keeps table clean; also support status
  const { error } = await admin.from("tenant_integrations").delete().eq("id", (row as { id: string }).id);
  if (error) {
    // fallback: mark disconnected
    await admin
      .from("tenant_integrations")
      .update({ status: "disconnected", access_token: null, refresh_token: null, updated_at: new Date().toISOString() })
      .eq("id", (row as { id: string }).id);
  }

  // Redirect for form posts, else JSON
  const wantsJson = req.headers.get("content-type")?.includes("application/json");
  if (wantsJson) return NextResponse.json({ ok: true });

  const url = new URL("/dashboard/integrations", req.url);
  url.searchParams.set("integration", provider);
  url.searchParams.set("status", "disconnected");
  return NextResponse.redirect(url);
}
