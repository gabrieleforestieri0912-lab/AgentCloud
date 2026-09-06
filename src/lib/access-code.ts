/**
 * Server-only access-code control for AgentCloud.
 *
 * SECURITY MODEL
 * -------------
 * During the waitlist phase the platform is locked down. Entry is granted by
 * a single access code (NOT by email): whoever submits the valid code from
 * the waitlist page receives the `ac_access` cookie, set server-side in
 * POST /api/waitlist after the code is validated HERE. The proxy then lets
 * cookie holders through the waitlist gate and treats every agent — including
 * those flagged "coming soon" — as fully available.
 *
 * The code itself lives in the `ACCESS_CODE` environment variable (server
 * secret, NOT `NEXT_PUBLIC_*`), falling back to a generated default so the
 * platform works out of the box. This module must only be imported from
 * server code: it reads `next/headers`, and importing it from a client
 * component would leak the code into the browser bundle.
 */

import { cookies } from "next/headers";
import { ACCESS_COOKIE } from "./waitlist-constants";

// Generated access code (replace via the ACCESS_CODE env var per environment).
const DEFAULT_ACCESS_CODE = "T5PMY2R2";

/** Normalize typed input: trim, strip separators, case-insensitive. */
function normalize(raw: string): string {
  return raw.trim().toUpperCase().replace(/[\s-]/g, "");
}

/** The expected code for this environment (env var wins over the default). */
function expectedCode(): string {
  return normalize(process.env.ACCESS_CODE ?? DEFAULT_ACCESS_CODE);
}

/**
 * Case- and separator-insensitive comparison against the configured code.
 * Returns false for missing/empty input.
 */
export function isValidAccessCode(raw: string): boolean {
  if (!raw) return false;
  const normalized = normalize(raw);
  if (!normalized) return false;
  const expected = expectedCode();
  // Constant-ish time compare to avoid trivial timing side channels.
  if (normalized.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < normalized.length; i++) {
    diff |= normalized.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Server-only: whether the current request already holds the access grant
 * (the `ac_access` cookie). Safe to call from server components and route
 * handlers; never from client code.
 */
export async function hasPlatformAccess(): Promise<boolean> {
  try {
    const store = await cookies();
    return store.get(ACCESS_COOKIE)?.value === "1";
  } catch {
    // cookies() is unavailable in some edge contexts — never fail rendering.
    return false;
  }
}
