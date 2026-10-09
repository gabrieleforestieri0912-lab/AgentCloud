import { createAdminClient } from "@/lib/supabase/admin";
import { encryptToken } from "./encryption";
import type { TokenExchangeResult } from "./types";

/**
 * Upsert into tenant_integrations (service role, bypasses RLS).
 * Encrypts tokens at rest (app-level, see encryption.ts).
 */
export async function upsertTenantIntegration(opts: {
  tenantId: string;
  provider: string;
  tokens: TokenExchangeResult;
  status?: string;
}): Promise<void> {
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase admin unavailable");
  const payload: Record<string, unknown> = {
    tenant_id: opts.tenantId,
    provider: opts.provider,
    status: opts.status ?? "connected",
    access_token: opts.tokens.accessToken ? encryptToken(opts.tokens.accessToken) : null,
    refresh_token: opts.tokens.refreshToken ? encryptToken(opts.tokens.refreshToken) : null,
    expires_at: opts.tokens.expiresAt ?? null,
    scope: opts.tokens.scope ?? null,
    external_account_id: opts.tokens.externalAccountId ?? null,
    metadata: opts.tokens.metadata ?? {},
    updated_at: new Date().toISOString(),
  };
  const { error } = await admin
    .from("tenant_integrations")
    .upsert(payload as never, { onConflict: "tenant_id,provider" });
  if (error) throw new Error(`tenant_integrations upsert failed: ${error.message}`);
}

export async function markTenantIntegration(
  tenantId: string,
  provider: string,
  status: string,
): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;
  await admin.from("tenant_integrations").update({ status, updated_at: new Date().toISOString() }).eq("tenant_id", tenantId).eq("provider", provider);
}

/**
 * Riga della connessione limitata ai campi non sensibili.
 *
 * Serve a chi deve sapere solo SE la connessione c'è e in che stato è, senza
 * decriptare nulla: la callback di WooCommerce arriva dal server del negozio e
 * deve poter dire all'utente "approvato" o "non ancora arrivato" prima che le
 * credenziali siano disponibili. Per questo non restituisce `access_token` né
 * `refresh_token`: tenerli fuori da questa firma rende impossibile usarlo per
 * sbaglio in un punto dove verrebbero scritti in un log o in una risposta.
 */
export async function getIntegration(
  tenantId: string,
  provider: string,
): Promise<{ status: string | null; external_account_id: string | null } | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data, error } = await admin
    .from("tenant_integrations")
    .select("status, external_account_id")
    .eq("tenant_id", tenantId)
    .eq("provider", provider)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as { status?: string | null; external_account_id?: string | null };
  return { status: row.status ?? null, external_account_id: row.external_account_id ?? null };
}
