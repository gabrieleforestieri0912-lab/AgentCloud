import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyAllExpiringSubscriptions } from "@/lib/billing/subscription-notifications";
import { getLocale } from "@/lib/i18n/locale";

/**
 * POST+GET /api/billing/notify-expiring
 *
 * Cron giornaliero (Vercel Cron): invia una email e una notifica in-app a
 * ogni utente con un abbonamento in scadenza entro la finestra di preavviso
 * (7 giorni) o impostato per la cancellazione a fine periodo. Idempotente per
 * abbonamento grazie a `config.renewalNotifiedAt`: le riesecuzioni non inviano
 * email doppie.
 *
 * Auth: Vercel Cron invia `Authorization: Bearer $CRON_SECRET` (e i cron
 * invocano con GET); per invocazioni manuali accettiamo anche POST con
 * `Bearer $ADMIN_API_TOKEN`. Il secret viaggia SOLO nell'header: il token in
 * query `?token=` è disabilitato (finirebbe nei log/proxy).
 */
function authorized(request: Request): boolean {
  const cronToken = process.env.CRON_SECRET;
  const adminToken = process.env.ADMIN_API_TOKEN;
  const authHeader = request.headers.get("authorization") || "";

  return (
    (cronToken !== undefined &&
      cronToken !== "" &&
      authHeader === `Bearer ${cronToken}`) ||
    (adminToken !== undefined &&
      adminToken !== "" &&
      authHeader === `Bearer ${adminToken}`)
  );
}

async function handle(request: Request) {
  if (!authorized(request)) {
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

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
