import { createAdminClient } from "@/lib/supabase/admin";
import {
  encryptGoogleToken,
  decryptGoogleToken,
  type GoogleTokenEnvelope,
} from "./crypto";

/**
 * Accesso dati server-only per le connessioni Google per-utente.
 *
 * Come funziona: tutte le scritture usano il client service-role (bypassa le
 * policy RLS); la proprietà della riga è comunque garantita dallo `user_id`
 * che salviamo — lo stesso pattern di shopify_connections. Le connessioni dei
 * tenant senza account (admin/mock) usano l'id speciale TENANT_GOOGLE_ID.
 */

export const TENANT_GOOGLE_ID = "__tenant__";

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
 * Inserisce o aggiorna la connessione di un utente (una riga per utente,
 * user_id unico). Cripta entrambi i token a riposo. Chiamata solo dal
 * callback OAuth.
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

/**
 * Aggiorna solo l'access token + la scadenza di un utente (refresh del
 * token). Refresh token, scopes, email e connected_at restano invariati.
 */
export async function updateGoogleTokens(
  userId: string,
  accessToken: string,
  expiresAt: string,
): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;
  await admin
    .from("google_connections")
    .update({
      access_token: encryptGoogleToken(accessToken),
      expires_at: expiresAt,
    })
    .eq("user_id", userId);
}

/** Recupera + decripta la connessione Google di un utente. Null se assente. */
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

/** Cancella la connessione di un utente (disconnessione). */
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

/** Elenca la connessione Google di un utente (per la UI impostazioni). */
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