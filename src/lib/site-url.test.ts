import { afterEach, describe, expect, it, vi } from "vitest";
import { getSiteUrl } from "./site-url";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getSiteUrl", () => {
  it("prefers NEXT_PUBLIC_SITE_URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://app.example.com");
    vi.stubEnv("NEXT_PUBLIC_URL", "https://legacy.example.com");
    expect(getSiteUrl()).toBe("https://app.example.com");
  });

  it("falls back to NEXT_PUBLIC_URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_URL", "https://legacy.example.com");
    expect(getSiteUrl()).toBe("https://legacy.example.com");
  });

  it("falls back to localhost when neither is set", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_URL", "");
    expect(getSiteUrl()).toBe("http://localhost:3000");
  });

  it("strips trailing slashes", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://app.example.com///");
    expect(getSiteUrl()).toBe("https://app.example.com");
  });
});
