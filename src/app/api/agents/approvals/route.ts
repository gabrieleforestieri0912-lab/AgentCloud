import { NextResponse } from "next/server";
import { getSessionUser, createClient } from "@/lib/supabase/server";

/**
 * GET /api/agents/approvals (Fase 4)
 *
 * Le approvazioni del tenant: pending per prime (in evidenza), poi le ultime
 * decise. La route legge COL CLIENT UTENTE: la RLS di `agent_approvals`
 * vincola già a auth.uid()::text = tenant_id — il filtro esplicito è
 * ridondanza strutturale a difesa del codice.
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
    .from("agent_approvals")
    .select("*, runs_info:agent_runs(id, agent_slug, status, istruzioni, trigger)")
    .eq("tenant_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    return NextResponse.json({ error: "db_unavailable" }, { status: 500 });
  }
  const rows = data ?? [];
  return NextResponse.json(
    {
      pending: rows.filter((r) => r.stato === "pending"),
      decided: rows.filter((r) => r.stato !== "pending").slice(0, 30),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
