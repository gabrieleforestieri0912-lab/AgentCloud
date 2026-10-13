import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidShareToken } from "@/lib/chat-share";

/**
 * GET /api/chat/share/[token] — lettura pubblica dello snapshot (sola lettura).
 *
 * Nessuna autenticazione richiesta: il token opaco È l'autorizzazione (come un
 * link di condivisione). Restituisce solo i campi di visualizzazione congelati
 * alla condivisione. 404 per token sconosciuti o revocati (stessa risposta, per
 * non rivelare quali token sono esistiti).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!isValidShareToken(token)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "db_unavailable" }, { status: 500 });

  const { data } = await admin
    .from("shared_chats")
    .select("title, snapshot, created_at")
    .eq("token", token)
    .maybeSingle();
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(
    { ok: true, ...(data as Record<string, unknown>) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
