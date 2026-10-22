/**
 * DELETE /api/agents/[id]/memory/[memory_id]
 *
 * Cancella un singolo memory item. L'id da solo non basta: la cancellazione
 * avviene dentro lo scope (tenant + agente + soggetto), quindi un id di un
 * altro tenant non cancella niente e risponde 404.
 */

import { NextResponse } from "next/server";
import { auditMemoryApi, authorizeMemoryRequest } from "@/lib/memory/api";
import { getMemoryService } from "@/lib/memory/runtime";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; memory_id: string }> },
) {
  const { id: agentId, memory_id: memoryId } = await params;
  const searchParams = new URL(req.url).searchParams;

  const authorization = await authorizeMemoryRequest({
    agentId,
    operation: "write",
    subjectId: (userId) => {
      const requested = searchParams.get("user_id");
      return requested && requested.trim() ? requested.trim() : userId;
    },
  });
  if ("response" in authorization) return authorization.response;

  const { context } = authorization;
  const { service } = await getMemoryService(agentId, context.scope.tenantId);
  const deleted = await service.delete(context.scope, memoryId);

  auditMemoryApi("memory_api_delete", context, { id: memoryId, deleted });

  if (!deleted) {
    return NextResponse.json({ error: "Memory item not found" }, { status: 404 });
  }
  return NextResponse.json({ deleted: true, id: memoryId }, { status: 200 });
}
