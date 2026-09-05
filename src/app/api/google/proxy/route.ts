import { googleApiProxy } from "@/lib/google/api-proxy";
import { getSessionUser } from "@/lib/supabase/server";

/**
 * Phase 3 — HTTP surface of the Google API proxy.
 *
 * POST /api/google/proxy
 * Body: { action: "list_emails" | "get_calendar_events", params: {...} }
 *
 * Requires an authenticated session; the user id is resolved server-side and
 * never trusted from the body (same rule as /api/agent/run). All reads go
 * through the shared googleApiProxy module, which refreshes tokens
 * automatically. Agents call the same module directly with the user id from
 * their run context — this route exists for external/backend consumers.
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