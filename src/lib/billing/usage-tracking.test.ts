/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createAdminClient: vi.fn(),
  createClient: vi.fn(),
}));

const overageMocks = vi.hoisted(() => ({
  isOverageBillingEnabled: vi.fn(),
  getOrCreateMeterItem: vi.fn(),
  reportOverageUsage: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: mocks.createAdminClient,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

vi.mock("@/lib/stripe/overage", () => ({
  isOverageBillingEnabled: overageMocks.isOverageBillingEnabled,
  getOrCreateMeterItem: overageMocks.getOrCreateMeterItem,
  reportOverageUsage: overageMocks.reportOverageUsage,
}));

import { DEFAULT_TOKEN_LIMIT } from "./pricing";
import {
  assertRunAllowed,
  getUserAgent,
  hasExceededLimit,
  recordUsage,
  recordUsageAndReportOverage,
  resolveTokenLimit,
} from "./usage-tracking";

/**
 * Build a fluent fake for `db.from(table)...` chains.
 * - `agent_runs` head queries resolve to `{ count }`
 * - `agent_runs` select queries resolve to `{ data: runs }`
 * - `user_agents` terminal queries resolve to `{ data: userAgent }`
 * - `insert`/`update` resolve to `{ error: insertError }`
 */
function createFakeDb(options: {
  userAgent?: unknown;
  runsCount?: number;
  runs?: unknown[];
  insertError?: unknown;
} = {}) {
  const chains: Record<string, any> = {};
  const from = vi.fn((table: string) => {
    if (chains[table]) return chains[table];
    const state = { head: false };
    const chain: any = {};
    chain.select = vi.fn((_cols?: unknown, opts?: { head?: boolean }) => {
      state.head = opts?.head === true;
      return chain;
    });
    chain.eq = vi.fn(() => chain);
    chain.gte = vi.fn(() => chain);
    chain.lte = vi.fn(() => chain);
    chain.order = vi.fn(() => chain);
    chain.then = (resolve: (value: unknown) => void) => {
      if (table === "agent_runs") {
        resolve(
          state.head
            ? { count: options.runsCount ?? 0, error: null }
            : { data: options.runs ?? [], error: null },
        );
      } else {
        resolve({ data: options.userAgent ?? null, error: null });
      }
      return chain;
    };
    chain.maybeSingle = vi.fn(async () => ({
      data: options.userAgent ?? null,
      error: null,
    }));
    chain.single = vi.fn(async () => ({
      data: options.userAgent ?? null,
      error: null,
    }));
    chain.insert = vi.fn(async () => ({
      error: options.insertError ?? null,
    }));
    chain.update = vi.fn(async () => ({ error: null }));
    chains[table] = chain;
    return chain;
  });

  return { from, chains, db: { from } as any };
}

function activeAgent(overrides: Record<string, unknown> = {}) {
  return {
    id: "ua",
    user_id: "u",
    agent_slug: "a",
    status: "active",
    config: {},
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  overageMocks.isOverageBillingEnabled.mockReturnValue(false);
  overageMocks.getOrCreateMeterItem.mockResolvedValue("si_meter");
  overageMocks.reportOverageUsage.mockResolvedValue(true);
});

describe("getUserAgent", () => {
  it("returns a normalized record when the user owns the agent", async () => {
    const { db } = createFakeDb({
      userAgent: activeAgent({ config: { tokenLimit: 1_000_000 } }),
    });
    mocks.createAdminClient.mockReturnValue(db);

    const record = await getUserAgent("user_1", "seo-agent");
    expect(record?.status).toBe("active");
    expect(record?.config.tokenLimit).toBe(1_000_000);
  });

  it("returns null when the user does not own the agent", async () => {
    const { db } = createFakeDb({ userAgent: null });
    mocks.createAdminClient.mockReturnValue(db);

    expect(await getUserAgent("user_1", "seo-agent")).toBeNull();
  });
});

describe("assertRunAllowed", () => {
  it("allows anonymous callers without any checks", async () => {
    const result = await assertRunAllowed("anonymous", "seo-agent");
    expect(result).toEqual({ allowed: true, overage: false });
  });

  it("blocks users who do not own the agent", async () => {
    const { db } = createFakeDb({ userAgent: null });
    mocks.createAdminClient.mockReturnValue(db);

    const result = await assertRunAllowed("user_1", "seo-agent");
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.code).toBe("NOT_SUBSCRIBED");
      expect(result.status).toBe(402);
    }
  });

  it("blocks users with an inactive subscription", async () => {
    const { db } = createFakeDb({
      userAgent: activeAgent({ status: "canceled" }),
    });
    mocks.createAdminClient.mockReturnValue(db);

    const result = await assertRunAllowed("user_1", "seo-agent");
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.code).toBe("SUBSCRIPTION_INACTIVE");
      expect(result.status).toBe(402);
    }
  });

  it("blocks users who hit the monthly token allowance when overage is off", async () => {
    // No stripe_subscription_id → overage billing unavailable → hard 429.
    const { db } = createFakeDb({
      userAgent: activeAgent({ config: { tokenLimit: 10 } }),
      runs: [{ input_tokens: 6, output_tokens: 4 }],
    });
    mocks.createAdminClient.mockReturnValue(db);

    const result = await assertRunAllowed("user_1", "seo-agent");
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.code).toBe("LIMIT_EXCEEDED");
      expect(result.status).toBe(429);
    }
    expect(overageMocks.isOverageBillingEnabled).not.toHaveBeenCalled();
  });

  it("allows over-limit users when overage billing is configured", async () => {
    overageMocks.isOverageBillingEnabled.mockReturnValue(true);
    const { db } = createFakeDb({
      userAgent: activeAgent({
        config: { tokenLimit: 10 },
        stripe_subscription_id: "sub_1",
        stripe_customer_id: "cus_1",
      }),
      runs: [{ input_tokens: 10, output_tokens: 0 }],
    });
    mocks.createAdminClient.mockReturnValue(db);

    const result = await assertRunAllowed("user_1", "seo-agent");
    expect(result).toEqual({ allowed: true, overage: true });
  });

  it("blocks at the 2x safety cap even when overage billing is on", async () => {
    overageMocks.isOverageBillingEnabled.mockReturnValue(true);
    const { db } = createFakeDb({
      userAgent: activeAgent({
        config: { tokenLimit: 100 },
        stripe_subscription_id: "sub_1",
        stripe_customer_id: "cus_1",
      }),
      runs: [{ input_tokens: 200, output_tokens: 50 }],
    });
    mocks.createAdminClient.mockReturnValue(db);

    const result = await assertRunAllowed("user_1", "seo-agent");
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.code).toBe("OVERAGE_CAP_REACHED");
      expect(result.status).toBe(429);
    }
  });

  it("allows active users below the token allowance", async () => {
    const { db } = createFakeDb({
      userAgent: activeAgent({ config: { tokenLimit: 100 } }),
      runs: [{ input_tokens: 10, output_tokens: 5 }],
    });
    mocks.createAdminClient.mockReturnValue(db);

    const result = await assertRunAllowed("user_1", "seo-agent");
    expect(result).toEqual({ allowed: true, overage: false });
  });

  it("falls back to the default token allowance when config has none", async () => {
    const { db } = createFakeDb({
      userAgent: activeAgent(),
      runs: [{ input_tokens: 200_000, output_tokens: 100_000 }],
    });
    mocks.createAdminClient.mockReturnValue(db);

    const result = await assertRunAllowed("user_1", "seo-agent");
    expect(result.allowed).toBe(false);
  });

  it("maps legacy conversation limits to token allowances", () => {
    expect(resolveTokenLimit({ conversationLimit: 300 })).toBe(300_000);
    expect(resolveTokenLimit({ conversationLimit: 1000 })).toBe(1_000_000);
    expect(resolveTokenLimit({ tokenLimit: 500_000 })).toBe(500_000);
    expect(resolveTokenLimit({})).toBe(DEFAULT_TOKEN_LIMIT);
  });
});

describe("hasExceededLimit", () => {
  it("is false when the user is under the limit", async () => {
    const { db } = createFakeDb({
      userAgent: activeAgent(),
      runsCount: 10,
    });
    mocks.createAdminClient.mockReturnValue(db);

    expect(await hasExceededLimit("user_1", "seo-agent")).toBe(false);
  });

  it("is true at/over the token allowance", async () => {
    const { db } = createFakeDb({
      userAgent: activeAgent(),
      runs: [{ input_tokens: 200_000, output_tokens: 100_000 }],
    });
    mocks.createAdminClient.mockReturnValue(db);

    expect(await hasExceededLimit("user_1", "seo-agent")).toBe(true);
  });
});

describe("recordUsage", () => {
  it("records a run with token counts", async () => {
    const { chains, db } = createFakeDb({
      userAgent: activeAgent({ id: "ua-1", config: {} }),
    });
    mocks.createAdminClient.mockReturnValue(db);

    await recordUsage({
      user_id: "user_1",
      agent_slug: "seo-agent",
      conversation_id: "conv-1",
      tokens_input: 100,
      tokens_output: 50,
    });

    expect(chains["agent_runs"].insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user_1",
        agent_slug: "seo-agent",
        conversation_id: "conv-1",
        user_agent_id: "ua-1",
        input_tokens: 100,
        output_tokens: 50,
        status: "completed",
      }),
    );
  });

  it("does not resolve a user_agent for anonymous runs", async () => {
    const { chains, db } = createFakeDb({});
    mocks.createAdminClient.mockReturnValue(db);

    await recordUsage({
      user_id: "anonymous",
      agent_slug: "seo-agent",
      tokens_input: 1,
      tokens_output: 1,
    });

    expect(chains["agent_runs"].insert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "anonymous", user_agent_id: null }),
    );
  });
});

describe("recordUsageAndReportOverage", () => {
  const run = {
    user_id: "user_1",
    agent_slug: "seo-agent",
    conversation_id: "conv-1",
    tokens_input: 30,
    tokens_output: 20,
  };

  it("only records when the user has no subscription", async () => {
    const { chains, db } = createFakeDb({
      userAgent: activeAgent(),
    });
    mocks.createAdminClient.mockReturnValue(db);

    await recordUsageAndReportOverage(run);

    expect(chains["agent_runs"].insert).toHaveBeenCalledTimes(1);
    expect(overageMocks.getOrCreateMeterItem).not.toHaveBeenCalled();
    expect(overageMocks.reportOverageUsage).not.toHaveBeenCalled();
  });

  it("only records when overage billing is not configured", async () => {
    const { chains, db } = createFakeDb({
      userAgent: activeAgent({
        stripe_subscription_id: "sub_1",
        stripe_customer_id: "cus_1",
      }),
    });
    mocks.createAdminClient.mockReturnValue(db);

    await recordUsageAndReportOverage(run);

    expect(chains["agent_runs"].insert).toHaveBeenCalledTimes(1);
    expect(overageMocks.getOrCreateMeterItem).not.toHaveBeenCalled();
    expect(overageMocks.reportOverageUsage).not.toHaveBeenCalled();
  });

  it("only records when the user has no Stripe customer id", async () => {
    const { chains, db } = createFakeDb({
      userAgent: activeAgent({ stripe_subscription_id: "sub_1" }),
    });
    mocks.createAdminClient.mockReturnValue(db);

    await recordUsageAndReportOverage(run);

    expect(chains["agent_runs"].insert).toHaveBeenCalledTimes(1);
    expect(overageMocks.getOrCreateMeterItem).not.toHaveBeenCalled();
    expect(overageMocks.reportOverageUsage).not.toHaveBeenCalled();
  });

  it("does not report when the run stays under the allowance", async () => {
    overageMocks.isOverageBillingEnabled.mockReturnValue(true);
    const { chains, db } = createFakeDb({
      userAgent: activeAgent({
        config: { tokenLimit: 100 },
        stripe_subscription_id: "sub_1",
        stripe_customer_id: "cus_1",
      }),
      runs: [{ input_tokens: 40, output_tokens: 20 }], // usedBefore = 60
    });
    mocks.createAdminClient.mockReturnValue(db);

    await recordUsageAndReportOverage(run); // run = 50 tokens → 110 total

    expect(chains["agent_runs"].insert).toHaveBeenCalledTimes(1);
    expect(overageMocks.getOrCreateMeterItem).toHaveBeenCalledWith("sub_1");
    expect(overageMocks.reportOverageUsage).toHaveBeenCalledWith({
      stripeCustomerId: "cus_1",
      overageTokens: 10, // only the increment above the 100-token allowance
      idempotencyKey: "conv-1",
    });
  });

  it("reports the full run tokens when already over the allowance", async () => {
    overageMocks.isOverageBillingEnabled.mockReturnValue(true);
    const { chains, db } = createFakeDb({
      userAgent: activeAgent({
        config: { tokenLimit: 100 },
        stripe_subscription_id: "sub_1",
        stripe_customer_id: "cus_1",
      }),
      runs: [{ input_tokens: 100, output_tokens: 20 }], // usedBefore = 120
    });
    mocks.createAdminClient.mockReturnValue(db);

    await recordUsageAndReportOverage(run); // run = 50 tokens, all over

    expect(chains["agent_runs"].insert).toHaveBeenCalledTimes(1);
    expect(overageMocks.reportOverageUsage).toHaveBeenCalledWith({
      stripeCustomerId: "cus_1",
      overageTokens: 50,
      idempotencyKey: "conv-1",
    });
  });

  it("skips reporting when the meter cannot be attached", async () => {
    overageMocks.isOverageBillingEnabled.mockReturnValue(true);
    overageMocks.getOrCreateMeterItem.mockResolvedValue(null);
    const { db } = createFakeDb({
      userAgent: activeAgent({
        config: { tokenLimit: 100 },
        stripe_subscription_id: "sub_1",
        stripe_customer_id: "cus_1",
      }),
      runs: [{ input_tokens: 150, output_tokens: 0 }],
    });
    mocks.createAdminClient.mockReturnValue(db);

    await recordUsageAndReportOverage(run);

    expect(overageMocks.reportOverageUsage).not.toHaveBeenCalled();
  });

  it("reuses the meter item stored in config without hitting Stripe", async () => {
    overageMocks.isOverageBillingEnabled.mockReturnValue(true);
    const { db } = createFakeDb({
      userAgent: activeAgent({
        config: { tokenLimit: 100, stripeSubscriptionItemId: "si_1" },
        stripe_subscription_id: "sub_1",
        stripe_customer_id: "cus_1",
      }),
      runs: [{ input_tokens: 150, output_tokens: 0 }],
    });
    mocks.createAdminClient.mockReturnValue(db);

    await recordUsageAndReportOverage(run);

    expect(overageMocks.getOrCreateMeterItem).not.toHaveBeenCalled();
    expect(overageMocks.reportOverageUsage).toHaveBeenCalledWith({
      stripeCustomerId: "cus_1",
      overageTokens: 50,
      idempotencyKey: "conv-1",
    });
  });
});
