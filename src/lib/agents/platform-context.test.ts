import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createAdminClient: vi.fn(),
  createServerClient: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: mocks.createAdminClient,
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createServerClient,
}));

import { buildPlatformSystemPrompt } from "./platform-context";

const ENV_BACKUP = { ...process.env };

beforeEach(() => {
  vi.resetModules();
  process.env = { ...ENV_BACKUP };
  delete process.env.AGENTCLOUD_VERTICAL;
  delete process.env.AGENTCLOUD_FEATURE_FLAGS;
  mocks.createAdminClient.mockReset();
  mocks.createServerClient.mockReset();
});

afterEach(() => {
  process.env = ENV_BACKUP;
});

describe("buildPlatformSystemPrompt", () => {
  it("falls back to the runtime registry when the DB is unavailable", async () => {
    mocks.createAdminClient.mockReturnValue(null);
    mocks.createServerClient.mockResolvedValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: null, error: new Error("no db") }),
          }),
        }),
      }),
    });

    const itPrompt = await buildPlatformSystemPrompt("it");
    expect(itPrompt).toContain("10 agenti AI");
    expect(itPrompt).toContain("Disponibili ora (5)");
    expect(itPrompt).toContain("In arrivo (5)");
    expect(itPrompt).toContain("**Shopify Commerce Agent** (`shopify-agent`)");
    expect(itPrompt).toContain("`seo-agent`");

    const enPrompt = await buildPlatformSystemPrompt("en");
    expect(enPrompt).toContain("10 AI agents");
    expect(enPrompt).toContain("Available now (5)");
    expect(enPrompt).toContain("Coming soon (5)");
  });

  it("uses the database rows when they are available", async () => {
    const rows = [
      { slug: "shopify-agent", name: "Shopify Agent", display_price: "€39/mo" },
      { slug: "seo-agent", name: "SEO Content Agent", display_price: "€39/mo" },
      { slug: "made-up-agent", name: "Made Up", display_price: null },
    ];
    mocks.createAdminClient.mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: rows, error: null }),
          }),
        }),
      }),
    });

    const prompt = await buildPlatformSystemPrompt("en");
    expect(prompt).toContain("3 AI agents");
    expect(prompt).toContain("Available now (1)");
    expect(prompt).toContain("Coming soon (2)");
    expect(prompt).toContain("Made Up");
    expect(prompt).not.toContain("email-manager");
  });

  it("reflects the full vertical (all agents available)", async () => {
    mocks.createAdminClient.mockReturnValue(null);
    mocks.createServerClient.mockResolvedValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: null, error: new Error("no db") }),
          }),
        }),
      }),
    });

    process.env.AGENTCLOUD_VERTICAL = "full";
    const prompt = await buildPlatformSystemPrompt("en");
    expect(prompt).toContain("Available now (10)");
    expect(prompt).toContain("Coming soon (0)");
  });
});