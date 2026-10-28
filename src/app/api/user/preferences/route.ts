import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/server";
import {
  isPreferenceKey,
  isPreferenceValue,
  readPreferences,
  writePreference,
} from "@/lib/user-preferences";

/**
 * Preferenze dell'account (larghezza sidebar, stato aperta, size testo,
 * agente predefinito, toggle email/prodotti).
 *
 * GET  → tutte le preferenze salvate `{ preferences: { key: value } }`.
 * PUT  { key, value } → upsert di una preferenza (chiave in allowlist).
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const preferences = await readPreferences(user.id);
  return NextResponse.json({ preferences });
}

export async function PUT(req: Request) {
  const user = await getSessionUser();
  if (!user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  let body: { key?: unknown; value?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!isPreferenceKey(body.key)) {
    return NextResponse.json({ error: "unknown_key" }, { status: 400 });
  }
  if (!isPreferenceValue(body.value)) {
    return NextResponse.json({ error: "invalid_value" }, { status: 400 });
  }
  const ok = await writePreference(user.id, body.key, body.value);
  if (!ok) return NextResponse.json({ error: "store_failed" }, { status: 500 });
  return NextResponse.json({ ok: true, key: body.key });
}
