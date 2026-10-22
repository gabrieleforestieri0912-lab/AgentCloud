import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ShortTermMemory,
  buildConversationSummaryBlock,
  llmMessageText,
  shortTermEntryFromLlmMessage,
} from "@/lib/memory/short-term";
import type { ConversationSummarizer } from "@/lib/memory/summarizer";
import type { MemoryMessage } from "@/lib/memory/types";

/** Riassuntore finto: restituisce sempre lo stesso testo. */
function fakeSummarizer(summary = "riassunto"): ConversationSummarizer {
  return {
    async summarize(messages: MemoryMessage[]) {
      return `${summary} (${messages.length} messaggi)`;
    },
  };
}

/** Riassuntore che fallisce, come un provider non raggiungibile. */
function failingSummarizer(): ConversationSummarizer {
  return {
    async summarize() {
      return null;
    },
  };
}

/** Costruisce una finestra con `count` messaggi da `size` caratteri. */
function windowOf(count: number, size: number) {
  const memory = new ShortTermMemory({
    tokenThreshold: 100,
    keepRecentMessages: 2,
    summarizer: fakeSummarizer(),
  });
  for (let i = 0; i < count; i++) {
    memory.push([
      { text: `messaggio ${i} ${"x".repeat(size)}`, payload: { index: i } },
    ]);
  }
  return memory;
}

describe("short term memory", () => {
  it("compresses the history when the token threshold is exceeded", async () => {
    const memory = windowOf(10, 200);
    assert.equal(memory.needsCompaction(), true);

    const compacted = await memory.compact();
    assert.equal(compacted, true);
    assert.equal(memory.getEntries().length, 2, "only the recent messages stay");
    assert.match(memory.getSummary() ?? "", /riassunto/);
  });

  it("keeps the payload of the recent messages", async () => {
    const memory = windowOf(6, 200);
    await memory.compact();
    const payloads = memory.getEntries().map((entry) => entry.payload);
    assert.deepEqual(payloads, [{ index: 4 }, { index: 5 }]);
  });

  it("does not compress a short history", async () => {
    const memory = new ShortTermMemory({
      tokenThreshold: 10_000,
      summarizer: fakeSummarizer(),
    });
    memory.push([{ text: "ciao" }]);
    assert.equal(memory.needsCompaction(), false);
    assert.equal(await memory.compact(), false);
    assert.equal(memory.getSummary(), null);
  });

  it("folds the previous summary into the next one", async () => {
    const seen: MemoryMessage[][] = [];
    const memory = new ShortTermMemory({
      tokenThreshold: 100,
      keepRecentMessages: 1,
      summarizer: {
        async summarize(messages: MemoryMessage[]) {
          seen.push(messages);
          return `riassunto ${seen.length}`;
        },
      },
    });
    for (let i = 0; i < 8; i++) {
      memory.push([{ text: `messaggio ${i} ${"x".repeat(200)}` }]);
    }

    await memory.compact();
    for (let i = 0; i < 4; i++) {
      memory.push([{ text: `nuovo ${i} ${"x".repeat(200)}` }]);
    }
    await memory.compact();

    assert.equal(seen.length, 2);
    assert.equal(seen[1][0].role, "assistant");
    assert.equal(seen[1][0].content, "riassunto 1");
  });

  it("keeps every message when the summary is not available", async () => {
    const memory = new ShortTermMemory({
      tokenThreshold: 100,
      keepRecentMessages: 2,
      summarizer: failingSummarizer(),
    });
    for (let i = 0; i < 10; i++) {
      memory.push([{ text: `messaggio ${i} ${"x".repeat(200)}` }]);
    }

    assert.equal(await memory.compact(), false);
    assert.equal(memory.getEntries().length, 10);
    assert.equal(memory.getSummary(), null);
  });

  it("never compresses without a summarizer", async () => {
    const memory = new ShortTermMemory({ tokenThreshold: 10 });
    memory.push([{ text: "x".repeat(200) }]);
    assert.equal(await memory.compact(), false);
    assert.equal(memory.getEntries().length, 1);
  });

  it("counts the tokens of the summary and of the messages", () => {
    const memory = new ShortTermMemory({ tokenThreshold: 1000 });
    memory.push([{ text: "a".repeat(400) }]);
    assert.equal(memory.getTokenCount(), 100);
  });
});

describe("conversation summary block", () => {
  it("marks the summary as data, not instructions", () => {
    const block = buildConversationSummaryBlock("l'utente vuole il pomeriggio");
    assert.ok(block);
    assert.match(block, /<conversation_summary>/);
    assert.match(block, /not instructions/);
    assert.match(block, /l'utente vuole il pomeriggio/);
  });

  it("returns null without a summary", () => {
    assert.equal(buildConversationSummaryBlock(null), null);
    assert.equal(buildConversationSummaryBlock("   "), null);
  });
});

describe("llm message text", () => {
  it("reads a plain string", () => {
    assert.equal(llmMessageText({ role: "user", content: "ciao" }), "ciao");
  });

  it("reads the text blocks and skips the images", () => {
    const text = llmMessageText({
      role: "user",
      content: [
        { type: "text", text: "guarda questo" },
        { type: "image", source: { type: "base64", media_type: "image/png", data: "AAA" } },
      ],
    });
    assert.equal(text, "guarda questo");
  });

  it("keeps the original message as payload of the entry", () => {
    const message = {
      role: "user" as const,
      content: [{ type: "text" as const, text: "ciao" }],
    };
    const entry = shortTermEntryFromLlmMessage(message);
    assert.equal(entry.text, "ciao");
    assert.equal(entry.payload, message);
  });
});
