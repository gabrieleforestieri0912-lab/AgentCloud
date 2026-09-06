import { googleApiProxy } from "@/lib/google/api-proxy";
import { getSessionUser } from "@/lib/supabase/server";

/**
 * Fase 3 — superficie HTTP del proxy API Google.
 *
 * POST /api/google/proxy
 * Body: { action: "list_emails" | "get_calendar_events", params: {...} }
 *
 * Richiede una sessione autenticata; lo user id è risolto lato server e non
 * viene mai preso dal body (stessa regola di /api/agent/run). Tutte le letture
 * passano dal modulo condiviso googleApiProxy, che rinnova i token in modo
 * automatico. Gli agenti chiamano lo stesso modulo direttamente con lo user id
 * del proprio contesto di run — questa route esiste per i consumatori
 * esterni/backend.
 */
export async function POST(req: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: { action?: unknown; params?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const { action, params } = body;
  if (
    action !== "list_emails" &&
    action !== "get_calendar_events"
  ) {
    return Response.json(
      { ok: false, error: `Unknown action: ${String(action)}` },
      { status: 400 },
    );
  }
  if (typeof params !== "object" || params === null) {
    return Response.json(
      { ok: false, error: "params must be an object" },
      { status: 400 },
    );
  }

  const result = await googleApiProxy(
    action,
    params as Record<string, string>,
    sessionUser.id,
  );
  if (!result.ok) {
    return Response.json(result, { status: 502 });
  }
  return Response.json(result);
}