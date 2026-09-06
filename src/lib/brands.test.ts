import { describe, expect, it } from "vitest";
import { BRANDS } from "./brands";

describe("BRANDS registry", () => {
  it("has a non-empty set of brands", () => {
    expect(Object.keys(BRANDS).length).toBeGreaterThan(0);
  });

  it("defines a title and a non-trivial single path for every brand", () => {
    for (const [slug, brand] of Object.entries(BRANDS)) {
      expect(brand.title.length, slug).toBeGreaterThan(0);
      // Vendored marks are multi-command path data; anything shorter than
      // this is almost certainly a copy/paste mistake.
      expect(brand.path.length, slug).toBeGreaterThan(20);
    }
  });

  it("uses valid #RRGGBB hex colors", () => {
    for (const [slug, brand] of Object.entries(BRANDS)) {
      expect(brand.hex, slug).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });

  it("has unique brand titles", () => {
    const titles = Object.values(BRANDS).map((b) => b.title.toLowerCase());
    expect(new Set(titles).size).toBe(titles.length);
  });
});
