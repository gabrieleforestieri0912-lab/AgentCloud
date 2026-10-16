import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  generatePat,
  patDisplayPrefix,
  sha256Hex,
} from "@/lib/supabase/pat";

/**
 * GET /api/user/tokens — elenca i token API personali dell'utente
 * (mai il token in chiaro: solo prefisso, date e stato).
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "db_unavailable" }, { status: 500 });

  const { data, error } = await admin
    .from("api_tokens")
    .select("id,name,prefix,created_at,last_used_at")
    .eq("user_id", user.id)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });
  if (error) {
    const missing =
      error.code === "42P01" ||
      /relation .* does not exist/i.test(error.message ?? "");
    return NextResponse.json(
      { error: missing ? "tokens_not_setup" : "store_failed" },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, tokens: data ?? [] });
}

const MAX_TOKENS = 10;

/**
 * POST /api/user/tokens { name? } — genera un token `act_…`.
 * Il token in chiaro è restituito UNA sola volta: il DB salva solo lo SHA-256.
 */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "db_unavailable" }, { status: 500 });

  let name = "CLI";
  try {
    const body = (await req.json()) as { name?: unknown };
    if (typeof body.name === "string" && body.name.trim()) {
      name = body.name.trim().slice(0, 60);
    }
  } catch {
    // corpo mancante/non-JSON: usa il nome di default
  }

  const { count } = await admin
    .from("api_tokens")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("revoked_at", null);
  if ((count ?? 0) >= MAX_TOKENS) {
    return NextResponse.json({ error: "too_many_tokens" }, { status: 400 });
  }

  const token = generatePat();
  const { data, error } = await admin
    .from("api_tokens")
    .insert({
      user_id: user.id,
      name,
      token_hash: await sha256Hex(token),
      prefix: patDisplayPrefix(token),
    })
    .select("id,prefix,created_at")
    .single();
  if (error || !data) {
    const missing =
      error?.code === "42P01" ||
      /relation .* does not exist/i.test(error?.message ?? "");
    return NextResponse.json(
      { error: missing ? "tokens_not_setup" : "store_failed" },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, id: data.id, token, prefix: data.prefix });
}
