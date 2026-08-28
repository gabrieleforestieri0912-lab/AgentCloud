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
import type { User } from "@supabase/supabase-js";
import {
  PREVIEW_COOKIE_NAME,
  PREVIEW_MAX_AGE,
  issuePreviewToken,
  verifyPreviewToken,
} from "@/lib/preview-token";

export { PREVIEW_COOKIE_NAME, PREVIEW_MAX_AGE, issuePreviewToken, verifyPreviewToken };

export async function isPreviewMode(): Promise<boolean> {
  const store = await cookies();
  return verifyPreviewToken(store.get(PREVIEW_COOKIE_NAME)?.value);
}

/**
 * Returns a synthetic viewer when preview mode is active, else null. Used by
 * gated pages so they can render without a real Supabase session. It carries
 * no real credentials and cannot perform mutations.
 */
export async function getPreviewViewer(): Promise<User | null> {
  const store = await cookies();
  const value = store.get(PREVIEW_COOKIE_NAME)?.value;
  if (!(await verifyPreviewToken(value))) return null;
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
