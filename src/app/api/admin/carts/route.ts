import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAgentBySlug } from "@/lib/agents";

/**
 * GET /api/admin/carts — lista TUTTI i carrelli attivi (solo admin).
 * Restituisce per ogni carrello: user_id, email (da profiles/auth), status, items, totale.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const db = createAdminClient();
  if (!db) return NextResponse.json({ error: "db_unavailable" }, { status: 500 });

  const { data: carts } = await db
    .from("carts")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(100);

  if (!carts || carts.length === 0) {
    return NextResponse.json({ carts: [] });
  }

  const cartIds = carts.map((c: { id: string }) => c.id);
  const { data: items } = await db.from("cart_items").select("*").in("cart_id", cartIds);
  const itemsByCart = new Map<string, typeof items>();
  for (const it of (items ?? []) as Array<{ cart_id: string }>) {
    const arr = itemsByCart.get(it.cart_id) ?? [];
    arr.push(it);
    itemsByCart.set(it.cart_id, arr);
  }

  // Arricchisce con email utente
  const userIds = [...new Set(carts.map((c: { user_id: string }) => c.user_id))];
  const { data: profiles } = await db.from("profiles").select("id, email").in("id", userIds);
  const emailById = new Map<string, string>();
  for (const p of (profiles ?? []) as Array<{ id: string; email: string }>) {
    emailById.set(p.id, p.email);
  }
  // Fallback: prova auth.users via admin API se profile manca? Per ora usa id.
  const enriched = carts.map((cart: { id: string; user_id: string; status: string; created_at: string; updated_at: string }) => {
    const cartItems = (itemsByCart.get(cart.id) ?? []) as Array<{ agent_slug: string; quantity: number; added_at: string }>;
    const enrichedItems = cartItems.map((ci) => {
      const ag = getAgentBySlug(ci.agent_slug);
      return {
        agent_slug: ci.agent_slug,
        quantity: ci.quantity,
        added_at: ci.added_at,
        name: ag?.name ?? ci.agent_slug,
        priceCents: ag?.priceCents ?? 0,
        price: ag?.price ?? "",
      };
    });
    const totalCents = enrichedItems.reduce((s, it) => s + it.priceCents * it.quantity, 0);
    return {
      ...cart,
      email: emailById.get(cart.user_id) ?? cart.user_id,
      items: enrichedItems,
      totalCents,
      totalDisplay: `€${(totalCents / 100).toFixed(2).replace(".", ",")}`,
    };
  });

  return NextResponse.json({ carts: enriched });
}
