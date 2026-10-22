import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { defaultMemoryConfig } from "@/lib/memory/config";
import { createLocalEmbeddingProvider } from "@/lib/memory/embeddings";
import { createMemoryService } from "@/lib/memory/service";
import { createScope } from "@/lib/memory/scope";
import { createInMemoryMemoryStore } from "@/lib/memory/store";

/** Service con store in memoria ed embedding locali. */
function makeService() {
  return createMemoryService({
    store: createInMemoryMemoryStore(),
    config: defaultMemoryConfig(),
    embeddings: createLocalEmbeddingProvider(),
    logger: () => {},
  });
}

/** Scope di un utente autenticato. */
const scope = createScope("tenant-a", "agent-1", "user-1");

describe("memory service", () => {
  it("stores an item with embedding, importance and expiry", async () => {
    const service = makeService();
    const item = await service.add({
      scope,
      type: "preference",
      content: "Preferisce essere contattato il pomeriggio",
      importance: 0.8,
    });
    assert.ok(item);
    assert.equal(item.type, "preference");
    assert.equal(item.importance, 0.8);
    assert.ok(item.embedding && item.embedding.length > 0);
    assert.ok(item.expiresAt, "an item expires");
    assert.equal(item.tenantId, "tenant-a");
    assert.equal(item.agentId, "agent-1");
    assert.equal(item.userId, "user-1");
  });

  it("never stores a secret", async () => {
    const service = makeService();
    const item = await service.add({
      scope,
      type: "fact",
      content: "la mia password: superSegreta123",
    });
    assert.equal(item, null);
    assert.equal((await service.list(scope)).length, 0);
  });

  it("updates an existing item instead of duplicating it", async () => {
    const service = makeService();
    const first = await service.add({
      scope,
      type: "preference",
      content: "Preferisce essere contattato il pomeriggio",
      importance: 0.6,
    });
    const second = await service.add({
      scope,
      type: "preference",
      content: "Preferisce essere contattato il pomeriggio",
      importance: 0.9,
    });
    assert.ok(first && second);
    assert.equal(first.id, second.id, "the same item is updated");
    assert.equal(second.importance, 0.9, "the importance grows");
    assert.equal((await service.list(scope)).length, 1);
  });

  it("keeps different facts apart", async () => {
    const service = makeService();
    await service.add({ scope, type: "fact", content: "Il cliente si chiama Acme" });
    await service.add({ scope, type: "fact", content: "Il fatturato del terzo trimestre è cresciuto" });
    assert.equal((await service.list(scope)).length, 2);
  });

  it("searches the memory of the scope and nothing else", async () => {
    const service = makeService();
    await service.add({ scope, type: "preference", content: "Preferisce essere contattato il pomeriggio" });
    await service.add({
      scope: createScope("tenant-b", "agent-1", "user-1"),
      type: "preference",
      content: "Prefers to be contacted in the afternoon",
    });
    await service.add({
      scope: createScope("tenant-a", "agent-2", "user-1"),
      type: "preference",
      content: "Prefers to be contacted in the afternoon",
    });

    const hits = await service.search(scope, "quando devo contattarlo?");
    assert.equal(hits.length, 1);
    assert.match(hits[0].item.content, /pomeriggio/);
  });

  it("updates the last access of the retrieved items", async () => {
    const service = makeService();
    const item = await service.add({ scope, type: "fact", content: "Il cliente si chiama Acme" });
    assert.ok(item);
    const before = item.lastAccessedAt;
    await new Promise((resolve) => setTimeout(resolve, 5));
    await service.search(scope, "Acme");
    const after = (await service.list(scope))[0];
    assert.notEqual(after.lastAccessedAt, before);
  });

  it("deletes one item and only in its own scope", async () => {
    const service = makeService();
    const item = await service.add({ scope, type: "fact", content: "Il cliente si chiama Acme" });
    assert.ok(item);

    const otherScope = createScope("tenant-b", "agent-1", "user-1");
    assert.equal(await service.delete(otherScope, item.id), false);
    assert.equal((await service.list(scope)).length, 1);

    assert.equal(await service.delete(scope, item.id), true);
    assert.equal((await service.list(scope)).length, 0);
  });

  it("deletes all the memory of a subject", async () => {
    const service = makeService();
    await service.add({ scope, type: "fact", content: "Il cliente si chiama Acme" });
    await service.add({ scope, type: "preference", content: "Prefers the afternoon" });
    assert.equal(await service.deleteAll(scope), 2);
    assert.equal((await service.list(scope)).length, 0);
  });

  it("exports the memory of a subject, expired items included", async () => {
    const service = makeService();
    await service.add({
      scope,
      type: "fact",
      content: "Il cliente si chiama Acme",
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    });
    assert.equal((await service.list(scope)).length, 0);
    assert.equal((await service.export(scope)).length, 1);
  });

  it("returns no summary without a summarizer", async () => {
    const service = makeService();
    assert.equal(await service.summarize([{ role: "user", content: "ciao" }]), null);
  });
});
