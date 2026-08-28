/**
 * Server + Edge safe preview-token primitives for AgentCloud.
 *
 * Split out of `preview.ts` so the middleware can verify the preview cookie
 * WITHOUT importing `next/headers` (which is unavailable in the Edge runtime).
 * Uses the Web Crypto API (`crypto.subtle`) so the exact same code runs in
 * both the Node route handlers and the Next.js middleware (Edge) runtime.
 *
 * SECURITY MODEL
 * -------------
 * - The token is `email.expiry.hmac`, where `hmac` is HMAC-SHA256 of
 *   `email.expiry` keyed by `PREVIEW_MODE_SECRET`, base64url-encoded.
 * - It can only be forged with `PREVIEW_MODE_SECRET`, which is server-only.
 * - If `PREVIEW_MODE_SECRET` is unset, every token is rejected (fail closed).
 */

export const PREVIEW_COOKIE_NAME = "ac_preview_v1";
export const PREVIEW_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

const DEFAULT_ADMIN_EMAIL = "gabriele.forestieri0912@gmail.com";

// Self-contained admin-email check (deliberately does NOT import admin-access,
// which would drag in Supabase server code and break the Edge middleware).
function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  const raw = process.env.ADMIN_EMAILS;
  const list = raw
    ? Array.from(
        new Set(
          raw
            .split(",")
            .map((e) => e.trim().toLowerCase())
            .filter(Boolean),
        ),
      )
    : [DEFAULT_ADMIN_EMAIL];
  return list.includes(normalized);
}

function getSecret(): string | undefined {
  const secret = process.env.PREVIEW_MODE_SECRET;
  return secret && secret.length > 0 ? secret : undefined;
}

function b64url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function hmac(payload: string): Promise<string> {
  const secret = getSecret();
  if (!secret) return "";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );
  return b64url(new Uint8Array(sig));
}

/** Build a signed preview token for an admin email, or null if disabled. */
export async function issuePreviewToken(email: string): Promise<string | null> {
  const secret = getSecret();
  if (!secret) return null;
  if (!isAdminEmail(email)) return null;
  const emailN = email.trim().toLowerCase();
  const expiry = Date.now() + PREVIEW_MAX_AGE * 1000;
  const payload = `${emailN}.${expiry}`;
  const sig = await hmac(payload);
  if (!sig) return null;
  return `${payload}.${sig}`;
}

/** Verify a preview token value (constant-time-ish compare). */
export async function verifyPreviewToken(
  value: string | undefined,
): Promise<boolean> {
  const secret = getSecret();
  if (!secret || !value) return false;
  const parts = value.split(".");
  if (parts.length !== 3) return false;
  const [emailN, expiryStr, sig] = parts;
  const expected = await hmac(`${emailN}.${expiryStr}`);
  if (!sig || !expected) return false;
  if (sig.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) {
    diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  if (diff !== 0) return false;
  if (!isAdminEmail(emailN)) return false;
  const expiry = Number(expiryStr);
  if (!Number.isFinite(expiry) || expiry < Date.now()) return false;
  return true;
}
