/**
 * Resolve the client IP from a Request, honoring reverse-proxy headers.
 *
 * Server-only (reads request headers). Trusts the leftmost `x-forwarded-for`
 * value, which is the original client as appended by the hosting proxy.
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip") || "unknown";
}
