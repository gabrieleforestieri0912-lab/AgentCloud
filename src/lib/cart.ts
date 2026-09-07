/**
 * Helper server-only per il carrello.
 * Usa il client service-role (bypass RLS) — chiamare solo da route handler / server component.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { getAgentBySlug } from "@/lib/agents";

export type CartItemRow = {
  id: string;
  cart_id: string;
  agent_slug: string;
  quantity: number;
  added_at: string;
};

export type CartWithItems = {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  items: CartItemRow[];
};

export type EnrichedCartItem = CartItemRow & {
  name: string;
  shortName: string;
  priceCents: number;
  price: string;
  description: string;
  icon: string;
  brand?: string;
  accent: string;
};

export function enrichCartItem(row: CartItemRow): EnrichedCartItem | null {
  const agent = getAgentBySlug(row.agent_slug);
  if (!agent) return null;
  return {
    ...row,
    name: agent.name,
    shortName: agent.shortName,
    priceCents: agent.priceCents,
    price: agent.price,
    description: agent.description,
    icon: agent.icon,
    brand: agent.brand,
    accent: agent.accent,
  };
}

export function cartTotal(items: EnrichedCartItem[]): number {
  return items.reduce((sum, it) => sum + it.priceCents * it.quantity, 0);
}

/** Recupera o crea il carrello attivo per l'utente. */
export async function getOrCreateActiveCart(userId: string) {
  const db = createAdminClient();
  if (!db) throw new Error("Supabase admin not configured");
  const { data: existing } = await db
    .from("carts")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (existing) return existing as CartWithItems & { items?: CartItemRow[] };

  const { data: created, error } = await db
    .from("carts")
    .insert({ user_id: userId, status: "active" })
    .select("*")
    .single();
  if (error) throw error;
  return created as CartWithItems;
}

export async function getCartWithItems(userId: string): Promise<CartWithItems | null> {
  const db = createAdminClient();
  if (!db) return null;
  const { data: cart } = await db
    .from("carts")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (!cart) return null;
  const { data: items } = await db
    .from("cart_items")
    .select("*")
    .eq("cart_id", cart.id)
    .order("added_at", { ascending: true });
  return { ...cart, items: (items ?? []) as CartItemRow[] } as CartWithItems;
}

export async function addToCart(userId: string, agentSlug: string) {
  const agent = getAgentBySlug(agentSlug);
  if (!agent) throw new Error("Agent not found");
  const cart = await getOrCreateActiveCart(userId);
  const db = createAdminClient()!;
  // Already owned? check user_agents
  const { data: owned } = await db
    .from("user_agents")
    .select("id")
    .eq("user_id", userId)
    .eq("agent_slug", agentSlug)
    .eq("status", "active")
    .maybeSingle();
  if (owned) throw new Error("already_owned");

  const { data: existingItem } = await db
    .from("cart_items")
    .select("*")
    .eq("cart_id", cart.id)
    .eq("agent_slug", agentSlug)
    .maybeSingle();
  if (existingItem) {
    return existingItem as CartItemRow;
  }
  const { data: inserted, error } = await db
    .from("cart_items")
    .insert({ cart_id: cart.id, agent_slug: agentSlug, quantity: 1 })
    .select("*")
    .single();
  if (error) throw error;
  await db.from("carts").update({ updated_at: new Date().toISOString() }).eq("id", cart.id);
  return inserted as CartItemRow;
}

export async function removeFromCart(userId: string, agentSlug: string) {
  const cart = await getCartWithItems(userId);
  if (!cart) return;
  const db = createAdminClient()!;
  await db.from("cart_items").delete().eq("cart_id", cart.id).eq("agent_slug", agentSlug);
  await db.from("carts").update({ updated_at: new Date().toISOString() }).eq("id", cart.id);
}

export async function clearCart(userId: string) {
  const cart = await getCartWithItems(userId);
  if (!cart) return;
  const db = createAdminClient()!;
  await db.from("cart_items").delete().eq("cart_id", cart.id);
  await db.from("carts").update({ updated_at: new Date().toISOString() }).eq("id", cart.id);
}

export async function getEnrichedCart(userId: string) {
  const cart = await getCartWithItems(userId);
  if (!cart) return { cart: null as CartWithItems | null, items: [] as EnrichedCartItem[], totalCents: 0 };
  const enriched = cart.items.map(enrichCartItem).filter(Boolean) as EnrichedCartItem[];
  return { cart, items: enriched, totalCents: cartTotal(enriched) };
}
