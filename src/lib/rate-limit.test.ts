import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createAdminClient: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: mocks.createAdminClient,
}));

import { rateLimit, windowStart, RATE_LIMIT_WINDOWS } from "./rate-limit";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("windowStart", () => {
  it("computes the start of the fixed window", () => {
    // 10:00:45 with a 60s window → 10:00:00
    expect(windowStart(10 * 60_000 + 45_000, 60_000)).toBe(10 * 60_000);
    // exact boundary stays in its own window
    expect(windowStart(10 * 60_000, 60_000)).toBe(10 * 60_000);
    // hour window
    expect(windowStart(3_600_000 + 1, RATE_LIMIT_WINDOWS.HOUR_MS)).toBe(
      3_600_000,
    );
  });
});

describe("rateLimit", () => {
  function fakeDb(rpc: (fn: string, args: unknown) => Promise<unknown>) {
    return { rpc: vi.fn(rpc) } as never;
  }

  it("allows requests under the limit", async () => {
    const db = fakeDb(async () => ({ data: 1, error: null }));
    mocks.createAdminClient.mockReturnValue(db);

    const result = await rateLimit("test", "ip-1", {
      limit: 5,
      windowMs: 60_000,
    });
    expect(result).toEqual({ allowed: true, retryAfterSeconds: 0 });
  });

  it("blocks requests above the limit with a retry-after", async () => {
    const db = fakeDb(async () => ({ data: 6, error: null }));
    mocks.createAdminClient.mockReturnValue(db);

    const result = await rateLimit("test", "ip-1", {
      limit: 5,
      windowMs: 60_000,
    });
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
    expect(result.retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  it("fails open when the database is not configured", async () => {
    mocks.createAdminClient.mockReturnValue(null);

    const result = await rateLimit("test", "ip-1", {
      limit: 5,
      windowMs: 60_000,
    });
    expect(result).toEqual({ allowed: true, retryAfterSeconds: 0 });
  });

  it("fails open when the RPC errors", async () => {
    const db = fakeDb(async () => ({ data: null, error: { message: "boom" } }));
    mocks.createAdminClient.mockReturnValue(db);

    const result = await rateLimit("test", "ip-1", {
      limit: 5,
      windowMs: 60_000,
    });
    expect(result).toEqual({ allowed: true, retryAfterSeconds: 0 });
  });
});
