import { NextResponse } from "next/server";
import { getSessionUser, createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PROMOTION_THRESHOLD } from "@/lib/agents/autonomy";

/**
 * GET/PATCH /api/agents/autonomy (Fase 4)
 *
 * Le righe `agent_autonomy` del tenant: livello per (agente, azione) e il
 * DEFAULT agente (azione null). PATCH cambia il livello — sempre l'utente,
 * mai il sistema: la promozione suggerita (D12) resta un SUGGERIMENTO di
 * cui l'utente decide; la retrocessione è possibile in ogni momento.
 */

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const client = await createClient();
  if (!client) {
    return NextResponse.json({ error: "db_unavailable" }, { status: 500 });
  }
  const { data, error } = await client
    .from("agent_autonomy")
    .select("*")
    .eq("tenant_id", user.id)
    .order("agent_slug");
  if (error) {
    return NextResponse.json({ error: "db_unavailable" }, { status: 500 });
  }
  return NextResponse.json(
    {
      rows: data ?? [],
      promotionThreshold: PROMOTION_THRESHOLD,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function PATCH(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const client = await createClient();
  if (!client) {
    return NextResponse.json({ error: "db_unavailable" }, { status: 500 });
  }
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "db_unavailable" }, { status: 500 });
  }

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object") throw new Error("empty");
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const agentSlug = typeof body.agentSlug === "string" ? body.agentSlug.trim() : "";
  // azione stringa → riga specifica; stringa vuota → default agente (null)
  const action = typeof body.action === "string" && body.action.trim() ? body.action.trim() : null;
  const level = typeof body.livello === "string" ? body.livello.toUpperCase() : "";

  if (!agentSlug || !["L0", "L1", "L2", "L3"].includes(level)) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  // Upsert col client admin (il client utente NON può INSERT su agent_autonomy:
  // le policy lo riservano al server, e l'upsert è esattamente questo caso).
  const { data: existing } = await admin!
    .from("agent_autonomy")
    .select("id")
    .eq("tenant_id", user.id)
    .eq("agent_slug", agentSlug)
    .eq("azione", action)
    .maybeSingle();

  if (existing) {
    const { error } = await admin!
      .from("agent_autonomy")
      .update({
        livello: level,
        // Livello change = decisione dell'utente; il contatore resta come
        // storia, il flag di suggerimento si spegne (una promozione o una
        // retrocessione esplicita chiude la conversazione D12).
        promozione_suggerita: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (error) return NextResponse.json({ error: "db_unavailable" }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const { error } = await admin!
    .from("agent_autonomy")
    .insert({
      tenant_id: user.id,
      agent_slug: agentSlug,
      azione: action,
      livello: level,
      approvazioni_consecutive_ok: 0,
      promozione_suggerita: false,
    });
  if (error) return NextResponse.json({ error: "db_unavailable" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
