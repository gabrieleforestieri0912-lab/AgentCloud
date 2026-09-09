import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/server";
import { TENANT_SHOPIFY_ID, listShopifyConnections } from "@/lib/shopify/connections";

/**
 * GET /api/shopify/status
 * Restituisce lo stato della connessione Shopify del chiamante per la UI chat,
 * così può mostrare il prompt di connessione/creazione solo quando l'agente
 * Shopify è attivo e nessun negozio è collegato.
 *
 * I possessori del codice (senza account Supabase) risolvono contro la
 * connessione tenant condivisa — il negozio collegato una volta lato admin.
 * I visitatori senza sessione né codice ricevono { authenticated: false }.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({
      authenticated: false,
      connected: false,
      shops: [],
    });
  }
  const shops = await listShopifyConnections(user.id).catch(() => []);
  return NextResponse.json({
    authenticated: true,
    connected: shops.some((s) => s.connected),
    shops: shops.filter((s) => s.connected).map((s) => s.shopDomain),
  });
}
