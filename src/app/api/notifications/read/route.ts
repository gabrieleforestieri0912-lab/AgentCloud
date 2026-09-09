import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/notifications/read
 *
 * Body: { ids?: string[] } — segna come lette le notifiche agente indicate,
 * oppure tutte quando `ids` è omesso. Vengono toccate solo le righe del
 * chiamante.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  const effectiveUserId = user?.id ?? null;
  if (!effectiveUserId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let ids: string[] | undefined;
  try {
    const body = (await req.json()) as { ids?: unknown };
    if (Array.isArray(body.ids)) {
      ids = body.ids.filter((v): v is string => typeof v === "string");
    }
  } catch {
    // Body assente/non valido → segna tutte come lette.
  }

  const db = createAdminClient();
  if (!db) {
    return NextResponse.json({ ok: false, updated: 0 }, { status: 503 });
  }

  let query = db
    .from("agent_notifications")
    .update({ read: true })
    .eq("user_id", effectiveUserId);
  if (ids && ids.length > 0) query = query.in("id", ids);

  const { error, count } = await query;
  if (error) {
    console.error("mark notifications read failed:", error);
    return NextResponse.json({ ok: false, updated: 0 }, { status: 500 });
  }

  return NextResponse.json({ ok: true, updated: count ?? 0 });
}
