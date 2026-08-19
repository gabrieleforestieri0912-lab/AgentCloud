/**
 * Single source of truth for the public site URL.
 *
 * Historically the codebase mixed `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_URL`
 * with different fallbacks (localhost vs agentcloud.io), which silently broke
 * WhatsApp forwarding, canonical URLs and embeds in production. Use
 * `getSiteUrl()` everywhere instead.
 *
 * Resolution order: NEXT_PUBLIC_SITE_URL → NEXT_PUBLIC_URL → localhost.
 *
 * Client-safe: only reads NEXT_PUBLIC_* vars (inlined at build time), never
 * server-only modules.
 */
export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_URL;
  if (!fromEnv) {
    if (process.env.NODE_ENV === "production") {
      // Loud signal: robots/sitemap/canonical/embeds would silently point to
      // localhost. This must be set in production.
      console.error(
        "[getSiteUrl] NEXT_PUBLIC_SITE_URL is not set — falling back to http://localhost:3000. Set it in production.",
      );
    }
    return "http://localhost:3000";
  }
  return fromEnv.replace(/\/+$/, "");
}
