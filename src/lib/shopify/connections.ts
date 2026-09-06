import { createAdminClient } from "@/lib/supabase/admin";
import {
  encryptShopifyToken,
  decryptShopifyToken,
  type ShopifyTokenEnvelope,
} from "./crypto";

/**
 * Accesso dati server-only per le connessioni Shopify per-negozio.
 *
 * Come funziona: tutte le scritture usano il client service-role (bypassa le
 * policy RLS); la proprietà della riga è comunque garantita dallo `user_id`
 * che salviamo. Anche le letture per l'agente passano da qui.
 */

/**
 * Reserved user_id for the shared "tenant" Shopify connection. Used when a
 * visitor holding the platform access code (no Supabase account, no email
 * stored) connects a store: the row is stored under this id and exposed to
 * code-holder agent runs instead of per-user rows.
 */
export const TENANT_SHOPIFY_ID = "__tenant__";

export type ShopifyConnectionRow = {
  user_id: string;
  shop_domain: string;
  access_token: ShopifyTokenEnvelope;
  scope: string | null;
  installed_at: string | null;
  uninstalled_at: string | null;
};

/** Upsert a connection for a (user, shop). Encrypts the access token at rest. */
export async function upsertShopifyConnection(opts: {
  userId: string;
  shopDomain: string;
  accessToken: string;
  scope?: string;
}): Promise<void> {
  const admin = createAdminClient();
  if (!admin) {
    throw new Error("Supabase admin client unavailable (check service role key).");
  }
  const { error } = await admin
    .from("shopify_connections")
    .upsert(
      {
        user_id: opts.userId,
        shop_domain: opts.shopDomain,
        access_token: encryptShopifyToken(opts.accessToken),
        scope: opts.scope ?? null,
        installed_at: new Date().toISOString(),
        uninstalled_at: null,
      },
      { onConflict: "user_id,shop_domain" },
    );
  if (error) {
    throw new Error(`Failed to store Shopify connection: ${error.message}`);
  }
}

/** Mark a shop as uninstalled (webhook). Keeps the row for audit but invalidates it. */
export async function markShopifyUninstalled(shopDomain: string): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;
  await admin
    .from("shopify_connections")
    .update({ uninstalled_at: new Date().toISOString() })
    .eq("shop_domain", shopDomain);
}

/** Fetch + decrypt the access token for a (user, shop). Returns null if absent/revoked. */
export async function getShopifyToken(
  userId: string,
  shopDomain: string,
): Promise<string | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data, error } = await admin
    .from("shopify_connections")
    .select("access_token, uninstalled_at")
    .eq("user_id", userId)
    .eq("shop_domain", shopDomain)
    .maybeSingle();
  if (error || !data) return null;
  if (data.uninstalled_at) return null;
  return decryptShopifyToken(data.access_token as ShopifyTokenEnvelope);
}

/**
 * Resolve the active connection for a user (latest non-revoked shop).
 * Used by the agent tools (Phase 5) so they read the OAuth-stored, encrypted
 * token instead of the legacy in-memory tenant store. Returns null when the
 * user has no connected store.
 */
export async function getShopifyConnection(
  userId: string,
): Promise<{ shopDomain: string; accessToken: string } | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data, error } = await admin
    .from("shopify_connections")
    .select("shop_domain, access_token, uninstalled_at, installed_at")
    .eq("user_id", userId)
    .is("uninstalled_at", null)
    .order("installed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  const token = decryptShopifyToken(data.access_token as ShopifyTokenEnvelope);
  if (!token) return null;
  return { shopDomain: data.shop_domain, accessToken: token };
}

/** Revoke (mark uninstalled) a specific user+shop connection (e.g. on 401). */
export async function revokeShopifyConnection(
  userId: string,
  shopDomain: string,
): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;
  await admin
    .from("shopify_connections")
    .update({ uninstalled_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("shop_domain", shopDomain);
}

export type ShopifyConnectionSummary = {
  shopDomain: string;
  scope: string | null;
  connected: boolean;
  installedAt: string | null;
};

/** List a user's Shopify connections (for the dashboard UI). */
export async function listShopifyConnections(
  userId: string,
): Promise<ShopifyConnectionSummary[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const { data, error } = await admin
    .from("shopify_connections")
    .select("shop_domain, scope, installed_at, uninstalled_at")
    .eq("user_id", userId)
    .order("installed_at", { ascending: false });
  if (error || !data) return [];
  return (
    data as Array<{
      shop_domain: string;
      scope: string | null;
      installed_at: string | null;
      uninstalled_at: string | null;
    }>
  ).map((r) => ({
    shopDomain: r.shop_domain,
    scope: r.scope,
    connected: !r.uninstalled_at,
    installedAt: r.installed_at,
  }));
}
