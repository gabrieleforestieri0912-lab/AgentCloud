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
 * user_id riservato per la connessione Shopify "tenant" condivisa. Usato
 * quando un visitatore con il codice di accesso alla piattaforma (nessun
 * account Supabase, nessuna email salvata) collega un negozio: la riga è
 * salvata sotto questo id ed esposta alle run degli agenti dei possessori del
 * codice invece che alle righe per-utente.
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

/** Inserisce o aggiorna una connessione per (utente, negozio). Cripta l'access
 * token a riposo. */
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

/** Marca un negozio come disinstallato (webhook). Conserva la riga per l'audit
 * ma la invalida. */
export async function markShopifyUninstalled(shopDomain: string): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;
  await admin
    .from("shopify_connections")
    .update({ uninstalled_at: new Date().toISOString() })
    .eq("shop_domain", shopDomain);
}

/** Recupera + decripta l'access token per (utente, negozio). Null se assente
 * o revocato. */
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
 * Risolve la connessione attiva per un utente (negozio più recente non
 * revocato). Usata dai tool degli agenti così leggono il token OAuth criptato
 * invece dello store tenant legacy in memoria. Restituisce null quando
 * l'utente non ha negozi collegati.
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

/** Revoca (marca come disinstallata) una connessione utente+negozio (es. su 401). */
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

/** Elenca le connessioni Shopify di un utente (per la UI dashboard). */
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
