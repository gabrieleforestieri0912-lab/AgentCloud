import { NextResponse } from "next/server";
import { sha256Hex, resolveBearerCredential } from "@/lib/supabase/pat";

/**
 * DELETE /api/user/tokens/self — revoca il token API con cui viene chiamata.
 *
 * Perché esiste: `agentcloud logout` può revocare a distanza il `act_…` che
 * sta usando (se è un PAT) invece di limitarsi a cancellarlo dal disco:
 * così un token perso dal client resta comunque valido fino alla revoca.
 * Risponde 501 (e non 500) quando la chiamata non arriva via PAT: i JWT
 * Supabase non hanno riga su api_tokens e non c'è nulla da revocare.
 */
export const runtime = "nodejs";

export async function DELETE(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token.startsWith("act_")) {
    return NextResponse.json(
      { error: "Solo i token API `act_…` possono essere revocati." },
      { status: 501 },
    );
  }
  const credential = await resolveBearerCredential(token);
  if (!credential) {
    return NextResponse.json({ ok: true, already: true });
  }
  // Revoca per hash, perché è l'unico campo persistito (mai il token in chiaro).
  const hash = await sha256Hex(token);
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "db_unavailable" }, { status: 500 });
  const { error } = await admin
    .from("api_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("token_hash", hash)
    .eq("user_id", credential.user.id)
    .is("revoked_at", null);
  if (error) return NextResponse.json({ error: "store_failed" }, { status: 500 });
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
