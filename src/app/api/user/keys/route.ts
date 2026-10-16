import { NextRequest, NextResponse } from "next/server";
import { AGENT_RUNTIME } from "@/lib/agents/registry";
import { getSessionUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  generateApiKey,
  patDisplayPrefix,
  sha256Hex,
} from "@/lib/supabase/pat";

/**
 * GET /api/user/keys — elenca le API keys dell'utente
 * (mai in chiaro: solo prefisso, scope, date e stato).
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "db_unavailable" }, { status: 500 });

  const { data, error } = await admin
    .from("api_keys")
    .select("id,name,prefix,agent_slug,created_at,last_used_at")
    .eq("user_id", user.id)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });
  if (error) {
    const missing =
      error.code === "42P01" ||
      /relation .* does not exist/i.test(error.message ?? "");
    return NextResponse.json(
      { error: missing ? "keys_not_setup" : "store_failed" },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, keys: data ?? [] });
}

const MAX_KEYS = 10;

/**
 * POST /api/user/keys { name?, agent? } — crea una API key `ack_…`,
 * opzionale limitata a un modello (agent_slug). La key in chiaro è
 * restituita UNA sola volta: il DB salva solo lo SHA-256.
 */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "db_unavailable" }, { status: 500 });

  let name = "Integrazione";
  let agent: string | null = null;
  try {
    const body = (await req.json()) as { name?: unknown; agent?: unknown };
    if (typeof body.name === "string" && body.name.trim()) {
      name = body.name.trim().slice(0, 60);
    }
    if (typeof body.agent === "string" && body.agent.trim()) {
      agent = body.agent.trim();
    }
  } catch {
    // corpo mancante/non-JSON: usa i default
  }

  if (agent && !AGENT_RUNTIME[agent]) {
    return NextResponse.json({ error: "unknown_agent" }, { status: 400 });
  }

  const { count } = await admin
    .from("api_keys")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("revoked_at", null);
  if ((count ?? 0) >= MAX_KEYS) {
    return NextResponse.json({ error: "too_many_keys" }, { status: 400 });
  }

  const key = generateApiKey();
  const { data, error } = await admin
    .from("api_keys")
    .insert({
      user_id: user.id,
      name,
      key_hash: await sha256Hex(key),
      prefix: patDisplayPrefix(key),
      agent_slug: agent,
    })
    .select("id,prefix,agent_slug,created_at")
    .single();
  if (error || !data) {
    const missing =
      error?.code === "42P01" ||
      /relation .* does not exist/i.test(error?.message ?? "");
    return NextResponse.json(
      { error: missing ? "keys_not_setup" : "store_failed" },
      { status: 500 },
    );
  }
  return NextResponse.json({
    ok: true,
    id: data.id,
    key,
    prefix: data.prefix,
    agent: data.agent_slug,
  });
}
