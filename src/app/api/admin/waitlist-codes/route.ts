/**
 * POST /api/admin/waitlist-codes
 *
 * Admin-only endpoint for managing waitlist beta access codes.
 *
 * Actions:
 *   - generate: { action: "generate", role, max_uses, expires_at? }
 *   - revoke:   { action: "revoke", code_id }
 *
 * Auth: requires admin email (same as other admin routes).
 */

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Generate a random code in format XXXX-XXXX-XXXX.
 */
function generateCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const segments = [];
  for (let s = 0; s < 3; s++) {
    let seg = "";
    for (let i = 0; i < 4; i++) {
      seg += chars[Math.floor(Math.random() * chars.length)];
    }
    segments.push(seg);
  }
  return segments.join("-");
}

export async function POST(request: Request) {
  // Auth check
  const user = await getSessionUser();
  const isAdmin = (user && isAdminEmail(user.email));

  if (!isAdmin) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = createAdminClient();
  if (!db) {
    return NextResponse.json({ error: "DB not configured" }, { status: 500 });
  }

  const body = await request.json().catch(() => ({}));
  const action = body.action as string;

  // --- GENERATE ---
  if (action === "generate") {
    const role = body.role as string;
    const maxUses = Number(body.max_uses) || 1;
    const expiresAt = body.expires_at || null;

    // Validate role
    if (!["beta_tester", "internal_qa"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Generate unique code (retry on collision)
    let code = generateCode();
    let attempts = 0;
    while (attempts < 10) {
      const { data: existing } = await db
        .from("waitlist_codes")
        .select("id")
        .eq("code", code)
        .maybeSingle();
      if (!existing) break;
      code = generateCode();
      attempts++;
    }

    const { data, error } = await db
      .from("waitlist_codes")
      .insert({
        code,
        role,
        max_uses: maxUses,
        expires_at: expiresAt || null,
        created_by: user?.id ?? null,
      })
      .select("id, code")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, code: data.code, id: data.id });
  }

  // --- REVOKE ---
  if (action === "revoke") {
    const codeId = body.code_id as string;
    if (!codeId) {
      return NextResponse.json({ error: "code_id is required" }, { status: 400 });
    }

    const { error } = await db
      .from("waitlist_codes")
      .update({ expires_at: new Date().toISOString() })
      .eq("id", codeId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
