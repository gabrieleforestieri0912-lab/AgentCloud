import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  computeNotifications,
  notifyUserSubscriptions,
  type UserAgentRow,
} from "@/lib/billing/subscription-notifications";
import { getLocale } from "@/lib/i18n/locale";

/**
 * GET /api/notifications
 *
 * Restituisce le notifiche dell'utente loggato per la campanella in-app:
 *   - `notifications`: avvisi di abbonamento (in scadenza / in cancellazione),
 *   - `agentNotifications`: azioni importanti svolte dagli agenti dell'utente
 *     (file creato, prodotto pubblicato, evento prenotato, lead catturato, ...),
 *     dalla più recente, con `unreadCount` per il badge della campanella.
 * Best-effort: innesca anche l'email transazionale unica per gli abbonamenti
 * in scadenza, così la consegna non dipende dall'infrastruttura cron.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = createAdminClient();
  if (!db) {
    return NextResponse.json({
      notifications: [],
      count: 0,
      agentNotifications: [],
      unreadCount: 0,
    });
  }

  const [{ data }, { data: agentRows }] = await Promise.all([
    db
      .from("user_agents")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active"),
    db
      .from("agent_notifications")
      .select("id, agent_slug, kind, params, read, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const rows = (data ?? []) as UserAgentRow[];
  const notifications = computeNotifications(rows);

  const agentNotifications = (agentRows ?? []).map((r) => ({
    id: r.id,
    agentSlug: r.agent_slug,
    kind: r.kind,
    params: (r.params ?? {}) as Record<string, string>,
    read: Boolean(r.read),
    createdAt: r.created_at,
  }));

  // Best-effort: invia l'email transazionale la prima volta che viene rilevata
  // la scadenza.
  try {
    const locale = await getLocale();
    await notifyUserSubscriptions(db, user.id, locale);
  } catch (err) {
    console.error("notifyUserSubscriptions failed:", err);
  }

  return NextResponse.json({
    notifications,
    count: notifications.length,
    agentNotifications,
    unreadCount: agentNotifications.filter((n) => !n.read).length,
  });
}
