/**
 * Server-only PREVIEW MODE for AgentCloud.
 *
 * Lets the project owner browse the app (landing + gated pages) WITHOUT
 * authenticating, by submitting the admin email on the waitlist. It is a
 * read-only preview convenience for checking UI/deploy changes — it does NOT
 * grant any mutation, billing, or real-auth power.
 *
 * SECURITY MODEL
 * -------------
 * 1. Triggered ONLY when the submitted waitlist email matches the allowlisted
 *    admin email(s) from `ADMIN_EMAILS` (server-only).
 * 2. The waitlist route sets a SIGNED, httpOnly cookie (HMAC-SHA256 with
 *    `PREVIEW_MODE_SECRET`). The cookie is verified on every request; it
 *    cannot be forged without the secret.
 * 3. Preview mode only unlocks VIEW access to `/chat` and `/dashboard`. Every
 *    mutation path (checkout, billing, settings, agent deploy) still requires
 *    a real Supabase session via `getSessionUser()`, which this cookie does
 *    NOT satisfy. Agent execution on public pages already runs as anonymous.
 * 4. If `PREVIEW_MODE_SECRET` is unset, preview mode is DISABLED (fail closed):
 *    the admin email is simply not stored in the waitlist and no cookie is set.
 */

import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import type { User } from "@supabase/supabase-js";
import { isAdminEmail } from "@/lib/admin-access";

export const PREVIEW_COOKIE_NAME = "ac_preview_v1";
export const PREVIEW_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function getSecret(): string | undefined {
  const secret = process.env.PREVIEW_MODE_SECRET;
  return secret && secret.length > 0 ? secret : undefined;
}

function sign(payload: string): string {
  const secret = getSecret();
  if (!secret) return "";
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

/** Build a signed preview token for an admin email, or null if disabled. */
export function issuePreviewToken(email: string): string | null {
  const secret = getSecret();
  if (!secret) return null;
  if (!isAdminEmail(email)) return null;
  const emailN = email.trim().toLowerCase();
  const expiry = Date.now() + PREVIEW_MAX_AGE * 1000;
  const payload = `${emailN}.${expiry}`;
  return `${payload}.${sign(payload)}`;
}

function verifyToken(value: string | undefined): boolean {
  const secret = getSecret();
  if (!secret || !value) return false;
  const parts = value.split(".");
  if (parts.length !== 3) return false;
  const [emailN, expiryStr, sig] = parts;
  const expected = sign(`${emailN}.${expiryStr}`);
  if (!sig || !expected) return false;
  if (sig.length !== expected.length) return false;
  if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  if (!isAdminEmail(emailN)) return false;
  const expiry = Number(expiryStr);
  if (!Number.isFinite(expiry) || expiry < Date.now()) return false;
  return true;
}

export async function isPreviewMode(): Promise<boolean> {
  const store = await cookies();
  return verifyToken(store.get(PREVIEW_COOKIE_NAME)?.value);
}

/**
 * Returns a synthetic viewer when preview mode is active, else null. Used by
 * gated pages so they can render without a real Supabase session. It carries
 * no real credentials and cannot perform mutations.
 */
export async function getPreviewViewer(): Promise<User | null> {
  const store = await cookies();
  const value = store.get(PREVIEW_COOKIE_NAME)?.value;
  if (!verifyToken(value)) return null;
  const email = value!.split(".")[0];
  return {
    id: "preview",
    email,
    app_metadata: { provider: "preview" },
    user_metadata: {},
    aud: "authenticated",
    created_at: new Date(0).toISOString(),
  } as unknown as User;
}

/** Clear the preview cookie (e.g. on explicit logout). */
export async function clearPreviewCookie(): Promise<void> {
  const store = await cookies();
  store.delete(PREVIEW_COOKIE_NAME);
}
