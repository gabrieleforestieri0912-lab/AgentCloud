import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/server";
import { listShopifyConnections } from "@/lib/shopify/connections";

/**
 * GET /api/shopify/status
 * Returns the current user's Shopify connection state for the chat UI, so it
 * can show the connect/create prompt only when the Shopify agent is active and
 * no store is linked. Unauthenticated callers get { authenticated: false }.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ authenticated: false, connected: false, shops: [] });
  }
  const shops = await listShopifyConnections(user.id).catch(() => []);
  return NextResponse.json({
    authenticated: true,
    connected: shops.some((s) => s.connected),
    shops: shops.filter((s) => s.connected).map((s) => s.shopDomain),
  });
}
