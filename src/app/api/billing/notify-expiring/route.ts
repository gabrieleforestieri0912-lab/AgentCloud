import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyAllExpiringSubscriptions } from "@/lib/billing/subscription-notifications";
import { getLocale } from "@/lib/i18n/locale";

/**
 * POST /api/billing/notify-expiring
 *
 * Cron giornaliero: invia una email a ogni utente con un abbonamento in
 * scadenza entro la finestra di preavviso (o impostato per la cancellazione a
 * fine periodo). Idempotente per abbonamento grazie a
 * `config.renewalNotifiedAt`, quindi le riesecuzioni non inviano email doppie.
 *
 * Auth: `Authorization: Bearer <ADMIN_API_TOKEN>` oppure `?token=<CRON_SECRET>`.
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
