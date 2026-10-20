import { NextResponse } from "next/server";
import { consumeDeviceGrant, lookupByDeviceCode } from "@/lib/cli-auth";

/**
 * POST /api/cli/device/token — polling della CLI.
 *
 * Esito:
 * - 200: approvato → consegna token (consegna usa-e-getta: il grant muore).
 * - 202: pending → l'utente non ha ancora approvato.
 * - 410: scaduto → la CLI deve far ripartire il flusso.
 */
export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { device_code?: string };
  try {
    body = (await req.json()) as { device_code?: string };
  } catch {
    return NextResponse.json({ error: "Body JSON non valido." }, { status: 400 });
  }
  const grant = lookupByDeviceCode((body.device_code || "").trim());
  if (!grant) {
    return NextResponse.json(
      { error: "Device code non valido: rilancia il login." },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (grant.status === "expired") {
    return NextResponse.json(
      { error: "Login device scaduto: rilancia `agentcloud login --device`." },
      { status: 410, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (grant.status === "pending" || !grant.tokens) {
    return NextResponse.json(
      { status: "pending" },
      { status: 202, headers: { "Cache-Control": "no-store" } },
    );
  }
  // Approvato: consegna una sola volta, poi il grant muore.
  const tokens = consumeDeviceGrant(grant);
  if (!tokens) {
    return NextResponse.json({ status: "pending" }, { status: 202, headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json(tokens, { headers: { "Cache-Control": "no-store" } });
}
