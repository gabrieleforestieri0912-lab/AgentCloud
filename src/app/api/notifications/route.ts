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
 * Returns the signed-in user's subscription notifications (expiring soon or
 * set to cancel at period end) for the in-app bell, and best-effort triggers
 * the one-time transactional email so delivery does not depend on cron infra.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = createAdminClient();
  if (!db) {
    return NextResponse.json({ notifications: [], count: 0 });
  }

  const { data } = await db
    .from("user_agents")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "active");

  const rows = (data ?? []) as UserAgentRow[];
  const notifications = computeNotifications(rows);

  // Best-effort: send the transactional email the first time we detect it.
  try {
    const locale = await getLocale();
    await notifyUserSubscriptions(db, user.id, locale);
  } catch (err) {
    console.error("notifyUserSubscriptions failed:", err);
  }

  return NextResponse.json({ notifications, count: notifications.length });
}
