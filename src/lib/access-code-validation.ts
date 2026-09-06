/**
 * Pure, client-safe access-code comparison helpers.
 *
 * Split out of access-code.ts — which reads `next/headers` for the platform
 * gate cookie — so shared modules like forms-security.ts (imported by client
 * components) can offer instant feedback on access-code input without
 * dragging server-only code into the browser bundle.
 *
 * SECURITY NOTE
 * -------------
 * The authoritative check always happens server-side (POST /api/waitlist,
 * after the code is compared HERE). ACCESS_CODE is a server secret, so when
 * this module ends up in a browser bundle `process.env.ACCESS_CODE` is
 * replaced with `undefined` and the comparison can only ever match the
 * generated default below. That is intentional: the comparison helpers are
 * a client-side convenience, and the real code never ships to the browser
 * when it is overridden per environment.
 */

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
