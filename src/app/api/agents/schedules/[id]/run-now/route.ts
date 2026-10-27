import { NextResponse } from "next/server";
import { getSessionUser, createClient } from "@/lib/supabase/server";
import { createBackgroundRun } from "@/lib/agents/background/enqueue";
import { rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/agents/schedules/[id]/run-now (Fase 3/7)
 *
 * Trigger manuale di uno schedule: crea un run collegato allo schedule (così
 * il Replay mantiene la tracciabilità) ma con trigger='manual' — è l'utente
 * che lo chiede, non il calendario. Uno schedule in pausa si può comunque
 * provare a mano (le istruzioni servono solo della riga ancora esistente).
 *
 * Il run parte subito (job scheduled_for = now()).
 *
 * Fase 7 (hardening): rate limite distribuito sui trigger manuali, 10/ora
 * e per utente — una tabella corrotta o un client che martella il bottone
 * non può inondare la coda (e i token) di run.
 */

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  ) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  const client = await createClient();
  if (!client) {
    return NextResponse.json({ error: "db_unavailable" }, { status: 500 });
  }

  // Fase 7: 10 trigger manuali per ora, fail-open (regola del modulo).
  const limit = await rateLimit("agents-run-now", user.id, {
    limit: 10,
    windowMs: 3_600_000,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "rate_limited", retryAfter: limit.retryAfterSeconds },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const { data: schedule, error } = await client
    .from("agent_schedules")
    .select("id, agent_slug, instructions, status")
    .eq("id", id)
    .eq("tenant_id", user.id)
    .maybeSingle();
  if (error || !schedule) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const created = await createBackgroundRun({
    tenantId: user.id,
    agentSlug: schedule.agent_slug,
    istruzioni: schedule.instructions,
    trigger: "manual",
    scheduleId: id,
  });
  if (!created.ok) {
    return NextResponse.json(
      { error: created.code, message: created.message },
      { status: created.code === "job_already_active" ? 409 : 500 },
    );
  }
  return NextResponse.json({ runId: created.runId }, { status: 201 });
}
