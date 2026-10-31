import { NextResponse } from "next/server";
import { AGENT_RUNTIME } from "@/lib/agents/registry";
import { assertRunAllowed } from "@/lib/billing/usage-tracking";
import { getTokenPoolForAgent, getTokenPoolsForUser, poolWarningLevel } from "@/lib/billing/token-pool";
import { getNextResetAt } from "@/lib/billing/free-limit";
import { checkFreeUsage } from "@/lib/billing/free-usage";
import { REFERRAL_MESSAGES_PER_REFERRAL } from "@/lib/billing/referral-bonus";
import { getClientIp } from "@/lib/request-ip";
import { getSessionUser } from "@/lib/supabase/server";
import { resolveIsAdmin } from "@/lib/admin-access";

/**
 * GET /api/agent/limit?agent=<slug>
 *
 * Due limiti distinti, e la UI li deve mostrare insieme:
 *
 *  1. il LIMITE GIORNALIERO dei 5 messaggi, che vale solo per chi non ha
 *     abbonamento (admin e beta bypassano);
 *  2. il POOL DI TOKEN del piano, che vale per chi è abbonato: budget
 *     condiviso fra gli agenti del piano, misurato nel periodo di
 *     abbonamento.
 *
 * Risposte:
 *   - abbonato:   { unlimited: true, pool: {...}, exhausted: boolean }
 *     (`unlimited` = nessun limite di messaggi; il vincolo è il budget)
 *   - abbonato con budget finito: { unlimited: true, pool, exhausted: true, code }
 *   - non abbonato: { unlimited: false, used, remaining, limit, resetAt }
 *   - admin/beta:  { unlimited: true }
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const agentId = searchParams.get("agent") ?? "";

  // L'agente è opzionale: senza agent si risponde con il pool principale
  // dell'utente (quello del piano più grande), così la chat mostra il budget
  // anche quando l'utente non ha ancora scelto un agente.
  if (agentId && !AGENT_RUNTIME[agentId]) {
    return NextResponse.json({ error: "unknown agent" }, { status: 400 });
  }

  const sessionUser = await getSessionUser();
  const userId = sessionUser?.id ?? "anonymous";
  const isAdmin = await resolveIsAdmin(sessionUser);

  let isBeta = false;
  if (process.env.ENABLE_WAITLIST_BETA_BYPASS === "true" && sessionUser) {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    if (admin) {
      const { data: profile } = await admin
        .from("profiles")
        .select("role")
        .eq("id", sessionUser.id)
        .maybeSingle();
      isBeta = profile?.role === "beta_tester" || profile?.role === "internal_qa";
    }
  }

  if (isAdmin || isBeta) {
    return NextResponse.json(
      { unlimited: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  // Abbonato: il vincolo è il budget, non il numero di messaggi.
  // Pool dell'agente se ce n'è uno; altrimenti il pool principale.
  let pool = agentId ? await getTokenPoolForAgent(userId, agentId) : null;
  if (!pool) {
    const pools = await getTokenPoolsForUser(userId);
    pool =
      pools.slice().sort((a, b) => b.tokenLimit - a.tokenLimit)[0] ?? null;
  }
  if (pool) {
    const check = await assertRunAllowed(userId, agentId || pool.agents[0], "en", isAdmin);
    return NextResponse.json(
      {
        unlimited: true,
        exhausted: !check.allowed,
        code: check.allowed ? null : check.code,
        pool: {
          planId: pool.planId,
          vertical: pool.vertical,
          agents: pool.agents,
          tokenLimit: pool.tokenLimit,
          used: pool.used,
          remaining: pool.remaining,
          ratio: pool.ratio,
          periodStart: pool.periodStart,
          periodEnd: pool.periodEnd,
          level: poolWarningLevel(pool.ratio),
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  // Non abbonato: limite giornaliero, oggi 5 + eventuali crediti maturati con
  // gli inviti (pool una tantum, vedi lib/billing/referral-bonus.ts). Si passa
  // da checkFreeUsage perché è lo STESSO calcolo che decide l'402 sulle run:
  // numero mostrato e numero enforced non possono discostarsi.
  const ip = getClientIp(req);
  const usage = await checkFreeUsage(userId, { ip: ip ?? undefined });
  return NextResponse.json(
    {
      unlimited: false,
      used: usage.used,
      remaining: usage.remaining,
      limit: usage.limit,
      resetAt: getNextResetAt().toISOString(),
      // Bonus e codice invito servono al banner paywall della chat: senza
      // inviti validi (o per gli ospiti) sono a zero/null e il banner non
      // mostra nulla di diverso da prima.
      bonus: {
        available: usage.bonus.available,
        earned: usage.bonus.earned,
        spent: usage.bonus.spent,
        referrals: usage.bonus.referrals,
        perReferral: REFERRAL_MESSAGES_PER_REFERRAL,
      },
      inviteCode: usage.bonus.code,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
