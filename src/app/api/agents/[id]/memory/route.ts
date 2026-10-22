/**
 * API della memoria di un agente.
 *
 *   GET    /api/agents/[id]/memory?user_id=&type=&limit=
 *          lista la memoria del soggetto (di default l'utente autenticato)
 *   DELETE /api/agents/[id]/memory?user_id=
 *          cancella tutta la memoria del soggetto (GDPR: diritto all'oblio)
 *
 * Il tenant è SEMPRE l'utente autenticato risolto dal server: nessun id
 * tenant viene accettato dal client, quindi un tenant non legge e non
 * cancella mai la memoria di un altro.
 */

import { NextResponse } from "next/server";
import {
  auditMemoryApi,
  authorizeMemoryRequest,
  readLimitParam,
  readTypeParam,
} from "@/lib/memory/api";
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

/** Soggetto della memoria: dal body/query, con fallback all'utente. */
function subjectFrom(params: URLSearchParams, fallback: string): string {
  const requested = params.get("user_id");
  return requested && requested.trim() ? requested.trim() : fallback;
}

/**
 * GET /api/agents/[id]/memory
 *
 * Elenco della memoria del soggetto, con filtro per tipo.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: agentId } = await params;
  const url = new URL(req.url);
  const searchParams = url.searchParams;

  // Il soggetto va controllato prima di autorizzare: la richiesta è
  // rifiutata se prova a puntare alla memoria di un altro utente.
  const authorization = await authorizeMemoryRequest({
    agentId,
    operation: "read",
    subjectId: (userId) => subjectFrom(searchParams, userId),
  });
  if ("response" in authorization) return authorization.response;

  const { context } = authorization;
  const type = readTypeParam(searchParams.get("type"));
  const limit = readLimitParam(searchParams.get("limit"), 100);

  const { service } = await getMemoryService(agentId, context.scope.tenantId);
  const items = await service.list(context.scope, {
    types: type ? [type] : undefined,
    limit,
  });

  auditMemoryApi("memory_api_list", context, {
    count: items.length,
    type: type ?? null,
  });

  // Gli item `meta` sono dati di consegna interna (il watermark
  // dell'estrazione): non sono memoria richiamabile e contengono solo il
  // conteggio e l'impronta, quindi non escono nella lista. Restano coperti
  // dall'export GDPR completo, che comprende tutto ciò che è conservato.
  const visible = items.filter((item) => item.type !== "meta");

  return NextResponse.json(
    { items: visible.map(toPublicItem), count: visible.length },
    { status: 200 },
  );
}

/**
 * DELETE /api/agents/[id]/memory?user_id=
 *
 * Cancella tutta la memoria del soggetto (GDPR).
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: agentId } = await params;
  const searchParams = new URL(req.url).searchParams;

  const authorization = await authorizeMemoryRequest({
    agentId,
    operation: "write",
    subjectId: (userId) => subjectFrom(searchParams, userId),
  });
  if ("response" in authorization) return authorization.response;

  const { context } = authorization;
  const type = readTypeParam(searchParams.get("type"));

  const { service } = await getMemoryService(agentId, context.scope.tenantId);
  const deleted = await service.deleteAll(context.scope, {
    types: type ? [type] : undefined,
  });

  auditMemoryApi("memory_api_delete_all", context, {
    deleted,
    type: type ?? null,
  });

  return NextResponse.json({ deleted }, { status: 200 });
}
