/**
 * Distributed rate limiting backed by Supabase.
 *
 * Counters live in the `rate_limits` table (see supabase/schema.sql) and are
 * incremented atomically through the `bump_rate_limit` RPC, so limits hold
 * across all server instances (serverless included) — unlike the in-memory
 * per-instance buckets.
 *
 * Fails OPEN: if the DB is unreachable or the RPC errors, the request is
 * allowed. A rate-limit outage must never block paying traffic; the in-memory
 * fast path (where present) still catches bursts locally.
 *
 * Server-only — never import from client components.
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

/** Pure: start of the fixed window a timestamp falls into. */
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
    // best effort — stale rows are harmless
  }
}

/**
 * Check (and consume) one unit of a rate limit bucket.
 *
 * @param bucket stable namespace, e.g. "contact-form"
 * @param key identifier, e.g. the client IP or user id
 * @param opts.limit max requests per window
 * @param opts.windowMs window length in ms
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

    // Keep the table small: ~1% of calls trigger a cleanup of stale windows.
    if (Math.random() < 0.01) void cleanupExpiredWindows();

    return { allowed: true, retryAfterSeconds: 0 };
  } catch (err) {
    console.error(`rateLimit (${bucket}) failed open:`, err);
    return { allowed: true, retryAfterSeconds: 0 };
  }
}
