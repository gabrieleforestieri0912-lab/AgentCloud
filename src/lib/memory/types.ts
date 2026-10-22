/**
 * Data model of the agent memory.
 *
 * The memory is a flat list of "memory items". Every item belongs to exactly
 * one scope:
 *
 *   - `tenantId`: the account that owns the data. In this project one
 *     Supabase user is one tenant (see `src/lib/supabase/server.ts`).
 *   - `agentId`: the agent that produced the item. Two agents of the same
 *     tenant never share memory.
 *   - `userId`: the subject of the memory. For logged-in users it is the
 *     user id; for anonymous widget visitors it is the session id (see
 *     `anonymousSubjectId`).
 *
 * The scope is part of EVERY item and EVERY storage operation: the storage
 * layer filters on it, so a caller can never read or delete the memory of
 * another tenant/agent by passing a different id.
 */

/** Kind of memory item. */
export type MemoryType = "fact" | "preference" | "summary" | "event" | "meta";

/** All the memory types, in the order used by the UI filters. */
export const MEMORY_TYPES: readonly MemoryType[] = [
  "fact",
  "preference",
  "summary",
  "event",
];

/**
 * Internal, non-user-visible types.
 *
 * `meta` holds bookkeeping (for now only the watermark of what the
 * extraction has already processed). These items are never retrieved, are
 * excluded from the list API and are only returned by the GDPR export,
 * where every byte stored about the user is returned.
 */
export const INTERNAL_MEMORY_TYPES: readonly MemoryType[] = ["meta"];

/** True when `value` is a valid memory type. */
export function isMemoryType(value: unknown): value is MemoryType {
  return (
    typeof value === "string" && (MEMORY_TYPES as readonly string[]).includes(value)
  );
}

/** A single memory item. */
export type MemoryItem = {
  /** Stable identifier (uuid in Supabase). */
  id: string;
  /** Owning account. */
  tenantId: string;
  /** Agent that owns the memory. */
  agentId: string;
  /** Subject of the memory (user id, or session id for anonymous visitors). */
  userId: string;
  /** What the item represents. */
  type: MemoryType;
  /** The remembered text. Never contains secrets (see `redaction.ts`). */
  content: string;
  /** Embedding of `content`, used for semantic retrieval. */
  embedding: number[] | null;
  /** How important the item is, from 0 to 1. */
  importance: number;
  /** Creation timestamp (ISO 8601). */
  createdAt: string;
  /** Last time the item was retrieved (ISO 8601). */
  lastAccessedAt: string;
  /** Expiration timestamp (ISO 8601), `null` when the item never expires. */
  expiresAt: string | null;
  /** Conversation the item was extracted from, when known. */
  sourceConversationId: string | null;
};

/**
 * The scope every memory operation is bound to.
 *
 * It is mandatory in every storage call on purpose: the scoping rule is
 * enforced by the storage layer instead of relying on the caller to remember
 * the filters.
 */
export type MemoryScope = {
  tenantId: string;
  agentId: string;
  userId: string;
};

/** Payload of a new memory item. */
export type MemoryAddInput = {
  scope: MemoryScope;
  type: MemoryType;
  content: string;
  /** Pre-computed embedding. When missing the service computes it. */
  embedding?: number[] | null;
  /** Importance, from 0 to 1. Defaults to the configured default. */
  importance?: number;
  /** Explicit expiration. `null` means "use the TTL of the agent". */
  expiresAt?: string | null;
  /** Conversation the item comes from. */
  sourceConversationId?: string | null;
  /** Explicit id. When missing the storage generates one. */
  id?: string;
};

/** Filters of the list/delete operations. */
export type MemoryListFilter = {
  /** Restrict to these memory types. */
  types?: MemoryType[];
  /** Include items whose `expiresAt` is in the past. Default: `false`. */
  includeExpired?: boolean;
  /** Maximum number of items. */
  limit?: number;
};

/** A memory item with its relevance score. */
export type MemorySearchHit = {
  item: MemoryItem;
  /** Between 0 and 1: similarity blended with recency. */
  score: number;
};

/**
 * A message of the short-term memory (conversation history).
 *
 * The short-term memory is the live window of the current conversation: it is
 * not persisted as items, it is summarized when it grows past the threshold.
 */
export type MemoryMessage = {
  role: "user" | "assistant";
  content: string;
};

/** Options of the short-term summarization. */
export type MemorySummarizeOptions = {
  /** Maximum length (in characters) of the produced summary. */
  maxChars?: number;
  /** Locale hint for the summary language. */
  locale?: string;
};
