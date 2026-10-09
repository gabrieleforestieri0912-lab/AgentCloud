import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  MAX_FILE_BYTES,
  byteLength,
  normalizeFileName,
  resolveFileType,
  slugify,
} from "@/lib/chat-files";

/**
 * GET /api/chat/files?conversationId=...&agent=...
 *   File dell'utente autenticato (tutti, o filtrati per conversazione/agente).
 *
 * POST /api/chat/files
 *   Body: { conversationId?, agentSlug?, files: ChatFileRecord[] }
 *   Upsert: riusa lo stesso slug → nuova versione, mai un file duplicato.
 *
 * DELETE /api/chat/files?slug=...&conversationId=...
 *   Soft delete di un singolo file (GDPR: anche le versioni vanno via).
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const conversationId = url.searchParams.get("conversationId");
  const agent = url.searchParams.get("agent");

  let query = supabase
    .from("chat_files")
    .select("*, chat_file_versions(version, content, created_by, created_at)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(200);

  if (conversationId && UUID_RE.test(conversationId)) {
    query = query.eq("conversation_id", conversationId);
  }
  if (agent) query = query.eq("agent_slug", agent);

  const { data, error } = await query;
  if (error) {
    // La tabella potrebbe non essere ancora migrata: la chat resta comunque
    // funzionante perché i file vivono anche nel messaggio (localStorage).
    return NextResponse.json({ files: [], error: error.message }, { status: 200 });
  }

  const files = (data ?? []).map((row: Record<string, unknown>) => ({
    slug: row.slug,
    name: row.name,
    type: row.type,
    language: row.language ?? undefined,
    title: row.title ?? undefined,
    currentVersion: row.current_version ?? 1,
    created_at: row.created_at,
    conversation_id: row.conversation_id ?? undefined,
    agentSlug: row.agent_slug ?? undefined,
    versions: ((row.chat_file_versions as { version: number; content: string; created_by: string; created_at: string }[]) ?? [])
      .map((v) => ({
        version: v.version,
        content: v.content,
        created_at: v.created_at,
        created_by: v.created_by === "user" ? "user" : "ai",
      }))
      .sort((a, b) => a.version - b.version),
  }));

  return NextResponse.json({ files });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { conversationId?: string; agentSlug?: string; files?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!Array.isArray(body.files)) {
    return NextResponse.json({ error: "files_required" }, { status: 400 });
  }

  const conversationId =
    body.conversationId && UUID_RE.test(body.conversationId) ? body.conversationId : null;
  const saved: string[] = [];
  const rejected: { slug: string; reason: string }[] = [];

  for (const raw of body.files as Record<string, unknown>[]) {
    const name = normalizeFileName(typeof raw?.name === "string" ? raw.name : "");
    const slug = slugify(
      typeof raw?.slug === "string" ? raw.slug : typeof raw?.id === "string" ? raw.id : name,
    );
    const content = typeof raw?.content === "string" ? raw.content : "";
    if (!content) continue;
    if (byteLength(content) > MAX_FILE_BYTES) {
      rejected.push({ slug, reason: "too_large" });
      continue;
    }

    const type = resolveFileType(typeof raw?.type === "string" ? raw.type : undefined, name);
    const language = typeof raw?.language === "string" ? raw.language : null;
    const title = typeof raw?.title === "string" ? raw.title : null;
    const { data: existing, error: findErr } = await supabase
      .from("chat_files")
      .select("id, current_version")
      .eq("account_id", user.id)
      .eq("slug", slug)
      .eq("conversation_id", conversationId)
      .maybeSingle();
    if (findErr) {
      rejected.push({ slug, reason: findErr.message });
      continue;
    }

    if (existing) {
      const current = existing.current_version ?? 1;
      const { data: lastVersion } = await supabase
        .from("chat_file_versions")
        .select("content")
        .eq("file_id", existing.id)
        .eq("version", current)
        .maybeSingle();
      // Streaming ancora sullo stesso contenuto: niente versione duplicata.
      if (lastVersion?.content === content) {
        saved.push(slug);
        continue;
      }
      const next = current + 1;
      const { error: vErr } = await supabase.from("chat_file_versions").insert({
        file_id: existing.id,
        version: next,
        content,
        created_by: "ai",
      });
      if (vErr) {
        rejected.push({ slug, reason: vErr.message });
        continue;
      }
      await supabase
        .from("chat_files")
        .update({ name, type, language, title, size_bytes: byteLength(content), current_version: next })
        .eq("id", existing.id);
      saved.push(slug);
    } else {
      const { data: inserted, error: iErr } = await supabase
        .from("chat_files")
        .insert({
          account_id: user.id,
          conversation_id: conversationId,
          message_id: typeof raw?.messageId === "string" ? raw.messageId.slice(0, 120) : null,
          slug,
          name,
          type,
          language,
          title,
          size_bytes: byteLength(content),
          current_version: 1,
          agent_slug: body.agentSlug ?? null,
        })
        .select("id")
        .single();
      if (iErr) {
        rejected.push({ slug, reason: iErr.message });
        continue;
      }
      await supabase.from("chat_file_versions").insert({
        file_id: inserted.id,
        version: 1,
        content,
        created_by: "ai",
      });
      saved.push(slug);
    }
  }

  return NextResponse.json({ saved, rejected });
}

export async function DELETE(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");
  const conversationId = url.searchParams.get("conversationId");
  if (!slug) return NextResponse.json({ error: "slug_required" }, { status: 400 });

  let query = supabase
    .from("chat_files")
    .update({ deleted_at: new Date().toISOString() })
    .eq("account_id", user.id)
    .eq("slug", slug);
  if (conversationId && UUID_RE.test(conversationId)) query = query.eq("conversation_id", conversationId);

  const { error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  // Le versioni restano in DB per il ripristino/audit ma non sono più visibili
  // (deleted_at): la cancellazione definitiva avviene con la conversazione.
  return NextResponse.json({ ok: true });
}