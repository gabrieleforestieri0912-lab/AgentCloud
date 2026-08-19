import { describe, expect, it } from "vitest";
import { isSafeRedirectPath } from "./safe-redirect-path";

describe("isSafeRedirectPath", () => {
  it("accepts same-origin relative paths", () => {
    expect(isSafeRedirectPath("/dashboard")).toBe(true);
    expect(isSafeRedirectPath("/reset-password")).toBe(true);
    expect(isSafeRedirectPath("/a/some-agent")).toBe(true);
    expect(isSafeRedirectPath("/agents")).toBe(true);
  });

  it("rejects absolute and protocol-relative URLs", () => {
    expect(isSafeRedirectPath("https://evil.com")).toBe(false);
    expect(isSafeRedirectPath("//evil.com")).toBe(false);
    expect(isSafeRedirectPath("http://evil.com")).toBe(false);
  });

  it("rejects backslash tricks and path traversal", () => {
    expect(isSafeRedirectPath("/\\evil.com")).toBe(false);
    expect(isSafeRedirectPath("/../evil")).toBe(false);
    expect(isSafeRedirectPath("/a/../../evil")).toBe(false);
  });

  it("rejects empty or non-path values", () => {
    expect(isSafeRedirectPath(null)).toBe(false);
    expect(isSafeRedirectPath("")).toBe(false);
    expect(isSafeRedirectPath("dashboard")).toBe(false);
  });
});
