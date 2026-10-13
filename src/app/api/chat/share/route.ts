import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildSharedSnapshot, generateShareToken } from "@/lib/chat-share";

/**
 * POST /api/chat/share — crea uno snapshot in sola lettura di una conversazione.
 *
 * Richiede login. Il client invia titolo + messaggi già ridotti ai soli campi
 * di visualizzazione; il server rivalida e congela lo snapshot in
 * `shared_chats`. Risponde con il link pubblico `/chat/shared/[token]`.
 * Non esiste alcun endpoint di modifica: il link è sempre una fotografia.
 */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { title?: unknown; agentSlugs?: unknown; messages?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const built = buildSharedSnapshot(body ?? {});
  if (!built.ok) {
    const reason =
      built.error === "empty"
        ? "La conversazione è vuota: non c'è niente da condividere."
        : built.error === "too_many_messages"
          ? "Conversazione troppo lunga da condividere."
          : "Conversazione troppo grande da condividere.";
    return NextResponse.json({ error: reason }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "db_unavailable" }, { status: 500 });

  const token = generateShareToken();
  const { error } = await admin.from("shared_chats").insert({
    token,
    owner_user_id: user.id,
    title: built.snapshot.title,
    snapshot: built.snapshot,
  });
  if (error) return NextResponse.json({ error: "store_failed" }, { status: 500 });

  return NextResponse.json({ ok: true, token, url: `/chat/shared/${token}` });
}

/**
 * DELETE /api/chat/share?token=… — revoca un link (solo il proprietario).
 * Cancella la riga: il link smette subito di funzionare.
 */
export async function DELETE(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const token = req.nextUrl.searchParams.get("token") ?? "";
  if (!token) return NextResponse.json({ error: "missing_token" }, { status: 400 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "db_unavailable" }, { status: 500 });

  const { error } = await admin
    .from("shared_chats")
    .delete()
    .eq("token", token)
    .eq("owner_user_id", user.id);
  if (error) return NextResponse.json({ error: "store_failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
