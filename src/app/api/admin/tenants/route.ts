import { NextResponse } from "next/server";
import { registerTenant } from "@/lib/tenants";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // Basic auth via header token
    const auth = req.headers.get("authorization") || "";
    if (auth !== `Bearer ${process.env.ADMIN_API_TOKEN}`) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
      });
    }

    // Expect shape: { id, google: { calendarId, refreshToken }, shopify: { shopDomain, accessToken } }
    const { id, google, shopify } = body;
    if (!id)
      return new Response(JSON.stringify({ error: "missing id" }), {
        status: 400,
      });

    registerTenant({ id, google, shopify });
    await logAudit("tenant_registered", {
      id,
      hasGoogle: !!google,
      hasShopify: !!shopify,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    await logAudit("tenant_register_error", {
      error: e instanceof Error ? e.message : String(e),
    });
    return new Response(JSON.stringify({ error: "server_error" }), {
      status: 500,
    });
  }
}
