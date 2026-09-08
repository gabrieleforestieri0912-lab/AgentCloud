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
