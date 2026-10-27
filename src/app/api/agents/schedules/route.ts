import { NextResponse } from "next/server";
import { getSessionUser, createClient } from "@/lib/supabase/server";
import type { AgentScheduleRow } from "@/types/agents-db";
import {
  validateScheduleInput,
  nextRuns,
} from "@/lib/agents/cron";

/**
 * GET/POST /api/agents/schedules (Fase 3)
 *
 * GET — gli schedule del tenant, con l'anteprima delle prossime 5 esecuzioni
 *       (calcolata lato server: la UI non reimplementa il cron).
 * POST — creazione: validazione cron + timezone + frequenza minima (D8) e
 *        scheletro `next_run_at`; l'agente deve essere tra quelli attivi
 *        dell'utente (`user_agents`).
 *
 * Tutto con il client Utente (RLS attiva: le policy di `agent_schedules`
 * vincolano a auth.uid()::text = tenant_id).
 */

const NAME_MAX = 120;
const MAX_SCHEDULES_PER_USER = 50;

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const client = await createClient();
  if (!client) {
    return NextResponse.json({ error: "db_unavailable" }, { status: 500 });
  }

  const [{ data: schedules, error }, { data: owned }] = await Promise.all([
    client
      .from("agent_schedules")
      .select("*")
      .eq("tenant_id", user.id)
      .order("created_at", { ascending: false }),
    client
      .from("user_agents")
      .select("agent_slug, status")
      .eq("user_id", user.id)
      .eq("status", "active"),
  ]);
  if (error) {
    return NextResponse.json({ error: "db_unavailable" }, { status: 500 });
  }

  const rows = (schedules ?? []) as AgentScheduleRow[];
  const withPreview = rows.map((row) => {
    let upcoming: string[] = [];
    try {
      upcoming = nextRuns(row.cron, row.timezone, 5);
    } catch {
      upcoming = [];
    }
    return { ...row, upcoming };
  });

  return NextResponse.json(
    {
      schedules: withPreview,
      ownedAgents: (owned ?? []).map((a) => a.agent_slug),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
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

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const agentSlug = typeof body.agentSlug === "string" ? body.agentSlug.trim() : "";
  const instructions =
    typeof body.instructions === "string" ? body.instructions.trim() : "";
  const cron = typeof body.cron === "string" ? body.cron.trim() : "";
  const timezone = typeof body.timezone === "string" && body.timezone.trim()
    ? body.timezone.trim()
    : "Europe/Rome";

  if (!name || name.length > NAME_MAX) {
    return NextResponse.json({ error: "name_invalid" }, { status: 400 });
  }
  if (!instructions) {
    return NextResponse.json({ error: "instructions_required" }, { status: 400 });
  }
  if (instructions.length > 8_000) {
    return NextResponse.json({ error: "instructions_too_long" }, { status: 400 });
  }
  const validation = validateScheduleInput(cron, timezone);
  if (!validation.ok) {
    return NextResponse.json(
      { error: validation.code, message: validation.message },
      { status: 400 },
    );
  }

  // L'agente deve essere davvero dell'utente (RLS fa già metà del lavoro,
  // il filtro esplicito rende l'errore leggibile).
  const { data: owned, error: ownedError } = await client
    .from("user_agents")
    .select("agent_slug")
    .eq("user_id", user.id)
    .eq("agent_slug", agentSlug)
    .eq("status", "active")
    .maybeSingle();
  if (ownedError) {
    return NextResponse.json({ error: "db_unavailable" }, { status: 500 });
  }
  if (!owned) {
    return NextResponse.json({ error: "agent_not_owned" }, { status: 400 });
  }

  // Tetto di difesa: 50 schedule per utente (beta).
  const { count } = await client
    .from("agent_schedules")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", user.id);
  if ((count ?? 0) >= MAX_SCHEDULES_PER_USER) {
    return NextResponse.json({ error: "schedules_limit" }, { status: 429 });
  }

  let upcoming: string[];
  try {
    upcoming = nextRuns(cron, timezone, 1);
  } catch {
    return NextResponse.json({ error: "cron_invalid" }, { status: 400 });
  }

  const { data, error } = await client
    .from("agent_schedules")
    .insert({
      tenant_id: user.id,
      agent_slug: agentSlug,
      name,
      instructions,
      cron,
      timezone,
      status: "active",
      next_run_at: upcoming[0],
      created_by: user.id,
    })
    .select("*")
    .single();
  if (error) {
    return NextResponse.json({ error: "db_unavailable" }, { status: 500 });
  }
  return NextResponse.json({ schedule: data }, { status: 201 });
}
