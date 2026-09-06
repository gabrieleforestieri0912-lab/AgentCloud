import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/server";
import { hasPlatformAccess } from "@/lib/access-code";
import {
  TENANT_SHOPIFY_ID,
  listShopifyConnections,
} from "@/lib/shopify/connections";

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
  const hasCode = await hasPlatformAccess();
  if (!user && !hasCode) {
    return NextResponse.json({
      authenticated: false,
      connected: false,
      shops: [],
    });
  }
  // I possessori del codice collegano lo store tenant condiviso (nessuna
  // email, nessun account); gli utenti loggati senza codice leggono le proprie righe.
  const ownerId = hasCode ? TENANT_SHOPIFY_ID : user!.id;
  const shops = await listShopifyConnections(ownerId).catch(() => []);
  return NextResponse.json({
    authenticated: Boolean(user),
    connected: shops.some((s) => s.connected),
    shops: shops.filter((s) => s.connected).map((s) => s.shopDomain),
  });
}
