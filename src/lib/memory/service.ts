/**
 * Contract and implementation of the agent memory service.
 *
 * The service is the only door between the agent runtime and the memory: the
 * routes and the orchestrator talk to this interface and never to the
 * storage directly. That keeps the scoping, the secret filtering and the
 * failure handling in one place.
 *
 * Every operation is scoped: the service never works on "the memory" in the
 * abstract, always on the memory of one (tenant, agent, subject).
 */

import { logAudit } from "@/lib/audit";
import { computeExpiry } from "./config";
import type { MemoryConfig } from "./config";
import type { EmbeddingProvider } from "./embeddings";
import { containsSecret } from "./redaction";
import { cosineSimilarity, scoreMemoryItem } from "./similarity";
import type { ConversationSummarizer } from "./summarizer";
import type { MemoryStore } from "./store";
import { assertValidScope } from "./scope";
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
   * the agent. When a very similar item already exists, that item is
   * updated instead of creating a duplicate.
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
  store: MemoryStore;
  /** Configuration of the agent. */
  config: MemoryConfig;
  /** Provider of the embeddings. */
  embeddings: EmbeddingProvider;
  /** Summarizer of the conversations (optional). */
  summarizer?: ConversationSummarizer | null;
  /** Audit logger. Di default il logger del progetto. */
  logger?: (event: string, payload: Record<string, unknown>) => void;
};

/** Costruisce il servizio della memoria. */
export function createMemoryService(deps: MemoryServiceDeps): MemoryService {
  const { store, config, embeddings } = deps;
  const summarizer = deps.summarizer ?? null;
  const logger = deps.logger ?? logAudit;

  /** Calcola l'embedding di un testo. */
  async function embed(text: string): Promise<number[]> {
    const vectors = await embeddings.embed([text]);
    return vectors[0] ?? [];
  }

  return {
    async add(input: MemoryAddInput): Promise<MemoryItem | null> {
      const scope = assertValidScope(input.scope);
      const content = (input.content ?? "").trim();
      if (!content) return null;

      // I secreti non entrano mai nella memoria, nemmeno se il modello li ha
      // proposti: l'elemento viene scartato.
      if (containsSecret(content)) {
        logger("memory_rejected", {
          tenantId: scope.tenantId,
          agentId: scope.agentId,
          userId: scope.userId,
          reason: "secret",
        });
        return null;
      }

      const embedding = input.embedding ?? (await embed(content));
      const importance = clampImportance(
        input.importance ?? config.defaultImportance,
      );
      const now = new Date().toISOString();

      // Deduplica: un item molto simile viene aggiornato, non duplicato.
      const existing = await store.list(scope);
      let best: MemoryItem | null = null;
      let bestScore = 0;
      for (const item of existing) {
        if (!item.embedding) continue;
        const score = cosineSimilarity(item.embedding, embedding);
        if (score > bestScore) {
          bestScore = score;
          best = item;
        }
      }

      if (best && bestScore >= config.dedupeThreshold) {
        const updated: MemoryItem = {
          ...best,
          content,
          type: input.type ?? best.type,
          embedding,
          importance: Math.max(best.importance, importance),
          lastAccessedAt: now,
          expiresAt:
            input.expiresAt !== undefined
              ? input.expiresAt
              : computeExpiry(config, importance, new Date(best.createdAt)),
          sourceConversationId:
            input.sourceConversationId ?? best.sourceConversationId,
        };
        const saved = await store.update(scope, updated);
        logger("memory_update", {
          tenantId: scope.tenantId,
          agentId: scope.agentId,
          userId: scope.userId,
          id: updated.id,
          type: updated.type,
          similarity: Number(bestScore.toFixed(3)),
        });
        return saved;
      }

      const item: MemoryItem = {
        id: input.id ?? crypto.randomUUID(),
        tenantId: scope.tenantId,
        agentId: scope.agentId,
        userId: scope.userId,
        type: input.type,
        content,
        embedding,
        importance,
        createdAt: now,
        lastAccessedAt: now,
        expiresAt:
          input.expiresAt !== undefined
            ? input.expiresAt
            : computeExpiry(config, importance),
        sourceConversationId: input.sourceConversationId ?? null,
      };
      const saved = await store.insert(item);
      logger("memory_add", {
        tenantId: scope.tenantId,
        agentId: scope.agentId,
        userId: scope.userId,
        id: saved.id,
        type: saved.type,
        importance: saved.importance,
      });
      return saved;
    },

    async search(
      scope: MemoryScope,
      query: string,
      options?: { limit?: number; types?: MemoryItem["type"][] },
    ): Promise<MemorySearchHit[]> {
      assertValidScope(scope);
      const text = (query ?? "").trim();
      if (!text) return [];

      const queryEmbedding = await embed(text);
      const items = await store.list(scope, { types: options?.types });
      const now = Date.now();
      const hits = items
        .map((item) => ({ item, score: scoreMemoryItem(item, queryEmbedding, now) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, options?.limit ?? config.retrievalK);

      // Il recupero aggiorna l'ultimo accesso: un item usato vive più a
      // lungo, ed è anche il segnale di recency per le ricerche successive.
      await Promise.all(
        hits.map((hit) =>
          store.touch(scope, hit.item.id, new Date(now).toISOString()),
        ),
      );
      return hits;
    },

    async list(
      scope: MemoryScope,
      filter?: MemoryListFilter,
    ): Promise<MemoryItem[]> {
      assertValidScope(scope);
      return store.list(scope, filter);
    },

    async delete(scope: MemoryScope, id: string): Promise<boolean> {
      assertValidScope(scope);
      const deleted = await store.delete(scope, id);
      if (deleted) {
        logger("memory_delete", {
          tenantId: scope.tenantId,
          agentId: scope.agentId,
          userId: scope.userId,
          id,
        });
      }
      return deleted;
    },

    async deleteAll(
      scope: MemoryScope,
      filter?: MemoryListFilter,
    ): Promise<number> {
      assertValidScope(scope);
      const deleted = await store.deleteMany(scope, filter);
      logger("memory_delete_all", {
        tenantId: scope.tenantId,
        agentId: scope.agentId,
        userId: scope.userId,
        deleted,
      });
      return deleted;
    },

    async summarize(
      messages: MemoryMessage[],
      summarizeOptions?: MemorySummarizeOptions,
    ): Promise<string | null> {
      if (!summarizer) return null;
      return summarizer.summarize(messages, summarizeOptions);
    },

    async export(
      scope: MemoryScope,
      filter?: MemoryListFilter,
    ): Promise<MemoryItem[]> {
      assertValidScope(scope);
      // L'export GDPR comprende anche gli item scaduti: sono dati dell'utente
      // e l'utente deve poterli vedere prima di chiederne la cancellazione.
      return store.list(scope, { ...filter, includeExpired: true });
    },
  };
}

/** Limita l'importanza nell'intervallo 0-1. */
function clampImportance(value: number): number {
  if (!Number.isFinite(value)) return 0.5;
  return Math.min(1, Math.max(0, value));
}
