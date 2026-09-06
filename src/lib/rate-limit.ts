/**
 * Rate limiting distribuito basato su Supabase.
 *
 * Perché distribuito: in ambiente serverless (Vercel) ogni richiesta può finire
 * su un'istanza diversa, quindi i contatori in memoria non basterebbero. I
 * contatori vivono nella tabella `rate_limits` (vedi supabase/schema.sql) e
 * vengono incrementati atomicamente via RPC `bump_rate_limit`: il limite vale
 * così su TUTTE le istanze contemporaneamente.
 *
 * Fail-OPEN: se il DB non è raggiungibile o la RPC va in errore la richiesta
 * viene comunque lasciata passare. Un guasto del rate limiting non deve mai
 * bloccare il traffico pagante; eventuali bucket in memoria intercettano
 * comunque i burst locali.
 *
 * Server-only — mai importare da componenti client.
 */

import { createAdminClient } from "@/lib/supabase/admin";

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

export const RATE_LIMIT_WINDOWS = {
  MINUTE_MS: 60_000,
  HOUR_MS: 3_600_000,
} as const;

/** Pura: inizio della finestra fissa (fixed window) in cui cade un timestamp. */
export function windowStart(nowMs: number, windowMs: number): number {
  return Math.floor(nowMs / windowMs) * windowMs;
}

async function cleanupExpiredWindows(): Promise<void> {
  try {
    const db = createAdminClient();
    if (!db) return;
    await db.rpc("cleanup_rate_limits", {
      p_older_than: new Date(Date.now() - 2 * 24 * 3_600_000).toISOString(),
    });
  } catch {
    // best effort — le righe stale sono innocue
  }
}

/**
 * Controlla (e consuma) un'unità del bucket di rate limiting.
 *
 * @param bucket namespace stabile, es. "contact-form"
 * @param key identificatore, es. l'IP del client o l'id utente
 * @param opts.limit massimo di richieste per finestra
 * @param opts.windowMs durata della finestra in ms
 */
export async function rateLimit(
  bucket: string,
  key: string,
  opts: { limit: number; windowMs: number },
): Promise<RateLimitResult> {
  const db = createAdminClient();
  if (!db) return { allowed: true, retryAfterSeconds: 0 };

  try {
    const now = Date.now();
    const start = new Date(windowStart(now, opts.windowMs)).toISOString();

    const { data, error } = await db.rpc("bump_rate_limit", {
      p_bucket: bucket,
      p_key: key,
      p_window_start: start,
    });

    if (error) {
      console.error(`rateLimit (${bucket}) rpc error:`, error);
      return { allowed: true, retryAfterSeconds: 0 };
    }

    const count = Number(data);
    if (count > opts.limit) {
      const secondsIntoWindow = Math.floor(
        (now - windowStart(now, opts.windowMs)) / 1000,
      );
      return {
        allowed: false,
        retryAfterSeconds: Math.max(
          1,
          Math.ceil(opts.windowMs / 1000) - secondsIntoWindow,
        ),
      };
    }

    // Mantiene la tabella piccola: ~1% delle chiamate innesca la pulizia
    // delle finestre scadute (campionamento casuale, costo quasi nullo).
    if (Math.random() < 0.01) void cleanupExpiredWindows();

    return { allowed: true, retryAfterSeconds: 0 };
  } catch (err) {
    console.error(`rateLimit (${bucket}) failed open:`, err);
    // Fail-open: un errore imprevisto non deve bloccare gli utenti legittimi.
    return { allowed: true, retryAfterSeconds: 0 };
  }
}
