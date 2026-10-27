import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/server";
import { validateScheduleInput, nextRuns } from "@/lib/agents/cron";

/**
 * GET /api/agents/schedules/preview?cron=...&timezone=... (Fase 3)
 *
 * Anteprima delle prossime 5 occorrenze di una cron, calcolata lato server:
 * la UI non porta in bundle un parser cron (e non può divergere dalla
 * risoluzione usata dallo scheduler).
 */
export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const cron = url.searchParams.get("cron") ?? "";
  const timezone = url.searchParams.get("timezone") ?? "Europe/Rome";
  const validation = validateScheduleInput(cron, timezone);
  if (!validation.ok) {
    return NextResponse.json(
      { error: validation.code, message: validation.message },
      { status: 400 },
    );
  }
  try {
    return NextResponse.json(
      { upcoming: nextRuns(cron, timezone, 5) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "cron_invalid" }, { status: 400 });
  }
}
