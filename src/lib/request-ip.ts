/**
 * Risolve l'IP del client da una Request, rispettando gli header del
 * reverse-proxy.
 *
 * Server-only (legge gli header della richiesta). Si fida del primo valore di
 * `x-forwarded-for`: è quello originale del client, aggiunto per primo dal
 * proxy di hosting (Vercel/nginx) prima di ogni hop successivo.
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip") || "unknown";
}
