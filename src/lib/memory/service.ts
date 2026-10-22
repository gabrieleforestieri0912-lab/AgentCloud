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
import { detectSecrets } from "./redaction";
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
   * Remembers a BATCH of items, ideally from the same extraction.
   *
   * Equals N `add` called in sequence, with two savings: the embeddings are
   * computed in ONE call instead of one call per item (each round trip saved
   * counts when the provider is remote), and the allocation check list
   * loads it once per scope. The result is in order, one item per input
   * (`null` where the item was discarded, e.g. for a secret).
   */
  addMany(inputs: MemoryAddInput[]): Promise<(MemoryItem | null)[]>;

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

  /**
   * Guard di compatibilità degli embedding.
   *
   * Il provider è configurabile (`EMBEDDINGS_API_KEY`): se cambia, le vettori
   * già salvati appartengono a un altro spazio e la similarità coseno non ha
   * senso — mescolando spazi la retrieval dà risultati falsati in modo
   * silenzioso. Un item con una lunghezza diversa dalla query viene quindi
   * ESCLUSO dal punteggio (non cancellato: tornando al provider vecchio
   * l'item torna utile), e la vita del problema finisce una volta nei log.
   */
  let dimensionWarned = false;
  function compatible(itemEmbedding: number[] | null, vector: number[]): itemEmbedding is number[] {
    if (!itemEmbedding || itemEmbedding.length !== vector.length) {
      if (!dimensionWarned) {
        dimensionWarned = true;
        console.warn(
          `memory: skipped ${itemEmbedding ? itemEmbedding.length : "?"}-dim item ` +
            `with a ${vector.length}-dim provider "${embeddings.name}" ` +
            `(provider changed since it was stored)`,
        );
      }
      return false;
    }
    return true;
  }

  /** Décisore tra update (dedup) e insert, con embedding già calcolato. */
  async function writeWithEmbedding(
    input: MemoryAddInput,
    embedding: number[],
    /** Cache dei candidati per un batch: evita un `store.list` a item. */
    candidateCache?: { scope: MemoryScope; items: MemoryItem[] },
  ): Promise<MemoryItem | null> {
    const scope = assertValidScope(input.scope);
    const importance = clampImportance(
      input.importance ?? config.defaultImportance,
    );
    const now = new Date().toISOString();

    // Deduplica: un item molto simile viene aggiornato, non duplicato.
    // I candidati sono SOLO item dello stesso tipo: un fatto e una
    // preferenza ben diversi possono essere lessicalmente vicini senza
    // dire la stessa cosa, una preferenza che diventa fatto confonderebbe
    // i significati.
    const existing =
      candidateCache && candidateCache.scope.tenantId === scope.tenantId &&
      candidateCache.scope.agentId === scope.agentId &&
      candidateCache.scope.userId === scope.userId
        ? candidateCache.items
        : await store.list(scope);
    let best: MemoryItem | null = null;
    let bestScore = 0;
    for (const item of existing) {
      if (!compatible(item.embedding, embedding)) continue;
      if (input.type && item.type !== input.type) continue;
      const score = cosineSimilarity(item.embedding, embedding);
      if (score > bestScore) {
        bestScore = score;
        best = item;
      }
    }

    if (best && bestScore >= config.dedupeThreshold) {
      const updated: MemoryItem = {
        ...best,
        content: input.content,
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
      content: input.content,
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
    if (candidateCache) {
      // I successivi item del batch deduplicate anche contro questo: due
      // fatti identici nella stessa estrazione non generano due righe.
      candidateCache.items.push(saved);
    }
    return saved;
  }

  /** Filtro dei segreti, con l'audit in un punto solo. */
  function rejectIfSecret(input: MemoryAddInput, content: string): boolean {
    const scope = assertValidScope(input.scope);
    // I segreti non entrano mai nella memoria, nemmeno se il modello li ha
    // proposti: l'elemento viene scartato. Nell'audit va solo l'ETICHETTA
    // della regola (es. "api key"), mai il testo che ha fatto scattare il
    // sospetto: il valore del segreto non finisce in un log.
    //
    // Gli item `meta` non passano dal filtro: sono libri contabili
    // generati dal sistema (il watermark è conteggio + impronta
    // esadecimale, nessun contenuto utente) — e un digest di 64 caratteri
    // sembrerebbe a ogni regola una credenziale opaca.
    const secrets = input.type === "meta" ? [] : detectSecrets(content);
    if (secrets.length === 0) return false;
    logger("memory_rejected", {
      tenantId: scope.tenantId,
      agentId: scope.agentId,
      userId: scope.userId,
      reason: "secret",
      labels: Array.from(new Set(secrets.map((secret) => secret.label))),
    });
    return true;
  }

  return {
    async add(input: MemoryAddInput): Promise<MemoryItem | null> {
      const scope = assertValidScope(input.scope);
      const content = (input.content ?? "").trim();
      if (!content) return null;
      if (rejectIfSecret(input, content)) return null;
      const embedding = input.embedding ?? (await embed(content));
      return writeWithEmbedding({ ...input, content }, embedding);
    },

    async addMany(
      inputs: MemoryAddInput[],
    ): Promise<(MemoryItem | null)[]> {
      if (inputs.length === 0) return [];

      // Ogni item passa dalle stesse regole dell'`add` singolo: contenuto
      // vuoto o con un segreto → niente; per il resto la scrittura resta
      // quella di sempre.
      const prepared: { input: MemoryAddInput; content: string; embedding: number[] | null }[] = [];
      for (const raw of inputs) {
        const scope = assertValidScope(raw.scope);
        const content = (raw.content ?? "").trim();
        if (!content) {
          prepared.push({ input: raw, content: "", embedding: null });
          continue;
        }
        if (rejectIfSecret(raw, content)) {
          prepared.push({ input: raw, content: "", embedding: null });
          continue;
        }
        prepared.push({ input: { ...raw, content }, content, embedding: null });
      }

      // Un solo round trip per TUTTI gli item da embeddare: gli input che
      // portano già l'embedding (raro) restano quelli.
      const missing = prepared.filter(
        (entry) => entry.content && !entry.input.embedding,
      );
      const vectors =
        missing.length > 0
          ? await embeddings.embed(missing.map((entry) => entry.content))
          : [];
      let vectorIndex = 0;
      for (const entry of prepared) {
        if (!entry.content) continue;
        if (entry.input.embedding) continue;
        entry.embedding = vectors[vectorIndex++] ?? [];
      }

      // Candidati per scope caricati una sola volta per tutto il batch.
      const caches = new Map<string, { scope: MemoryScope; items: MemoryItem[] }>();
      const results: (MemoryItem | null)[] = [];
      for (const entry of prepared) {
        if (!entry.content) {
          results.push(null);
          continue;
        }
        const cacheKey = `${entry.input.scope.tenantId}|${entry.input.scope.agentId}|${entry.input.scope.userId}`;
        if (!caches.has(cacheKey)) {
          const items = await store.list(entry.input.scope);
          caches.set(cacheKey, { scope: entry.input.scope, items });
        }
        const saved = await writeWithEmbedding(
          entry.input,
          entry.input.embedding ?? entry.embedding ?? [],
          caches.get(cacheKey),
        );
        results.push(saved);
      }
      return results;
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
      // Il watermark `meta` resta interno: la retrieval non lo restituisce
      // mai, nemmeno se una ricerca ci cadesse vicino. Gli item con un
      // embedding di dimensioni diverse dalla query appartengono a un altro
      // spazio vettoriale (il provider è cambiato da quando erano salvati):
      // sono esclusi invece di confluire in punteggi senza senso.
      const candidates = (await store.list(scope, { types: options?.types })).filter(
        (item) => item.type !== "meta" && compatible(item.embedding, queryEmbedding),
      );
      const now = Date.now();
      const hits = candidates
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
      logger("memory_retrieval", {
        tenantId: scope.tenantId,
        agentId: scope.agentId,
        userId: scope.userId,
        found: hits.length,
        topScore: Number((hits[0]?.score ?? 0).toFixed(3)),
      });
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
