import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createInMemoryMemoryStore } from "@/lib/memory/store";
import { createScope } from "@/lib/memory/scope";
import type { MemoryItem } from "@/lib/memory/types";

/** Builds a memory item for the tests. */
function makeItem(overrides: Partial<MemoryItem> = {}): MemoryItem {
  const now = new Date().toISOString();
  return {
    id: overrides.id ?? crypto.randomUUID(),
    tenantId: overrides.tenantId ?? "tenant-a",
    agentId: overrides.agentId ?? "agent-1",
    userId: overrides.userId ?? "user-1",
    type: overrides.type ?? "fact",
    content: overrides.content ?? "L'utente preferisce essere contattato il pomeriggio.",
    embedding: overrides.embedding ?? null,
    importance: overrides.importance ?? 0.7,
    createdAt: overrides.createdAt ?? now,
    lastAccessedAt: overrides.lastAccessedAt ?? now,
    expiresAt: overrides.expiresAt ?? null,
    sourceConversationId: overrides.sourceConversationId ?? null,
  };
}

describe("memory store", () => {
  it("keeps the memory of two tenants separated", async () => {
    const store = createInMemoryMemoryStore();
    const tenantA = createScope("tenant-a", "agent-1", "user-1");
    const tenantB = createScope("tenant-b", "agent-1", "user-1");

    await store.insert(makeItem({ tenantId: "tenant-a", content: "segreto di A" }));
    await store.insert(makeItem({ tenantId: "tenant-b", content: "segreto di B" }));

    const listA = await store.list(tenantA);
    assert.equal(listA.length, 1);
    assert.equal(listA[0].content, "segreto di A");

    const listB = await store.list(tenantB);
    assert.equal(listB.length, 1);
    assert.equal(listB[0].content, "segreto di B");
  });

  it("keeps the memory of two agents of the same tenant separated", async () => {
    const store = createInMemoryMemoryStore();
    const agentOne = createScope("tenant-a", "agent-1", "user-1");
    const agentTwo = createScope("tenant-a", "agent-2", "user-1");

    await store.insert(makeItem({ agentId: "agent-1", content: "memo per agent 1" }));
    await store.insert(makeItem({ agentId: "agent-2", content: "memo per agent 2" }));

    assert.equal((await store.list(agentOne)).length, 1);
    assert.equal((await store.list(agentTwo)).length, 1);
    assert.equal((await store.list(agentOne))[0].content, "memo per agent 1");
  });

  it("does not find an item of another scope by id", async () => {
    const store = createInMemoryMemoryStore();
    const owner = createScope("tenant-a", "agent-1", "user-1");
    const other = createScope("tenant-b", "agent-1", "user-1");

    const item = makeItem({ tenantId: "tenant-a" });
    await store.insert(item);

    assert.equal(await store.get(other, item.id), null);
    assert.equal(await store.delete(other, item.id), false);
    assert.equal((await store.list(owner)).length, 1);
  });

  it("hides the expired items from the list", async () => {
    const store = createInMemoryMemoryStore();
    const scope = createScope("tenant-a", "agent-1", "user-1");

    await store.insert(makeItem({ id: "expired", expiresAt: new Date(Date.now() - 1000).toISOString() }));
    await store.insert(makeItem({ id: "alive", expiresAt: new Date(Date.now() + 60_000).toISOString() }));

    const alive = await store.list(scope);
    assert.equal(alive.length, 1);
    assert.equal(alive[0].id, "alive");

    const all = await store.list(scope, { includeExpired: true });
    assert.equal(all.length, 2);
  });

  it("filters the list by type", async () => {
    const store = createInMemoryMemoryStore();
    const scope = createScope("tenant-a", "agent-1", "user-1");

    await store.insert(makeItem({ type: "fact" }));
    await store.insert(makeItem({ type: "preference" }));

    const facts = await store.list(scope, { types: ["fact"] });
    assert.equal(facts.length, 1);
    assert.equal(facts[0].type, "fact");
  });

  it("refuses an incomplete scope", async () => {
    const store = createInMemoryMemoryStore();
    await assert.rejects(() =>
      store.list(createScope("tenant-a", "agent-1", "")),
    );
  });
});
