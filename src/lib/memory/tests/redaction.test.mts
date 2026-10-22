import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  containsSecret,
  detectSecrets,
  findCardNumbers,
  isLuhnValid,
  redactSecrets,
} from "@/lib/memory/redaction";

describe("secret filter", () => {
  it("does not flag ordinary conversation", () => {
    const text =
      "Preferisco essere contattato il pomeriggio, il mio store si chiama Acme e vendo 120 fusti.";
    assert.equal(containsSecret(text), false);
  });

  it("detects the common credential formats", () => {
    const cases: [string, string][] = [
      ["la mia chiave è sk-abcdefghijklmnopqrstuvwx", "api key"],
      ["token ghp_abcdefghijklmnopqrstuvwxyz012345", "github token"],
      ["xoxb-123456789012-abcdefghij", "slack token"],
      ["AKIAIOSFODNN7EXAMPLE", "aws access key"],
      ["Bearer abcdefghijklmnopqrstuvwxyz0123456789", "bearer token"],
      ["-----BEGIN RSA PRIVATE KEY-----", "private key"],
      ["la password: superSegreta1", "password assignment"],
    ];
    for (const [text, label] of cases) {
      const labels = detectSecrets(text).map((secret) => secret.label);
      assert.ok(labels.includes(label), `expected ${label} in ${text} -> ${labels.join(",")}`);
    }
  });

  it("detects a jwt", () => {
    const jwt =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dBjftJeZ4CVPmB92K27uhbUJU1p1r_wW1gFWFOEjXk";
    assert.ok(detectSecrets(jwt).some((secret) => secret.label === "jwt"));
  });

  it("distinguishes a card number from a plain number", () => {
    assert.equal(isLuhnValid("4111111111111111"), true);
    assert.equal(isLuhnValid("4111111111111112"), false);
    assert.deepEqual(findCardNumbers("la carta 4111 1111 1111 1111 scade a breve"), [
      "4111 1111 1111 1111",
    ]);
    assert.deepEqual(findCardNumbers("fattura numero 2026010112345678"), []);
  });

  it("redacts the secrets and keeps the rest", () => {
    const { text, labels } = redactSecrets(
      "la mia API key è sk-abcdefghijklmnopqrstuvwx e preferisco il pomeriggio",
    );
    assert.equal(text.includes("sk-abcdefghijklmnopqrstuvwx"), false);
    assert.match(text, /preferisco il pomeriggio/);
    assert.ok(labels.includes("api key"));
  });

  it("redacts a card number", () => {
    const { text } = redactSecrets("la carta è 4111111111111111");
    assert.equal(text.includes("4111111111111111"), false);
  });
});
