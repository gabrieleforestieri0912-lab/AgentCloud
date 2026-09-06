import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/server";
import { hasPlatformAccess } from "@/lib/access-code";
import {
  TENANT_SHOPIFY_ID,
  listShopifyConnections,
} from "@/lib/shopify/connections";

/**
 * GET /api/shopify/status
 * Returns the current caller's Shopify connection state for the chat UI, so it
 * can show the connect/create prompt only when the Shopify agent is active and
 * no store is linked.
 *
 * Access-code holders (no Supabase account) resolve against the shared tenant
 * connection — the store connected once from the admin side. Visitors with
 * neither a session nor the access code get { authenticated: false }.
 */
export async function GET() {
  const user = await getSessionUser();
  const hasCode = await hasPlatformAccess();
  if (!user && !hasCode) {
    return NextResponse.json({
      authenticated: false,
      connected: false,
      shops: [],
    });
  }
  // Code holders connect the shared tenant store (no email, no account);
  // signed-in users without the code read their own rows.
  const ownerId = hasCode ? TENANT_SHOPIFY_ID : user!.id;
  const shops = await listShopifyConnections(ownerId).catch(() => []);
  return NextResponse.json({
    authenticated: Boolean(user),
    connected: shops.some((s) => s.connected),
    shops: shops.filter((s) => s.connected).map((s) => s.shopDomain),
  });
}
