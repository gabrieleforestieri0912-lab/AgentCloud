/**
 * GET /api/agents/[id]/memory/export?user_id=
 *
 * Esporta la memoria del soggetto in JSON (GDPR: diritto alla portabilità).
 *
 * L'export comprende anche gli item scaduti: sono comunque dati dell'utente
 * e devono poter essere visti prima di chiederne la cancellazione.
 */

import { NextResponse } from "next/server";
import { auditMemoryApi, authorizeMemoryRequest } from "@/lib/memory/api";
import { getMemoryService } from "@/lib/memory/runtime";
import type { MemoryItem } from "@/lib/memory/types";

/** Vista pubblica di un memory item (senza embedding: è interno). */
function toPublicItem(item: MemoryItem) {
  return {
    id: item.id,
    agentId: item.agentId,
    userId: item.userId,
    type: item.type,
    content: item.content,
    importance: item.importance,
    createdAt: item.createdAt,
    lastAccessedAt: item.lastAccessedAt,
    expiresAt: item.expiresAt,
    sourceConversationId: item.sourceConversationId,
  };
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: agentId } = await params;
  const searchParams = new URL(req.url).searchParams;

  const authorization = await authorizeMemoryRequest({
    agentId,
    operation: "read",
    subjectId: (userId) => {
      const requested = searchParams.get("user_id");
      return requested && requested.trim() ? requested.trim() : userId;
    },
  });
  if ("response" in authorization) return authorization.response;

  const { context } = authorization;
  const { service } = await getMemoryService(agentId, context.scope.tenantId);
  const items = await service.export(context.scope);

  auditMemoryApi("memory_api_export", context, { count: items.length });

  return NextResponse.json(
    {
      agentId,
      userId: context.scope.userId,
      exportedAt: new Date().toISOString(),
      count: items.length,
      items: items.map(toPublicItem),
    },
    { status: 200 },
  );
}
