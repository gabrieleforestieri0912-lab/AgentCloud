/**
 * Public-route matcher used by the proxy (src/proxy.ts).
 *
 * Pure module so route-protection logic can be unit tested.
 *
 * Note: `/api/agent/run` is reachable without a session so public agent pages
 * (`/a/[...]`, `/agent/[...]`) and embeds can run previews, but the route
 * handler itself resolves the caller from the Supabase session and enforces
 * subscription + usage limits for logged-in users.
 */
export const PUBLIC_PATHS = [
  // Marketing / public pages
  "/",
  "/demo",
  "/agents",
  "/a", // public agent chat pages
  "/agent", // public agent chat pages (same preview surface as /a)
  "/login",
  "/signup",
  "/reset-password",
  "/auth/callback", // Supabase PKCE / OAuth redirect target
  "/waitlist",
  "/contact",
  "/privacy",
  "/terms",
  // Webhooks (called by third parties)
  "/api/email/webhook",
  "/api/email/send",
  "/api/whatsapp/webhook",
  "/api/billing/webhook",
  // Admin API — authenticated via `Authorization: Bearer <ADMIN_API_TOKEN>`
  // inside the handler (no session required, the caller is a script/server).
  "/api/admin/tenants",
  // Public API endpoints
  "/api/billing/payment-link",
  "/api/embed",
  "/api/chat",
  "/api/agent/run",
  "/api/demo/request",
  "/api/waitlist",
  "/api/contact",
  "/api/sitemap",
];

// Strict prefix matching: a path is public when it equals a prefix or starts
// with "prefix/" (so "/contact" never leaks to "/contacts-admin"). "/"
// matches only itself.
export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((prefix) =>
    prefix === "/"
      ? pathname === "/"
      : pathname === prefix || pathname.startsWith(prefix + "/"),
  );
}
