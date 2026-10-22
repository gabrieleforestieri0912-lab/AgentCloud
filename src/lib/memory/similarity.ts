/**
 * Similarity and size helpers of the memory.
 *
 * The retrieval blends two signals:
 *
 *  - the semantic similarity between the query and the item (cosine of the
 *    embeddings);
 *  - the recency of the item: a fact remembered yesterday is more useful
 *    than the same fact remembered last month.
 */

import type { MemoryItem } from "./types";

/** Cosine similarity between two vectors. Returns 0 for degenerate inputs. */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Rough estimate of the token count of a text.
 *
 * Four characters per token is the usual rule of thumb for the OpenAI
 * families; it is only used to keep the injected memory inside its budget,
 * so an approximation is enough (and costs nothing).
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/** Weight of the recency in the final score. */
export const RECENCY_WEIGHT = 0.35;

/** Half-life of the recency signal, in days. */
export const RECENCY_HALF_LIFE_DAYS = 30;

/**
 * Recency score in [0, 1]: 1 for an item touched now, decaying with a
 * half-life of `RECENCY_HALF_LIFE_DAYS`.
 */
export function recencyScore(
  lastAccessedAt: string,
  now: number = Date.now(),
): number {
  const timestamp = Date.parse(lastAccessedAt);
  if (Number.isNaN(timestamp)) return 0;
  const ageDays = Math.max(0, (now - timestamp) / 86_400_000);
  return Math.pow(0.5, ageDays / RECENCY_HALF_LIFE_DAYS);
}

/**
 * Final score of a memory item against a query.
 *
 * `importance` also weighs: a critical fact (a deadline, a hard preference)
 * must win over a trivial remark.
 */
export function scoreMemoryItem(
  item: MemoryItem,
  queryEmbedding: number[] | null,
  now: number = Date.now(),
): number {
  const similarity = item.embedding && queryEmbedding
    ? Math.max(0, cosineSimilarity(item.embedding, queryEmbedding))
    : 0;
  const recency = recencyScore(item.lastAccessedAt, now);
  const relevance = similarity * (1 - RECENCY_WEIGHT);
  const recencyPart = recency * RECENCY_WEIGHT;
  return relevance + recencyPart * (0.5 + 0.5 * item.importance);
}
