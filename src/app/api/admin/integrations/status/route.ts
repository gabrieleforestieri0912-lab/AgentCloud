import { NextResponse } from "next/server";
import { listTenants } from "@/lib/tenants";

export async function GET(req: Request) {
  const token = process.env.ADMIN_API_TOKEN;
  if (!token || req.headers.get("authorization") !== `Bearer ${token}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const requestedTenant = url.searchParams.get("tenant");
  const tenants = listTenants().filter((tenant) => !requestedTenant || tenant.id === requestedTenant);
  return NextResponse.json({ integrations: tenants }, { headers: { "Cache-Control": "no-store" } });
}
