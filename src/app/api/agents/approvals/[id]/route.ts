import { NextResponse } from "next/server";
import { getSessionUser, createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requeueExistingRun } from "@/lib/agents/background/enqueue";

/**
 * PATCH /api/agents/approvals/[id] (Fase 4)
 *
 * La decisione dell'utente su UNA approvazione pending:
 *   • approved → il tool parte com'era proposto;
 *   • edited → parte con l'input corretto dall'utente (modificata=true:
 *              il contatore D12 di approvazioni consecutive si azzera);
 *   • rejected → il run si chiude failed con errore leggibile.
 *
 * Il payload dell'azione non può trasportare segreti: i token non viaggiano
 * nel DB né nella richiesta (vengono letti a run-time sul server).
 */

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }
  const userClient = await createClient();
  if (!userClient) {
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
  const decision = body.decision;
  if (decision !== "approved" && decision !== "rejected" && decision !== "edited") {
    return NextResponse.json({ error: "invalid_decision" }, { status: 400 });
  }
  if (decision === "edited") {
    const action = body.action as { input?: unknown } | undefined;
    if (!action || typeof action !== "object" || typeof action.input !== "object" || action.input === null) {
      return NextResponse.json({ error: "edited_input_required" }, { status: 400 });
    }
  }

  // La riga va presa e aggiornata dal client utente: RLS garantisce che sia
  // del tenant e che sia ANCORA pending (chi rifiuta due volte perde).
  const { data: current, error: fetchError } = await userClient
    .from("agent_approvals")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", user.id)
    .eq("stato", "pending")
    .maybeSingle();
  if (fetchError) {
    return NextResponse.json({ error: "db_unavailable" }, { status: 500 });
  }
  if (!current) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const editedAction =
    decision === "edited"
      ? {
          ...(typeof current.azione === "object" ? current.azione : {}),
          tool: (body.action as { tool?: string })?.tool ?? current.azione.tool,
          input: (body.action as { input?: Record<string, unknown> }).input,
        }
      : current.azione;

  const { error: patchError } = await userClient
    .from("agent_approvals")
    .update({
      stato: decision,
      azione: editedAction,
      decisa_da: user.id,
      decisa_il: new Date().toISOString(),
      modificata: decision === "edited",
    })
    .eq("id", id);
  if (patchError) {
    return NextResponse.json({ error: "db_unavailable" }, { status: 500 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "db_unavailable" }, { status: 500 });
  }

  if (decision === "rejected") {
    // Il run si chiude con un errore PARLATO: il Replay mostra cosa è stato
    // proposto (la riga pending resta come storia) e cosa è stato rifiutato.
    const runId = current.run_id;
    await admin
      .from("agent_runs")
      .update({
        status: "failed",
        errore: "approvazione_rifiutata: l'utente ha rifiutato l'azione proposta",
        finished_at: new Date().toISOString(),
      })
      .eq("id", runId)
      .eq("status", "waiting_approval")
      .select("id");
    return NextResponse.json({ ok: true });
  }

  // approved / edited: il run torna `queued` con un job nuovo (il worker lo
  // prenderà e consumera l'approvazione per eseguire il tool).
  const runId = current.run_id;
  const { error: requeueError } = await admin
    .from("agent_runs")
    .update({ status: "queued", errore: null })
    .eq("id", runId)
    .in("status", ["waiting_approval", "queued", "running"]);
  if (requeueError) {
    return NextResponse.json({ error: "db_unavailable" }, { status: 500 });
  }
  const requeued = await requeueExistingRun(runId, user.id);
  if (!requeued.ok) {
    return NextResponse.json(
      { error: requeued.code, message: requeued.message },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, runId });
}
