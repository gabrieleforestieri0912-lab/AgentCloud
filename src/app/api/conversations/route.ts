import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/conversations
 *
 * List conversations for the authenticated user.
 * Query params:
 *   - archived: "true" | "false" (default: false)
 *   - limit: number (default: 50)
 */
export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const archived = searchParams.get("archived") === "true";
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

  const { data: conversations, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .eq("archived_at", archived ? null : false)
    .order("updated_at", { ascending: false })
    .limit(limit);

  // If archived_at column doesn't exist, fallback to simpler query
  let convs = conversations;
  if (error && error.message?.includes("archived_at")) {
    const fallback = await supabase
      .from("conversations")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(limit);
    convs = fallback.data;
  } else if (error) {
    console.error("[Conversations] List error:", error);
    convs = [];
  }

  // Get agent counts for each conversation
  const convIds = (convs ?? []).map((c) => c.id);
  let agentMap: Record<string, { agent_slug: string; is_active_responder: boolean }[]> = {};

  if (convIds.length > 0) {
    const { data: agents } = await supabase
      .from("conversation_agents")
      .select("conversation_id, agent_slug, is_active_responder")
      .in("conversation_id", convIds)
      .is("removed_at", null);

    if (agents) {
      for (const a of agents) {
        if (!agentMap[a.conversation_id]) agentMap[a.conversation_id] = [];
        agentMap[a.conversation_id].push(a);
      }
    }
  }

  const result = (convs ?? []).map((c) => ({
    ...c,
    agents: agentMap[c.id] ?? [],
  }));

  return NextResponse.json({ conversations: result });
}

/**
 * POST /api/conversations
 *
 * Create a new conversation.
 * Body: { title?: string }
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const title = body?.title || "Nuova conversazione";

  const { data: conv, error } = await supabase
    .from("conversations")
    .insert({
      user_id: user.id,
      title,
    })
    .select()
    .single();

  if (error) {
    console.error("[Conversations] Create error:", error);
    return NextResponse.json({ error: "create_failed" }, { status: 500 });
  }

  return NextResponse.json({ conversation: conv });
}
