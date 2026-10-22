import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { defaultMemoryConfig } from "@/lib/memory/config";
import { createLocalEmbeddingProvider } from "@/lib/memory/embeddings";
import { ingestConversationMemory } from "@/lib/memory/ingest";
import { createMemoryService } from "@/lib/memory/service";
import { createScope } from "@/lib/memory/scope";
import { createInMemoryMemoryStore } from "@/lib/memory/store";
import type { MemoryExtractor } from "@/lib/memory/extraction";

const scope = createScope("tenant-a", "agent-1", "user-1");

/** Service con store in memoria ed embedding locali. */
function makeService() {
  return createMemoryService({
    store: createInMemoryMemoryStore(),
    config: defaultMemoryConfig(),
    embeddings: createLocalEmbeddingProvider(),
    logger: () => {},
  });
}

/** Estrattore finto che restituisce i fatti indicati. */
function fakeExtractor(facts: { content: string; type?: "fact" | "preference"; importance?: number }[]): MemoryExtractor {
  return {
    async extract() {
      return facts.map((fact) => ({
        content: fact.content,
        type: fact.type ?? "fact",
        importance: fact.importance ?? 0.5,
      }));
    },
  };
}

describe("memory ingestion", () => {
  it("stores the extracted facts", async () => {
    const service = makeService();
    const result = await ingestConversationMemory({
      service,
      extractor: fakeExtractor([
        { content: "Preferisce essere contattato il pomeriggio", type: "preference", importance: 0.9 },
      ]),
      scope,
      minUserChars: 10,
      messages: [
        {
          role: "user",
          content:
            "preferisco essere contattato il pomeriggio, non prima delle 15 e non nei weekend, e per i preventivi basta un'email",
        },
        { role: "assistant", content: "Va bene." },
      ],
    });
    assert.equal(result.extracted, 1);
    assert.equal(result.stored, 1);
    assert.equal((await service.list(scope)).length, 1);
  });

  it("ignores a too short conversation", async () => {
    const service = makeService();
    const result = await ingestConversationMemory({
      service,
      extractor: fakeExtractor([{ content: "qualcosa" }]),
      scope,
      messages: [{ role: "user", content: "ciao" }],
    });
    assert.equal(result.extracted, 0);
    assert.equal((await service.list(scope)).length, 0);
  });

  it("counts the facts rejected because of a secret", async () => {
    const service = makeService();
    const result = await ingestConversationMemory({
      service,
      extractor: fakeExtractor([
        { content: "Preferisce il pomeriggio" },
        { content: "la sua API key è sk-abcdefghijklmnopqrstuvwx" },
      ]),
      scope,
      minUserChars: 10,
      messages: [
        {
          role: "user",
          content:
            "preferisco essere contattato il pomeriggio, e ti lascio la chiave API così puoi collegare il gestionale e gestire i preventivi",
        },
      ],
    });
    assert.equal(result.extracted, 2);
    assert.equal(result.stored, 1);
    assert.equal(result.rejected, 1);
  });

  it("survives a failing extractor", async () => {
    const service = makeService();
    const result = await ingestConversationMemory({
      service,
      extractor: {
        async extract() {
          throw new Error("boom");
        },
      },
      scope,
      messages: [{ role: "user", content: "una conversazione abbastanza lunga da superare la soglia minima di caratteri" }],
    });
    assert.equal(result.stored, 0);
  });

  it("does nothing without an extractor", async () => {
    const service = makeService();
    const result = await ingestConversationMemory({
      service,
      extractor: null,
      scope,
      messages: [{ role: "user", content: "una conversazione abbastanza lunga da superare la soglia minima di caratteri" }],
    });
    assert.equal(result.extracted, 0);
  });

  it("does nothing with an invalid scope", async () => {
    const service = makeService();
    const result = await ingestConversationMemory({
      service,
      extractor: fakeExtractor([{ content: "qualcosa" }]),
      scope: createScope("tenant-a", "agent-1", ""),
      messages: [{ role: "user", content: "una conversazione abbastanza lunga da superare la soglia minima di caratteri" }],
    });
    assert.equal(result.extracted, 0);
  });
});
