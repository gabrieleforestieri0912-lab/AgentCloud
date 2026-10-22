/**
 * Configurazione della memoria di un agente.
 *
 *   GET    /api/agents/[id]/memory/config
 *          configurazione effettiva (default del progetto + override del tenant)
 *   PATCH  /api/agents/[id]/memory/config
 *          body: { enabled?, ttlDays?, retrievalK?, tokenBudget?,
 *                   shortTermTokenThreshold?, dedupeThreshold? }
 *
 * Gli override sono per (tenant, agente): due account che usano lo stesso
 * agente possono accendere e spegnere la memoria separatamente.
 */

import { NextResponse } from "next/server";
import { auditMemoryApi, authorizeMemoryRequest } from "@/lib/memory/api";
import { resolveMemoryConfig } from "@/lib/memory/config";
import {
  getAgentMemoryConfig,
  saveAgentMemoryConfig,
} from "@/lib/memory/config-store";
import { resetMemoryService } from "@/lib/memory/runtime";

/** Valida il patch del body: solo numeri within bounds e booleani. */
function parsePatch(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const patch: Record<string, unknown> = {};

  if (record.enabled !== undefined) {
    if (typeof record.enabled !== "boolean") return null;
    patch.enabled = record.enabled;
  }

  const numbers: [string, string, number, number][] = [
    ["ttlDays", "ttlDays", 0, 3650],
    ["retrievalK", "retrievalK", 0, 50],
    ["tokenBudget", "tokenBudget", 0, 20000],
    ["shortTermTokenThreshold", "shortTermTokenThreshold", 0, 200000],
    ["dedupeThreshold", "dedupeThreshold", 0, 1],
  ];
  for (const [key, , min, max] of numbers) {
    const value = record[key];
    if (value === undefined) continue;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < min || parsed > max) return null;
    patch[key] = parsed;
  }

  return patch;
}

/** Configurazione effettiva di un agente per un tenant. */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: agentId } = await params;

  const authorization = await authorizeMemoryRequest({
    agentId,
    operation: "read",
    subjectId: (userId) => userId,
  });
  if ("response" in authorization) return authorization.response;

  const { context } = authorization;
  const overrides = await getAgentMemoryConfig(context.scope.tenantId, agentId);
  const effective = resolveMemoryConfig(agentId, overrides);

  auditMemoryApi("memory_api_config_get", context, {});

  return NextResponse.json(
    { agentId, config: effective, overrides: overrides ?? {} },
    { status: 200 },
  );
}

/** Aggiorna la configurazione della memoria di un agente. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: agentId } = await params;

  const authorization = await authorizeMemoryRequest({
    agentId,
    operation: "write",
    subjectId: (userId) => userId,
  });
  if ("response" in authorization) return authorization.response;

  const { context } = authorization;
  const body = await req.json().catch(() => null);
  const patch = parsePatch(body);
  if (!patch) {
    return NextResponse.json(
      { error: "Invalid configuration payload" },
      { status: 400 },
    );
  }

  const saved = await saveAgentMemoryConfig(
    context.scope.tenantId,
    agentId,
    patch as never,
  );
  if (!saved) {
    return NextResponse.json(
      {
        error:
          "Failed to save the configuration. If the memory tables are missing, apply supabase/schema-agent-memory.sql.",
      },
      { status: 500 },
    );
  }

  // Il servizio in cache tiene dentro la configurazione: va ricaricato.
  resetMemoryService(context.scope.tenantId, agentId);

  const overrides = await getAgentMemoryConfig(context.scope.tenantId, agentId);
  auditMemoryApi("memory_api_config_update", context, { patch });

  return NextResponse.json(
    { agentId, config: resolveMemoryConfig(agentId, overrides) },
    { status: 200 },
  );
}
