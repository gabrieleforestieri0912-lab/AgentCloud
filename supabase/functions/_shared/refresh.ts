import { decryptMaybe, encryptToken } from "./encryption.ts";
import { getServiceClient } from "./supabase.ts";

export type IntegrationRow = {
  id: string;
  tenant_id: string;
  provider: string;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
  scope: string | null;
  external_account_id: string | null;
  metadata: Record<string, unknown> | null;
  status: string;
};

function isExpiring(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  const exp = new Date(expiresAt).getTime();
  if (isNaN(exp)) return false;
  return Date.now() > exp - 5 * 60 * 1000; // refresh 5m before expiry
}

async function refreshHubSpot(refreshToken: string) {
  const clientId = Deno.env.get("HUBSPOT_CLIENT_ID") || "";
  const clientSecret = Deno.env.get("HUBSPOT_CLIENT_SECRET") || "";
  const res = await fetch("https://api.hubapi.com/oauth/v1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }).toString(),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { message?: string }).message || "HubSpot refresh failed");
  return json as Record<string, unknown>;
}

async function refreshGoogleSheets(refreshToken: string) {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID") || "";
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET") || "";
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }).toString(),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { error_description?: string }).error_description || (json as { error?: string }).error || "Google refresh failed");
  return json as Record<string, unknown>;
}

export async function getValidAccessToken(row: IntegrationRow): Promise<{ accessToken: string; row: IntegrationRow }> {
  const accessToken = await decryptMaybe(row.access_token);
  if (!accessToken) throw new Error("Missing access_token");

  const needsRefresh =
    isExpiring(row.expires_at) &&
    !!(await decryptMaybe(row.refresh_token));

  if (!needsRefresh) return { accessToken, row };

  const refreshToken = (await decryptMaybe(row.refresh_token))!;
  let refreshed: Record<string, unknown> | null = null;
  let newAccess = accessToken;
  let newRefresh: string | null = refreshToken;
  let newExpires: string | null = row.expires_at;

  if (row.provider === "hubspot") {
    refreshed = await refreshHubSpot(refreshToken);
    newAccess = refreshed.access_token as string;
    if (refreshed.refresh_token) newRefresh = refreshed.refresh_token as string;
    if (refreshed.expires_in) newExpires = new Date(Date.now() + Number(refreshed.expires_in) * 1000).toISOString();
  } else if (row.provider === "google_sheets") {
    refreshed = await refreshGoogleSheets(refreshToken);
    newAccess = refreshed.access_token as string;
    if (refreshed.expires_in) newExpires = new Date(Date.now() + Number(refreshed.expires_in) * 1000).toISOString();
  } else {
    // stripe/notion/slack don't expire — no refresh
    return { accessToken, row };
  }

  // Persist refreshed tokens (app-level encryption)
  const supa = getServiceClient();
  const payload: Record<string, unknown> = {
    access_token: await encryptToken(newAccess),
    expires_at: newExpires,
    updated_at: new Date().toISOString(),
    status: "connected",
  };
  if (newRefresh && newRefresh !== refreshToken) {
    payload.refresh_token = await encryptToken(newRefresh);
  }
  await supa.from("tenant_integrations").update(payload).eq("id", row.id);

  return { accessToken: newAccess, row: { ...row, access_token: payload.access_token as string, expires_at: newExpires as string } };
}
