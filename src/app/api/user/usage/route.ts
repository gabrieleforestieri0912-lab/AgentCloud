import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = createAdminClient();
  if (!db) return NextResponse.json({ plan: null, tokensUsed: 0, tokenLimit: null, runs: 0 });

  const periodStart = new Date();
  periodStart.setUTCDate(1);
  periodStart.setUTCHours(0, 0, 0, 0);
  const [{ data: runs }, { data: subscriptions }] = await Promise.all([
    db.from("agent_runs").select("input_tokens, output_tokens").eq("user_id", user.id).gte("started_at", periodStart.toISOString()),
    db.from("subscriptions").select("plan, status").eq("user_id", user.id).eq("status", "active").limit(1),
  ]);
  const rows = runs ?? [];
  const tokensUsed = rows.reduce((sum, row) => sum + (row.input_tokens || 0) + (row.output_tokens || 0), 0);
  const subscription = subscriptions?.[0] as { plan?: string | null } | undefined;
  return NextResponse.json({
    plan: subscription?.plan ?? (subscriptions?.length ? "active" : null),
    tokensUsed,
    tokenLimit: null,
    runs: rows.length,
  }, { headers: { "Cache-Control": "no-store" } });
}
