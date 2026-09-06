/**
 * Server-only access-code control for AgentCloud.
 *
 * SECURITY MODEL
 * -------------
 * During the waitlist phase the platform is locked down. Entry is granted by
 * a single access code (NOT by email): whoever submits the valid code from
 * the waitlist page receives the `ac_access` cookie, set server-side in
 * POST /api/waitlist after the code is validated with `isValidAccessCode`
 * (src/lib/access-code-validation.ts — client-safe, pure comparison). The
 * proxy then lets cookie holders through the waitlist gate and treats every
 * agent — including those flagged "coming soon" — as fully available.
 *
 * The code itself lives in the `ACCESS_CODE` environment variable (server
 * secret, NOT `NEXT_PUBLIC_*`), falling back to a generated default so the
 * platform works out of the box. This module must only be imported from
 * server code: it reads `next/headers`, and importing it from a client
 * component would drag server-only code into the browser bundle.
 */

import { cookies } from "next/headers";
import { ACCESS_COOKIE } from "./waitlist-constants";

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
