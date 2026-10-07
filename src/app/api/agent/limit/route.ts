import { NextResponse } from "next/server";
import { AGENT_RUNTIME } from "@/lib/agents/registry";
import { assertRunAllowed } from "@/lib/billing/usage-tracking";
import {
  FREE_MESSAGES_PER_AGENT,
  getFreeMessagesUsed,
  getNextResetAt,
} from "@/lib/billing/free-limit";
import { getClientIp } from "@/lib/request-ip";
import { getSessionUser } from "@/lib/supabase/server";
import { resolveIsAdmin } from "@/lib/admin-access";

/**
 * GET /api/agent/limit?agent=<slug>
 *
 * Ritorna il budget giornaliero freemium per (utente, agente): 5 messaggi al
 * giorno con reset alla mezzanotte UTC. La UI lo mostra sopra l'input della
 * chat insieme all'ora locale del reset.
 *
 * Risponde { unlimited: true } per abbonati attivi, admin e beta (nessun
 * limite). Per gli altri: { unlimited: false, used, remaining, limit,
 * resetAt } con resetAt in ISO (mezzanotte UTC successiva).
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const agentId = searchParams.get("agent") ?? "";

  if (!agentId || !AGENT_RUNTIME[agentId]) {
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

  if (!isAdmin && !isBeta && userId !== "anonymous") {
    const check = await assertRunAllowed(userId, agentId, "en", isAdmin);
    if (check.allowed) {
      return NextResponse.json(
        { unlimited: true },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
  } else if (isAdmin || isBeta) {
    return NextResponse.json(
      { unlimited: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const ip = getClientIp(req);
  const used = await getFreeMessagesUsed(userId, agentId, ip ?? undefined);
  return NextResponse.json(
    {
      unlimited: false,
      used,
      remaining: Math.max(0, FREE_MESSAGES_PER_AGENT - used),
      limit: FREE_MESSAGES_PER_AGENT,
      resetAt: getNextResetAt().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
