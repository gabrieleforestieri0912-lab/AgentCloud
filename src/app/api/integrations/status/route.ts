import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/integrations/status
 * Returns all tenant_integrations for the current tenant (generic providers).
 * Used by agent pages and deploy flows to show "already connected" when
 * the user configured the provider via /dashboard/integrations.
 */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user && !true) return NextResponse.json({ providers: [] }, { status: 200 });
  const tenantId = user?.id ?? null;
  if (!tenantId) return NextResponse.json({ providers: [] }, { status: 200 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ providers: [] }, { status: 200 });

  const { data, error } = await admin
    .from("tenant_integrations")
    .select("provider, status, external_account_id, metadata, updated_at, scope")
    .eq("tenant_id", tenantId);

  if (error || !data) return NextResponse.json({ providers: [] }, { status: 200 });

  return NextResponse.json({ providers: data }, { status: 200, headers: { "Cache-Control": "no-store" } });
}
