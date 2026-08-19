import { afterEach, describe, expect, it, vi } from "vitest";
import type { LLMChatParams } from "./types";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.restoreAllMocks();
});

function baseParams(overrides?: Partial<LLMChatParams>): LLMChatParams {
  return {
    model: "claude-sonnet-4-20250514",
    system: "You are an assistant.",
    messages: [{ role: "user", content: "Ciao" }],
    tools: [],
    maxTokens: 4096,
    ...overrides,
  };
}

describe("getLLMProvider resolver", () => {
  it("defaults to ollama when no ANTHROPIC_API_KEY is configured", async () => {
    delete process.env.AGENT_LLM_PROVIDER;
    delete process.env.ANTHROPIC_API_KEY;
    const { getLLMProvider } = await import("./index");
    expect(getLLMProvider().name).toBe("ollama");
  });

  it("uses anthropic by default when a valid key is present", async () => {
    delete process.env.AGENT_LLM_PROVIDER;
    process.env.ANTHROPIC_API_KEY = "sk-ant-test-123";
    const { getLLMProvider } = await import("./index");
    expect(getLLMProvider().name).toBe("anthropic");
  });

  it("does not treat a non-sk-ant key as configured", async () => {
    delete process.env.AGENT_LLM_PROVIDER;
    process.env.ANTHROPIC_API_KEY = "not-a-real-key";
    const { getLLMProvider } = await import("./index");
    expect(getLLMProvider().name).toBe("ollama");
  });

  it("honors AGENT_LLM_PROVIDER=anthropic explicitly", async () => {
    process.env.AGENT_LLM_PROVIDER = "anthropic";
    const { getLLMProvider } = await import("./index");
    expect(getLLMProvider().name).toBe("anthropic");
  });

  it("honors AGENT_LLM_PROVIDER=ollama explicitly even with a key", async () => {
    process.env.AGENT_LLM_PROVIDER = "ollama";
    process.env.ANTHROPIC_API_KEY = "sk-ant-test-123";
    const { getLLMProvider } = await import("./index");
    expect(getLLMProvider().name).toBe("ollama");
  });
});

describe("anthropic provider", () => {
  function mockSdk(mockCreate: ReturnType<typeof vi.fn>) {
    vi.doMock("@anthropic-ai/sdk", () => ({
      __esModule: true,
      default: vi.fn().mockImplementation(() => ({
        messages: { create: mockCreate },
      })),
    }));
  }

  it("normalizes a text-only response", async () => {
    vi.resetModules();
    const mockCreate = vi.fn().mockResolvedValue({
      content: [{ type: "text", text: "Ciao!" }],
      stop_reason: "end_turn",
      usage: { input_tokens: 12, output_tokens: 5 },
    });
    mockSdk(mockCreate);

    const { anthropicProvider } = await import("./anthropic");
    const response = await anthropicProvider.chat(baseParams());

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: "You are an assistant.",
      }),
    );
    expect(response.text).toBe("Ciao!");
    expect(response.toolUses).toEqual([]);
    expect(response.stopReason).toBe("end_turn");
    expect(response.usage).toEqual({ inputTokens: 12, outputTokens: 5 });
  });

  it("extracts tool_use blocks", async () => {
    vi.resetModules();
    const mockCreate = vi.fn().mockResolvedValue({
      content: [
        { type: "text", text: "Cerco..." },
        {
          type: "tool_use",
          id: "toolu_1",
          name: "web_search",
          input: { query: "stripe" },
        },
      ],
      stop_reason: "tool_use",
      usage: { input_tokens: 30, output_tokens: 8 },
    });
    mockSdk(mockCreate);

    const { anthropicProvider } = await import("./anthropic");
    const response = await anthropicProvider.chat(baseParams());

    expect(response.text).toBe("Cerco...");
    expect(response.toolUses).toHaveLength(1);
    expect(response.toolUses[0]).toMatchObject({
      id: "toolu_1",
      name: "web_search",
      input: { query: "stripe" },
    });
    expect(response.stopReason).toBe("tool_use");
  });
});

describe("ollama provider", () => {
  it("calls /api/chat and maps the response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        model: "llama3",
        message: { role: "assistant", content: "Risposta locale" },
        prompt_eval_count: 21,
        eval_count: 5,
        done: true,
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { createOllamaProvider } = await import("./ollama");
    const provider = createOllamaProvider({ url: "http://ollama:11434", model: "llama3" });
    const response = await provider.chat(baseParams());

    expect(fetchMock).toHaveBeenCalledWith(
      "http://ollama:11434/api/chat",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"model":"llama3"'),
      }),
    );
    expect(response.text).toBe("Risposta locale");
    expect(response.toolUses).toEqual([]);
    expect(response.stopReason).toBe("end_turn");
    expect(response.usage).toEqual({ inputTokens: 21, outputTokens: 5 });
  });

  it("maps Ollama tool calls into shared toolUses", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: {
          role: "assistant",
          content: "",
          tool_calls: [
            {
              function: {
                name: "web_search",
                arguments: '{"query":"llama3"}',
              },
            },
          ],
        },
        prompt_eval_count: 40,
        eval_count: 12,
        done: false,
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { createOllamaProvider } = await import("./ollama");
    const provider = createOllamaProvider({ url: "http://ollama:11434", model: "llama3" });
    const response = await provider.chat(baseParams());

    expect(response.stopReason).toBe("tool_use");
    expect(response.toolUses).toHaveLength(1);
    expect(response.toolUses[0]).toMatchObject({
      name: "web_search",
      input: { query: "llama3" },
    });
  });

  it("throws on a non-OK upstream response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    });
    vi.stubGlobal("fetch", fetchMock);

    const { createOllamaProvider } = await import("./ollama");
    const provider = createOllamaProvider({ url: "http://ollama:11434", model: "llama3" });
    await expect(provider.chat(baseParams())).rejects.toThrow(
      /Ollama API error: 500/,
    );
  });
});
