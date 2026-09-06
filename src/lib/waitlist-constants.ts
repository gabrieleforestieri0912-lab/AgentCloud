// Client-safe waitlist constants. Kept separate from waitlist.ts (which pulls
// in server-only Supabase code) so the waitlist page — a client component —
// can import the cap without dragging server code into the client bundle.
// Total available waitlist spots (mirrors the DB-driven cap everywhere).
export const MAX_SPOTS = 20;

// Platform access cookie. It is set server-side ONLY when the visitor
// validates the access code (see src/lib/access-code.ts) and lets holders
// through the waitlist gate — replacing the old admin-email flow. The cookie
// name is shared here because it must be readable both server-side (proxy,
// route handlers, server components) and client-side (WaitlistForm, Navbar).
export const ACCESS_COOKIE = "ac_access";

/**
 * Client-only: whether the current browser holds the platform-access cookie.
 * Guarded so it can be imported by server code too (returns false there).
 * Never reveals the access code itself — only the presence of the grant.
 */
export function hasAccessOnClient(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split("; ")
    .some((entry) => entry === `${ACCESS_COOKIE}=1`);
}