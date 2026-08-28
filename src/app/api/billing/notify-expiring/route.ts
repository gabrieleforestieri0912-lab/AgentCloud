import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyAllExpiringSubscriptions } from "@/lib/billing/subscription-notifications";
import { getLocale } from "@/lib/i18n/locale";

/**
 * POST /api/billing/notify-expiring
 *
 * Daily cron: emails every user with a subscription expiring within the warning
 * window (or set to cancel at period end). Idempotent per subscription via
 * `config.renewalNotifiedAt`, so re-runs never double-email.
 *
 * Auth: `Authorization: Bearer <ADMIN_API_TOKEN>` or `?token=<CRON_SECRET>`.
 */
export async function POST(request: Request) {
  const adminToken = process.env.ADMIN_API_TOKEN;
  const cronToken = process.env.CRON_SECRET;

  const authHeader = request.headers.get("authorization") || "";
  const url = new URL(request.url);
  const queryToken = url.searchParams.get("token");

  const authorized =
    (adminToken && authHeader === `Bearer ${adminToken}`) ||
    (cronToken && queryToken === cronToken);

  if (!authorized) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = createAdminClient();
  if (!db) {
    return NextResponse.json({ error: "database not configured" }, { status: 500 });
  }

  const locale = await getLocale();
  const notified = await notifyAllExpiringSubscriptions(db, locale);

  return NextResponse.json({ notified });
}
