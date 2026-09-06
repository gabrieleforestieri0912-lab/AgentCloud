/**
 * Validate a `next` redirect target coming from a URL query parameter.
 *
 * Only same-origin relative paths are allowed, so an attacker cannot turn the
 * post-auth redirect into an open redirect. Rejects absolute URLs
 * (https://...), protocol-relative URLs (//...), backslash tricks (/\\...)
 * and path traversal (..).
 */
export function isSafeRedirectPath(next: string | null): boolean {
  if (!next) return false;
  if (!next.startsWith("/")) return false;
  if (next.startsWith("//")) return false;
  if (next.includes("\\")) return false;
  // Reject traversal segments like /../ or /../
  if (next.split("/").includes("..")) return false;
  return true;
}
