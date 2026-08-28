import { createAdminClient } from "@/lib/supabase/admin";
import {
  encryptShopifyToken,
  decryptShopifyToken,
  type ShopifyTokenEnvelope,
} from "./crypto";

/**
 * Server-only data access for per-shop Shopify connections. All writes use the
 * service-role client (bypasses RLS); row ownership is still enforced by the
 * user_id we persist. Reads for the agent (Phase 5) also go through here.
 */

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
