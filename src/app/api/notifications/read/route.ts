import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/notifications/read
 *
 * Body: { ids?: string[] } — mark the given agent notifications as read, or
 * all of them when `ids` is omitted. Only the caller's own rows are touched.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let ids: string[] | undefined;
  try {
    const body = (await req.json()) as { ids?: unknown };
    if (Array.isArray(body.ids)) {
      ids = body.ids.filter((v): v is string => typeof v === "string");
    }
  } catch {
    // No/invalid body → mark all as read.
  }

  const db = createAdminClient();
  if (!db) {
    return NextResponse.json({ ok: false, updated: 0 }, { status: 503 });
  }

  let query = db
    .from("agent_notifications")
    .update({ read: true })
    .eq("user_id", user.id);
  if (ids && ids.length > 0) query = query.in("id", ids);

  const { error, count } = await query;
  if (error) {
    console.error("mark notifications read failed:", error);
    return NextResponse.json({ ok: false, updated: 0 }, { status: 500 });
  }

  return NextResponse.json({ ok: true, updated: count ?? 0 });
}
