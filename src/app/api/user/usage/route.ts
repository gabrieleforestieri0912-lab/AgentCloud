import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTokenPoolsForUser } from "@/lib/billing/token-pool";

/**
 * GET /api/user/usage
 *
 * Consumo dell'utente, letto dai POOL DI TOKEN (uno per abbonamento).
 *
 * I pool sono la verità: un piano con 4 agenti è UN pool da 1M token
 * condiviso, non 4 pool da 250k. `tokensUsed`/`tokenLimit` qui sono i
 * totali di tutti i pool, così la UI ha un numero solo da mostrare.
 *
 * Nota: la tabella `subscriptions` non ha una colonna `plan` (il dato del
 * piano vive in `user_agents.config`), quindi il piano qui arriva dai pool.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = createAdminClient();
  if (!db) {
    return NextResponse.json(
      {
        plan: null,
        tokensUsed: 0,
        tokenLimit: null,
        runs: 0,
        periodEnd: null,
        pools: [],
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const pools = await getTokenPoolsForUser(user.id);

  // Run del mese corrente: statistica di attività (non di budget).
  const periodStart = new Date();
  periodStart.setUTCDate(1);
  periodStart.setUTCHours(0, 0, 0, 0);
  const { data: runs } = await db
    .from("agent_runs")
    .select("input_tokens, output_tokens")
    .eq("user_id", user.id)
    .gte("started_at", periodStart.toISOString());
  const rows = runs ?? [];

  const tokensUsed = pools.reduce((sum, p) => sum + p.used, 0);
  const tokenLimit = pools.length
    ? pools.reduce((sum, p) => sum + p.tokenLimit, 0)
    : null;

  // Il piano "di riferimento" è quello con il budget più grande: è quello
  // che l'utente ha comprato e che mostra il saldo.
  const primary = pools.slice().sort((a, b) => b.tokenLimit - a.tokenLimit)[0];

  return NextResponse.json(
    {
      plan: primary?.planId ?? null,
      tokensUsed,
      tokenLimit,
      runs: rows.length,
      periodEnd: primary?.periodEnd ?? null,
      pools: pools.map((p) => ({
        poolId: p.poolId,
        planId: p.planId,
        vertical: p.vertical,
        agents: p.agents,
        tokenLimit: p.tokenLimit,
        used: p.used,
        remaining: p.remaining,
        ratio: p.ratio,
        periodStart: p.periodStart,
        periodEnd: p.periodEnd,
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
