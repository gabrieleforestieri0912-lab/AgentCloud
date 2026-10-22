/**
 * Contract of the agent memory service.
 *
 * The service is the only door between the agent runtime and the memory: the
 * routes and the orchestrator talk to this interface and never to the
 * storage directly. That keeps the scoping, the secret filtering and the
 * failure handling in one place.
 *
 * The implementation lives in `service.ts` (phase 2 and following).
 */

import type { MemoryConfig } from "./config";
import type {
  MemoryAddInput,
  MemoryItem,
  MemoryListFilter,
  MemoryMessage,
  MemoryScope,
  MemorySearchHit,
  MemorySummarizeOptions,
} from "./types";

/** Public interface of the memory of an agent. */
export interface MemoryService {
  /**
   * Remembers something.
   *
   * The content is filtered for secrets before being written, the embedding
   * is computed if missing, and the expiration is derived from the TTL of
   * the agent.
   */
  add(input: MemoryAddInput): Promise<MemoryItem | null>;

  /**
   * Retrieves the memory items most relevant to a query.
   *
   * The search ALWAYS filters by tenant, agent and subject.
   */
  search(
    scope: MemoryScope,
    query: string,
    options?: { limit?: number; types?: MemoryItem["type"][] },
  ): Promise<MemorySearchHit[]>;

  /** Lists the memory items of a scope. */
  list(
    scope: MemoryScope,
    filter?: MemoryListFilter,
  ): Promise<MemoryItem[]>;

  /** Deletes one item. Returns false when it does not exist (or is another scope). */
  delete(scope: MemoryScope, id: string): Promise<boolean>;

  /** Deletes all the items of a subject (GDPR "right to be forgotten"). */
  deleteAll(
    scope: MemoryScope,
    filter?: MemoryListFilter,
  ): Promise<number>;

  /**
   * Summarizes a conversation, so the short-term memory can replace the old
   * messages with a compact summary.
   *
   * Returns `null` when the summarization is not available: the caller then
   * keeps the original messages.
   */
  summarize(
    messages: MemoryMessage[],
    options?: MemorySummarizeOptions,
  ): Promise<string | null>;

  /** Exports the memory of a subject (GDPR portability). */
  export(scope: MemoryScope, filter?: MemoryListFilter): Promise<MemoryItem[]>;
}

/** Dependencies of the service implementation. */
export type MemoryServiceDeps = {
  /** Storage of the items. */
  store: import("./store").MemoryStore;
  /** Configuration of the agent. */
  config: MemoryConfig;
  /** Provider of the embeddings. */
  embeddings: import("./embeddings").EmbeddingProvider;
};
