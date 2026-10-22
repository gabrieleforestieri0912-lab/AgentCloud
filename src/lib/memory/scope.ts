/**
 * Helpers on the memory scope.
 *
 * The scope (tenant + agent + subject) is the unit of isolation of the whole
 * memory subsystem: it is built once, here, and travels unchanged through
 * every layer (service, storage, retrieval, REST endpoints).
 */

import type { MemoryScope } from "./types";

/**
 * Subject id of an anonymous visitor of the embeddable widget.
 *
 * Anonymous visitors have no account: the widget passes the browser session
 * id, and the memory of that session is isolated like any other subject.
 */
export function anonymousSubjectId(sessionId: string): string {
  return `anon:${sessionId}`;
}

/** True when the subject is an anonymous widget session. */
export function isAnonymousSubject(userId: string): boolean {
  return userId.startsWith("anon:");
}

/**
 * Pattern of the session id accepted by the widget.
 *
 * The client generates it (`crypto.randomUUID()` or equivalent): letters,
 * digits, dash and underscore, 8-64 chars. Anything else is refused: the
 * session id travels in an unauthenticated request, so a permissive pattern
 * would become a free-form injection point in the scope.
 */
export const ANON_SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

/** True when a widget session id has a shape we accept. */
export function isValidAnonSessionId(sessionId: string): boolean {
  return ANON_SESSION_ID_PATTERN.test(sessionId);
}

/** Builds a scope, validating that the three ids are present. */
export function createScope(
  tenantId: string,
  agentId: string,
  userId: string,
): MemoryScope {
  return {
    tenantId: tenantId.trim(),
    agentId: agentId.trim(),
    userId: userId.trim(),
  };
}

/** True when the scope is complete and usable. */
export function isValidScope(scope: MemoryScope | null | undefined): boolean {
  return Boolean(scope && scope.tenantId && scope.agentId && scope.userId);
}

/**
 * Throws when the scope is incomplete.
 *
 * A missing id would silently widen the isolation (an empty `tenant_id`
 * filter matches nothing, an empty one in a `neq` filter matches
 * everything): failing loudly is safer than writing memory somewhere wrong.
 */
export function assertValidScope(scope: MemoryScope): MemoryScope {
  if (!isValidScope(scope)) {
    throw new Error(
      "Invalid memory scope: tenantId, agentId and userId are all required.",
    );
  }
  return scope;
}

/**
 * Key that identifies a scope.
 *
 * Used by the in-memory storage and by the caches. The parts are separated by
 * an ASCII unit separator, so two different scopes can never produce the same
 * key.
 */
export function scopeKey(scope: MemoryScope): string {
  return [
    scope.tenantId,
    scope.agentId,
    scope.userId,
  ].join("\u001f");
}
