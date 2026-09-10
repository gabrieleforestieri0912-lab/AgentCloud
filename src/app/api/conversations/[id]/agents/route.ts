import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_AGENTS_PER_CONVERSATION = 5;

/**
 * GET /api/conversations/:id/agents
 *
 * List active agents in a conversation.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Verify user owns this conversation
  const { data: conv } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!conv) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const { data: agents, error } = await supabase
    .from("conversation_agents")
    .select("agent_slug, is_active_responder, added_at")
    .eq("conversation_id", id)
    .is("removed_at", null)
    .order("added_at", { ascending: true });

  if (error) {
    console.error("[ConvAgents] List error:", error);
    return NextResponse.json({ agents: [] });
  }

  return NextResponse.json({ agents: agents ?? [] });
}

/**
 * POST /api/conversations/:id/agents
 *
 * Add an agent to a conversation.
 * Body: { agent_slug: string, is_active_responder?: boolean }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const agentSlug = body?.agent_slug;

  if (!agentSlug || typeof agentSlug !== "string") {
    return NextResponse.json({ error: "agent_slug required" }, { status: 400 });
  }

  // Verify user owns this conversation
  const { data: conv } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!conv) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // Check current agent count
  const { data: existing } = await supabase
    .from("conversation_agents")
    .select("id")
    .eq("conversation_id", id)
    .is("removed_at", null);

  if (existing && existing.length >= MAX_AGENTS_PER_CONVERSATION) {
    return NextResponse.json(
      { error: "max_agents_reached", limit: MAX_AGENTS_PER_CONVERSATION },
      { status: 409 }
    );
  }

  // Check if agent already added
  const { data: duplicate } = await supabase
    .from("conversation_agents")
    .select("id, removed_at")
    .eq("conversation_id", id)
    .eq("agent_slug", agentSlug)
    .maybeSingle();

  if (duplicate && !duplicate.removed_at) {
    return NextResponse.json({ error: "agent_already_added" }, { status: 409 });
  }

  // If agent was previously soft-removed, reactivate it
  if (duplicate?.removed_at) {
    const { error } = await supabase
      .from("conversation_agents")
      .update({
        removed_at: null,
        is_active_responder: body?.is_active_responder ?? false,
        added_at: new Date().toISOString(),
      })
      .eq("id", duplicate.id);

    if (error) {
      console.error("[ConvAgents] Reactivate error:", error);
      return NextResponse.json({ error: "reactivate_failed" }, { status: 500 });
    }

    return NextResponse.json({ success: true, reactivated: true });
  }

  // Insert new agent
  const { error } = await supabase.from("conversation_agents").insert({
    conversation_id: id,
    agent_slug: agentSlug,
    tenant_id: user.id,
    is_active_responder: body?.is_active_responder ?? false,
  });

  if (error) {
    console.error("[ConvAgents] Add error:", error);
    return NextResponse.json({ error: "add_failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

/**
 * DELETE /api/conversations/:id/agents?agent_slug=...
 *
 * Soft-remove an agent from a conversation.
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const agentSlug = searchParams.get("agent_slug");

  if (!agentSlug) {
    return NextResponse.json({ error: "agent_slug required" }, { status: 400 });
  }

  // Verify user owns this conversation
  const { data: conv } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!conv) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // Soft-remove
  const { error } = await supabase
    .from("conversation_agents")
    .update({ removed_at: new Date().toISOString() })
    .eq("conversation_id", id)
    .eq("agent_slug", agentSlug)
    .is("removed_at", null);

  if (error) {
    console.error("[ConvAgents] Remove error:", error);
    return NextResponse.json({ error: "remove_failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
