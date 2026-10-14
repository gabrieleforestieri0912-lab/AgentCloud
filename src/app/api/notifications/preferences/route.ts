import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NOTIFICATION_CATEGORIES, type NotificationCategory } from "@/lib/notification-rules";

/**
 * GET /api/notifications/preferences — preferenze in-app per categoria.
 * Assente = abilitato: la risposta include tutte le categorie con il default.
 *
 * PUT /api/notifications/preferences { category, enabled } — crea/aggiorna la
 * preferenza. Solo le 7 categorie note; `channel` è sempre `in_app` (push ed
 * email arrivano in una fase successiva e riusano la stessa tabella).
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = createAdminClient();
  if (!db) return NextResponse.json({ error: "db_unavailable" }, { status: 503 });
  const { data } = await db
    .from("notification_preferences")
    .select("category, enabled")
    .eq("user_id", user.id)
    .eq("channel", "in_app");
  const disabled = new Set(
    ((data ?? []) as { category: string; enabled: boolean }[])
      .filter((r) => r.enabled === false)
      .map((r) => r.category),
  );
  return NextResponse.json({
    preferences: NOTIFICATION_CATEGORIES.map((category) => ({
      category,
      enabled: !disabled.has(category),
    })),
  });
}

export async function PUT(req: Request) {
  const user = await getSessionUser();
  if (!user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  let body: { category?: unknown; enabled?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const category = String(body.category ?? "") as NotificationCategory;
  if (!NOTIFICATION_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "unknown_category" }, { status: 400 });
  }
  const enabled = body.enabled !== false;
  const db = createAdminClient();
  if (!db) return NextResponse.json({ error: "db_unavailable" }, { status: 503 });
  const { error } = await db.from("notification_preferences").upsert(
    { user_id: user.id, category, channel: "in_app", enabled, updated_at: new Date().toISOString() },
    { onConflict: "user_id,category,channel" },
  );
  if (error) return NextResponse.json({ error: "store_failed" }, { status: 500 });
  return NextResponse.json({ ok: true, category, enabled });
}
