import { NextResponse } from "next/server";
import { createDeviceGrant, lookupByDeviceCode } from "@/lib/cli-auth";

/**
 * POST /api/cli/device — avvia il device code flow (fallback SSH/headless).
 * Ritorna device_code + user_code da mostrare a schermo; l'utente visita
 * /device, inserisce il codice e approva; la CLI fa polling su
 * POST /api/cli/device/token finché l'approvazione arriva.
 */
export const runtime = "nodejs";

export async function POST() {
  const grant = createDeviceGrant();
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://www.agentcloud.agency";
  return NextResponse.json(
    {
      device_code: grant.deviceCode,
      user_code: grant.userCode,
      verify_url: `${base.replace(/\/$/, "")}/device`,
      interval: 5,
      expires_in: 600,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** GET (debug/ping): stato del grant, se noto. Sconnesso → 404. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const grant = lookupByDeviceCode(url.searchParams.get("device_code") || "");
  if (!grant) {
    return NextResponse.json({ status: "unknown" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json(
    { status: grant.status, expires_in: Math.max(0, Math.round((grant.expiresAt - Date.now()) / 1000)) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
