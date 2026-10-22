/**
 * Helper condivisi dagli endpoint REST della memoria.
 *
 * Qui stanno le regole che devono valere per TUTTE le rotte della memoria:
 *
 *  - autenticazione (la sessione risolta dal server, mai dal body);
 *  - tenant scoping (il tenant è l'utente autenticato: un tenant non vede
 *    mai la memoria di un altro);
 *  - permessi sull'agente (si agisce solo sugli agenti che l'utente possiede);
 *  - rate limiting per tenant;
 *  - audit delle operazioni.
 */

import { AGENT_RUNTIME } from "@/lib/agents/registry";
import { getOwnedAgentSlugs } from "@/lib/agents/ownership";
import { logAudit } from "@/lib/audit";
import { rateLimit, RATE_LIMIT_WINDOWS } from "@/lib/rate-limit";
import type { User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { isValidScope } from "@/lib/memory/scope";
import type { MemoryScope } from "@/lib/memory/types";

export { readLimitParam, readTypeParam } from "./query";

/** Limiti per tenant, per minuto. */
export const MEMORY_RATE_LIMITS = {
  /** Letture (lista, export, config). */
  read: 60,
  /** Scritture (cancellazioni, configurazione). */
  write: 20,
} as const;

/** Esito della validazione della richiesta. */
export type MemoryRequestContext = {
  /** Utente autenticato. */
  user: User;
  /** Agente su cui si opera. */
  agentId: string;
  /** Scope della memoria. */
  scope: MemoryScope;
};

/**
 * Valida la richiesta: sessione, agente, permessi e rate limit.
 *
 * Il soggetto può essere indicato in due modi: una stringa (verificata
 * contro l'utente autenticato) oppure una funzione, che riceve l'id
 * dell'utente e restituisce il soggetto effettivo (così la route può
 *scegliere il default "l'utente stesso" senza conoscere l'id prima
 * dell'autenticazione).
 *
 * Restituisce la risposta HTTP quando qualcosa non va, `null` quando la
 * richiesta può procedere.
 */
export async function authorizeMemoryRequest(
  options: {
    agentId: string;
    operation: "read" | "write";
    /** Soggetto della memoria (utente o sessione anonima). */
    subjectId: string | ((userId: string) => string);
  },
): Promise<{ response: NextResponse } | { context: MemoryRequestContext }> {
  const { getSessionUser } = await import("@/lib/supabase/server");
  const user = await getSessionUser();
  if (!user) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const agentId = options.agentId;
  if (!AGENT_RUNTIME[agentId]) {
    return {
      response: NextResponse.json({ error: "Agent not found" }, { status: 404 }),
    };
  }

  const owned = await getOwnedAgentSlugs(user.id, user);
  if (!owned.includes(agentId)) {
    return {
      response: NextResponse.json(
        { error: "Agent not accessible" },
        { status: 403 },
      ),
    };
  }

  const subjectId =
    typeof options.subjectId === "function"
      ? options.subjectId(user.id)
      : options.subjectId;

  // Il soggetto deve essere l'utente stesso oppure una sessione anonima
  // (widget): non si può leggere la memoria di un altro utente autenticato.
  const isOwnSubject = subjectId === user.id;
  const isAnonymousSession = subjectId.startsWith("anon:");
  if (!isOwnSubject && !isAnonymousSession) {
    return {
      response: NextResponse.json(
        { error: "Subject not accessible" },
        { status: 403 },
      ),
    };
  }

  const limit =
    options.operation === "write" ? MEMORY_RATE_LIMITS.write : MEMORY_RATE_LIMITS.read;
  const rate = await rateLimit(
    `memory-${options.operation}`,
    user.id,
    { limit, windowMs: RATE_LIMIT_WINDOWS.MINUTE_MS },
  );
  if (!rate.allowed) {
    return {
      response: NextResponse.json(
        { error: "Rate limit exceeded", retryAfterSeconds: rate.retryAfterSeconds },
        { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
      ),
    };
  }

  const scope: MemoryScope = {
    tenantId: user.id,
    agentId,
    userId: subjectId,
  };
  if (!isValidScope(scope)) {
    return {
      response: NextResponse.json({ error: "Invalid scope" }, { status: 400 }),
    };
  }

  return {
    context: {
      user,
      agentId,
      scope,
    },
  };
}

/** Registra un'operazione della API della memoria. */
export function auditMemoryApi(
  action: string,
  context: MemoryRequestContext,
  payload: Record<string, unknown> = {},
): void {
  logAudit(action, {
    tenantId: context.scope.tenantId,
    agentId: context.scope.agentId,
    userId: context.scope.userId,
    ...payload,
  });
}
