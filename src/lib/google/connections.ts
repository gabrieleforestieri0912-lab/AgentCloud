import { createAdminClient } from "@/lib/supabase/admin";
import {
  encryptGoogleToken,
  decryptGoogleToken,
  type GoogleTokenEnvelope,
} from "./crypto";

/**
 * Server-only data access for per-user Google connections. All writes use the
 * service-role client (bypasses RLS); row ownership is still enforced by the
 * user_id we persist — the same pattern as shopify_connections.
 */

export type GoogleConnectionRow = {
  user_id: string;
  google_email: string | null;
  access_token: GoogleTokenEnvelope;
  refresh_token: GoogleTokenEnvelope;
  scopes: string[];
  expires_at: string | null;
  connected_at: string | null;
};

export type GoogleConnection = {
  googleEmail: string | null;
  accessToken: string;
  refreshToken: string;
  scopes: string[];
  expiresAt: string | null;
};

/**
 * Upsert the connection for a user (one row per user, unique user_id).
 * Encrypts both tokens at rest. Called by the OAuth callback only.
 */
export async function upsertGoogleConnection(opts: {
  userId: string;
  googleEmail: string | null;
  accessToken: string;
  refreshToken: string;
  scopes: string[];
  expiresAt: string | null;
}): Promise<void> {
  const admin = createAdminClient();
  if (!admin) {
    throw new Error("Supabase admin client unavailable (check service role key).");
  }
  const { error } = await admin
    .from("google_connections")
    .upsert(
      {
        user_id: opts.userId,
        google_email: opts.googleEmail,
        access_token: encryptGoogleToken(opts.accessToken),
        refresh_token: encryptGoogleToken(opts.refreshToken),
        scopes: opts.scopes,
        expires_at: opts.expiresAt,
        connected_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
  if (error) {
    throw new Error(`Failed to store Google connection: ${error.message}`);
  }
}

/** Fetch + decrypt a user's Google connection. Returns null when absent. */
export async function getGoogleConnection(
  userId: string,
): Promise<GoogleConnection | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data, error } = await admin
    .from("google_connections")
    .select(
      "google_email, access_token, refresh_token, scopes, expires_at",
    )
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  const accessToken = decryptGoogleToken(data.access_token as GoogleTokenEnvelope);
  const refreshToken = decryptGoogleToken(data.refresh_token as GoogleTokenEnvelope);
  if (!accessToken || !refreshToken) return null;
  return {
    googleEmail: data.google_email as string | null,
    accessToken,
    refreshToken,
    scopes: (data.scopes as string[]) ?? [],
    expiresAt: data.expires_at as string | null,
  };
}

/** Delete a user's connection (disconnect). */
export async function deleteGoogleConnection(userId: string): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;
  await admin.from("google_connections").delete().eq("user_id", userId);
}

export type GoogleConnectionSummary = {
  googleEmail: string | null;
  scopes: string[];
  connected: boolean;
  connectedAt: string | null;
};

/** List a user's Google connection (for the Phase 6 settings UI). */
export async function getGoogleConnectionSummary(
  userId: string,
): Promise<GoogleConnectionSummary | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data, error } = await admin
    .from("google_connections")
    .select("google_email, scopes, connected_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    googleEmail: data.google_email as string | null,
    scopes: (data.scopes as string[]) ?? [],
    connected: true,
    connectedAt: data.connected_at as string | null,
  };
}