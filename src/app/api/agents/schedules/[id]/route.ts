import { NextResponse } from "next/server";
import { getSessionUser, createClient } from "@/lib/supabase/server";
import { validateScheduleInput, nextRuns } from "@/lib/agents/cron";

/**
 * PATCH/DELETE /api/agents/schedules/[id] (Fase 3)
 *
 * Aggiornamento parziale (nome, istruzioni, cron, timezone, stato) o
 * eliminazione dello schedule del tenant. RLS garantisce la proprietà; qui
 * si validano i campi modificati e si ricalcola `next_run_at` quando cambia
 * cron o timezone (o al resume, se una pausa era intercorsa).
 *
 * Modificare lo schedule non tocca: i run già accodati conservano le
 * istruzioni copiate al momento dello spawn (Replay fedele).
 */

const NAME_MAX = 120;

type RouteContext = { params: Promise<{ id: string }> };

function parseId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  if (!parseId(id)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }
  const client = await createClient();
  if (!client) {
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

  const { data: current, error: fetchError } = await client
    .from("agent_schedules")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", user.id)
    .maybeSingle();
  if (fetchError) {
    return NextResponse.json({ error: "db_unavailable" }, { status: 500 });
  }
  if (!current) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const patch: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) {
    if (body.name.trim().length > NAME_MAX) {
      return NextResponse.json({ error: "name_invalid" }, { status: 400 });
    }
    patch.name = body.name.trim();
  }
  if (typeof body.instructions === "string" && body.instructions.trim()) {
    if (body.instructions.trim().length > 8_000) {
      return NextResponse.json({ error: "instructions_too_long" }, { status: 400 });
    }
    patch.instructions = body.instructions.trim();
  }
  if (typeof body.status === "string" &&
      (body.status === "active" || body.status === "paused")) {
    patch.status = body.status;
  }
  if (
    typeof body.cron === "string" ||
    (typeof body.timezone === "string" && body.timezone.trim())
  ) {
    const cron = typeof body.cron === "string" ? body.cron.trim() : current.cron;
    const timezone =
      typeof body.timezone === "string" && body.timezone.trim()
        ? body.timezone.trim()
        : current.timezone;
    const validation = validateScheduleInput(cron, timezone);
    if (!validation.ok) {
      return NextResponse.json(
        { error: validation.code, message: validation.message },
        { status: 400 },
      );
    }
    patch.cron = cron;
    patch.timezone = timezone;
  }

  // reschedule: cambia timing, cambia next_run_at (anche al resume).
  if (patch.cron || patch.timezone || patch.status === "active") {
    try {
      patch.next_run_at = nextRuns(patch.cron ?? current.cron, patch.timezone ?? current.timezone, 1)[0];
    } catch {
      return NextResponse.json({ error: "cron_invalid" }, { status: 400 });
    }
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "nothing_to_update" }, { status: 400 });
  }

  const { data, error } = await client
    .from("agent_schedules")
    .update(patch)
    .eq("id", id)
    .eq("tenant_id", user.id)
    .select("*")
    .single();
  if (error || !data) {
    return NextResponse.json({ error: "db_unavailable" }, { status: 500 });
  }
  return NextResponse.json({ schedule: data });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  if (!parseId(id)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }
  const client = await createClient();
  if (!client) {
    return NextResponse.json({ error: "db_unavailable" }, { status: 500 });
  }
  const { data, error } = await client
    .from("agent_schedules")
    .delete()
    .eq("id", id)
    .eq("tenant_id", user.id)
    .select("id");
  if (error) {
    return NextResponse.json({ error: "db_unavailable" }, { status: 500 });
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
