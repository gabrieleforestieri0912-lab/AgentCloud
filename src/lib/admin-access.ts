/**
 * Server-only admin access control for AgentCloud.
 *
 * SECURITY MODEL
 * -------------
 * Admin status is derived ONLY from the authenticated Supabase session email
 * (verified server-side via the session JWT). It is NEVER taken from the
 * request body, query string, cookies other than the auth session, or any
 * client-supplied value — doing so would let anyone self-grant admin by
 * simply POSTing a known email (e.g. to the public waitlist endpoint).
 *
 * The list of admin emails lives in the `ADMIN_EMAILS` environment variable
 * (comma-separated). It is a server secret (NOT `NEXT_PUBLIC_*`) so it is
 * never inlined into the client bundle. When unset it defaults to the
 * project owner's address.
 *
 * This module must only be imported from server code (route handlers, server
 * components, server actions). It uses `cookies()` indirectly via
 * `getSessionUser`, which is already server-only.
 */

import { getSessionUser } from "@/lib/supabase/server";

const DEFAULT_ADMIN_EMAIL = "gabriele.forestieri0912@gmail.com";

/**
 * Resolve the allowlisted admin emails (lowercased, trimmed, de-duplicated).
 * Falls back to the project owner when `ADMIN_EMAILS` is not configured.
 */
function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS;
  if (!raw) return [DEFAULT_ADMIN_EMAIL];
  return Array.from(
    new Set(
      raw
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
}

/**
 * Case- and whitespace-insensitive check against the allowlisted admin emails.
 * Returns false for missing/empty input — a null session can never be admin.
 */
export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return getAdminEmails().includes(normalized);
}

/**
 * Resolve admin status for the current request from the VERIFIED session.
 * `isAdmin` is true only when an authenticated user's session email matches
 * the allowlist. Safe to call only from server code.
 */
export async function getCurrentAdminStatus(): Promise<{
  isAdmin: boolean;
  email: string | null;
}> {
  const user = await getSessionUser();
  const email = user?.email ?? null;
  return { isAdmin: isAdminEmail(email), email };
}
