import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/server";
import { hasPlatformAccess } from "@/lib/access-code";
import { getAgentBySlug } from "@/lib/agents";
import {
  addToCart,
  getEnrichedCart,
  removeFromCart,
  clearCart,
} from "@/lib/cart";

/**
 * GET /api/cart — carrello attivo dell'utente loggato.
 * POST /api/cart { agentSlug } — aggiunge agente al carrello.
 * DELETE /api/cart ?agentSlug=slug — rimuove singolo; senza query svuota tutto.
 */
export async function GET() {
  const user = await getSessionUser();
  const hasAccess = await hasPlatformAccess();
  if (!user && !hasAccess) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const userId = user?.id ?? "mock-admin";
  if (hasAccess && !user) {
    // Mock admin senza DB: carrello vuoto ma non errore
    return NextResponse.json({ items: [], totalCents: 0, cartId: null });
  }
  const { items, totalCents, cart } = await getEnrichedCart(userId);
  return NextResponse.json({ items, totalCents, cartId: cart?.id ?? null });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const agentSlug = body.agentSlug as string | undefined;
  if (!agentSlug) return NextResponse.json({ error: "agentSlug required" }, { status: 400 });
  const agent = getAgentBySlug(agentSlug);
  if (!agent) return NextResponse.json({ error: "agent not found" }, { status: 404 });
  try {
    await addToCart(user.id, agentSlug);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "already_owned") return NextResponse.json({ error: "already_owned" }, { status: 409 });
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  const { items, totalCents, cart } = await getEnrichedCart(user.id);
  return NextResponse.json({ items, totalCents, cartId: cart?.id ?? null });
}

export async function DELETE(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const agentSlug = url.searchParams.get("agentSlug");
  if (agentSlug) {
    await removeFromCart(user.id, agentSlug);
  } else {
    await clearCart(user.id);
  }
  const { items, totalCents, cart } = await getEnrichedCart(user.id);
  return NextResponse.json({ items, totalCents, cartId: cart?.id ?? null });
}
