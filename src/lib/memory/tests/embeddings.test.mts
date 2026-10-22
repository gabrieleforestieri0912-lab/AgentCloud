import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createLocalEmbeddingProvider,
  embedLocally,
  normalizeText,
} from "@/lib/memory/embeddings";
import {
  cosineSimilarity,
  estimateTokens,
  scoreMemoryItem,
} from "@/lib/memory/similarity";
import type { MemoryItem } from "@/lib/memory/types";

/** Builds a memory item for the tests. */
function makeItem(overrides: Partial<MemoryItem> = {}): MemoryItem {
  const now = new Date().toISOString();
  return {
    id: "item-1",
    tenantId: "tenant-a",
    agentId: "agent-1",
    userId: "user-1",
    type: "fact",
    content: "contenuto",
    embedding: null,
    importance: 0.7,
    createdAt: now,
    lastAccessedAt: now,
    expiresAt: null,
    sourceConversationId: null,
    ...overrides,
  };
}

describe("local embeddings", () => {
  it("is deterministic", () => {
    const first = embedLocally("preferisco essere contattato il pomeriggio");
    const second = embedLocally("preferisco essere contattato il pomeriggio");
    assert.deepEqual(first, second);
  });

  it("normalizes accents and punctuation", () => {
    assert.equal(normalizeText("Perché no? Così: città, però!"), "perche no cosi citta pero");
  });

  it("gives a higher similarity to the matching text", async () => {
    const provider = createLocalEmbeddingProvider();
    const [query, related, unrelated] = await provider.embed([
      "quando devo essere contattato?",
      "l'utente preferisce essere contattato il pomeriggio",
      "il fatturato del terzo trimestre è cresciuto",
    ]);
    assert.ok(
      cosineSimilarity(query, related) > cosineSimilarity(query, unrelated),
      "the related text must be closer than the unrelated one",
    );
  });

  it("produces vectors of the declared length", async () => {
    const provider = createLocalEmbeddingProvider();
    const [vector] = await provider.embed(["ciao"]);
    assert.equal(vector.length, provider.dimensions);
  });
});

describe("scoring", () => {
  it("estimates the tokens", () => {
    assert.equal(estimateTokens(""), 0);
    assert.equal(estimateTokens("abcd"), 1);
    assert.equal(estimateTokens("a".repeat(400)), 100);
  });

  it("prefers a fresh and relevant item over an old one", () => {
    const query = embedLocally("pomeriggio");
    const fresh = makeItem({
      embedding: embedLocally("preferisco il pomeriggio"),
      lastAccessedAt: new Date().toISOString(),
    });
    const old = makeItem({
      embedding: embedLocally("preferisco il pomeriggio"),
      lastAccessedAt: new Date(Date.now() - 180 * 86_400_000).toISOString(),
    });
    assert.ok(scoreMemoryItem(fresh, query) > scoreMemoryItem(old, query));
  });

  it("returns zero similarity for vectors of different length", () => {
    assert.equal(cosineSimilarity([1, 2], [1]), 0);
  });
});
