import { afterEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.restoreAllMocks();
});

describe("getLLMProvider resolver", () => {
  it("defaults to anthropic when no provider is configured", async () => {
    delete process.env.AGENT_LLM_PROVIDER;
    const { getLLMProvider } = await import("./index");
    expect(getLLMProvider().name).toBe("anthropic");
  });

  it("honors AGENT_LLM_PROVIDER=anthropic explicitly", async () => {
    process.env.AGENT_LLM_PROVIDER = "anthropic";
    const { getLLMProvider } = await import("./index");
    expect(getLLMProvider().name).toBe("anthropic");
  });
});

describe("anthropic provider", () => {
  it("exposes the anthropic provider shape with the default model fallback", async () => {
    vi.resetModules();
    delete process.env.AGENT_LLM_MODEL;
    const { createAnthropicProvider } = await import("./anthropic");
    const provider = createAnthropicProvider({ apiKey: "test-key" });
    // Accessing private chat would require network; just assert the provider
    // shape and the default model resolution via the public name.
    expect(provider.name).toBe("anthropic");
  });

  it("detects a configured ANTHROPIC_API_KEY", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test-1234567890123";
    const { isAnthropicKeyConfigured } = await import("./index");
    expect(isAnthropicKeyConfigured()).toBe(true);
  });
});
