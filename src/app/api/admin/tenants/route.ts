import { NextResponse } from "next/server";
import { listTenants, registerTenant } from "@/lib/tenants";
import { logAudit } from "@/lib/audit";

function isAdmin(req: Request) {
  const token = process.env.ADMIN_API_TOKEN;
  return Boolean(token && req.headers.get("authorization") === `Bearer ${token}`);
}

export async function GET(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ tenants: listTenants() }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  try {
    if (!isAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const body = await req.json();
    const { id, google, shopify } = body;
    if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });
    registerTenant({ id, google, shopify });
    await logAudit("tenant_registered", { id, hasGoogle: !!google, hasShopify: !!shopify });
    return NextResponse.json({ ok: true });
  } catch (error) {
    await logAudit("tenant_register_error", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
